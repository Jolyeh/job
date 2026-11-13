import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContractType, ExperienceLevel, WorkMode } from '../../generated/prisma/enums';
import { extractSkills, stripHtml } from '../scoring/skill-extractor';
import { parseSalary } from './salary/parse-salary';
import {
  JobProvider,
  NormalizedOffer,
  ProviderQuery,
} from './job-provider.interface';

/**
 * Fournisseur France Travail (ex Pôle Emploi) — API "Offres d'emploi v2".
 * OAuth2 client_credentials + recherche paginée sur `/offres/search`.
 *
 * Doc : https://francetravail.io/produits-partages/catalogue/offres-emploi
 * Sans identifiants configurés, le provider est désactivé et l'agrégateur
 * se rabat sur les autres sources.
 */
@Injectable()
export class FranceTravailProvider implements JobProvider {
  readonly name = 'france-travail';
  readonly label = 'France Travail';

  private readonly logger = new Logger(FranceTravailProvider.name);
  private readonly tokenUrl =
    'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire';
  private readonly apiUrl = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';

  private cachedToken?: { value: string; expiresAt: number };

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(
      this.config.get<string>('FRANCE_TRAVAIL_CLIENT_ID') &&
        this.config.get<string>('FRANCE_TRAVAIL_CLIENT_SECRET'),
    );
  }

  async search(query: ProviderQuery): Promise<NormalizedOffer[]> {
    const token = await this.getAccessToken();

    const params = new URLSearchParams({
      motsCles: query.keywords,
      range: `0-${Math.max(0, Math.min(query.limit, 150) - 1)}`,
    });

    if (query.city) params.set('commune', query.city.toUpperCase());
    const typeContrat = (query.contractTypes ?? [])
      .map((type) => FRANCE_TRAVAIL_CONTRACT[type])
      .filter(Boolean);
    if (typeContrat.length === 1) params.set('typeContrat', typeContrat[0]);

    const response = await fetch(`${this.apiUrl}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`France Travail a répondu ${response.status}`);
    }

    const payload = (await response.json()) as FranceTravailResponse;
    return (payload.resultats ?? []).map((raw) => this.normalize(raw));
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 30_000) {
      return this.cachedToken.value;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.getOrThrow<string>('FRANCE_TRAVAIL_CLIENT_ID'),
      client_secret: this.config.getOrThrow<string>('FRANCE_TRAVAIL_CLIENT_SECRET'),
      scope: 'api_offresdemploiv2 o2dsoffre',
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new Error(`Authentification France Travail échouée (${response.status})`);
    }

    const json = (await response.json()) as { access_token: string; expires_in: number };
    this.cachedToken = {
      value: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    this.logger.debug('Token France Travail renouvelé');
    return json.access_token;
  }

  private normalize(raw: FranceTravailOffer): NormalizedOffer {
    const description = stripHtml(raw.description ?? '');
    const requiredTags = (raw.competences ?? []).map((c) => c.libelle);

    return {
      externalId: raw.id,
      source: this.name,
      title: raw.intitule,
      company: raw.entreprise?.nom ?? 'Entreprise non communiquée',
      description: description || raw.intitule,
      city: titleCase(raw.lieuTravail?.libelle ?? raw.lieuTravail?.commune ?? 'France'),
      country: 'FR',
      contractType: mapContractType(raw.typeContrat, raw.natureContrat),
      workMode: detectWorkMode(`${raw.intitule} ${raw.description ?? ''}`),
      experienceLevel: mapExperience(raw.experienceExige, raw.experienceLibelle),
      salaryMin: parseSalary(raw.salaire?.libelle)?.min ?? null,
      salaryMax: parseSalary(raw.salaire?.libelle)?.max ?? null,
      salaryCurrency: 'EUR',
      url: raw.origineOffre?.urlOrigine ?? `https://candidat.francetravail.fr/offres/recherche/detail/${raw.id}`,
      applyUrl: raw.origineOffre?.urlOrigine ?? null,
      logoUrl: raw.entreprise?.logo ?? null,
      tags: [...new Set([...(raw.competences ?? []).map((c) => c.libelle), ...(raw.formations ?? []).map((f) => f.domaineLibelle ?? '')].filter(Boolean))].slice(0, 12),
      publishedAt: new Date(raw.dateCreation ?? Date.now()),
      skills: extractSkills(`${description} ${requiredTags.join(' ')}`, requiredTags.map(slugify)),
      rawPayload: raw,
    };
  }
}

// ---------------------------------------------------------------------------
//  Mapping API France Travail -> modèle interne
// ---------------------------------------------------------------------------

const FRANCE_TRAVAIL_CONTRACT: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  MIS: 'CDD', // mission intérimaire
  SAI: 'INTERIM',
  LIB: 'FREELANCE',
  ETT: 'INTERIM',
  FRA: 'ALTERNANCE',
  CCE: 'CDD',
  DDG: 'STAGE',
};

interface FranceTravailOffer {
  id: string;
  intitule: string;
  description?: string;
  dateCreation?: string;
  typeContrat?: string;
  natureContrat?: string;
  experienceExige?: string;
  experienceLibelle?: string;
  lieuTravail?: { libelle?: string; commune?: string; codePostal?: string };
  entreprise?: { nom?: string; logo?: string };
  salaire?: { libelle?: string };
  competences?: Array<{ libelle: string }>;
  formations?: Array<{ domaineLibelle?: string }>;
  origineOffre?: { urlOrigine?: string };
}

interface FranceTravailResponse {
  resultats?: FranceTravailOffer[];
}

function mapContractType(typeContrat?: string, natureContrat?: string): ContractType {
  const mapped = FRANCE_TRAVAIL_CONTRACT[typeContrat ?? ''];
  if (mapped) return mapped as ContractType;
  const text = `${typeContrat ?? ''} ${natureContrat ?? ''}`.toLowerCase();
  if (text.includes('alternance') || text.includes('apprentissage')) return 'ALTERNANCE';
  if (text.includes('stage')) return 'STAGE';
  if (text.includes('interim') || text.includes('intérim')) return 'INTERIM';
  if (text.includes('liberal') || text.includes('libéral')) return 'FREELANCE';
  if (text.includes('cdd')) return 'CDD';
  return 'CDI';
}

function detectWorkMode(text: string): WorkMode {
  const lower = text.toLowerCase();
  if (lower.includes('100% télétravail') || lower.includes('full remote') || lower.includes('100 % télétravail')) {
    return 'REMOTE';
  }
  if (lower.includes('télétravail') || lower.includes('remote') || lower.includes('hybride')) {
    return 'HYBRID';
  }
  return 'ONSITE';
}

function mapExperience(experienceExige?: string, libelle?: string): ExperienceLevel {
  const text = `${experienceExige ?? ''} ${libelle ?? ''}`.toLowerCase();
  if (text.includes('6 ans') || text.includes('7 ans') || text.includes('8 ans') || text.includes('10 ans')) {
    return 'LEAD';
  }
  if (text.includes('3 ans') || text.includes('4 ans') || text.includes('5 ans')) {
    return 'SENIOR';
  }
  if (text.includes('1 an') || text.includes('2 ans') || text.includes('souhait')) {
    return 'INTERMEDIATE';
  }
  if (text.includes('debutant') || text.includes('débutant')) return 'JUNIOR';
  return 'INTERMEDIATE';
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s-]/)
    .map((part) => (part.length > 2 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
    .trim();
}
