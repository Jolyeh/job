import {
  ContractType,
  ExperienceLevel,
  OfferLanguage,
  WorkMode,
} from '../../generated/prisma/enums';

/** Requête normalisée envoyée aux fournisseurs, quelles que soient leurs APIs. */
export interface ProviderQuery {
  keywords: string;
  city?: string;
  country?: string;
  contractTypes?: ContractType[];
  workModes?: WorkMode[];
  /** Langues acceptées : les providers non textuels peuvent l'ignorer. */
  languages?: OfferLanguage[];
  /** Nombre max d'offres à récupérer chez le fournisseur. */
  limit: number;
  /** Fournisseur demandé explicitement (sinon tous les providers actifs). */
  onlyProvider?: string;
}

/** Offre normalisée au format interne, prête à être persistée. */
export interface NormalizedOffer {
  externalId: string;
  source: string;
  title: string;
  company: string;
  description: string;
  city: string;
  country: string;
  contractType: ContractType;
  workMode: WorkMode;
  experienceLevel: ExperienceLevel;
  /** Langue de rédaction détectée (FR par défaut). */
  language?: OfferLanguage;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  url: string;
  applyUrl?: string | null;
  logoUrl?: string | null;
  tags: string[];
  publishedAt: Date;
  /** Compétences détectées (slug normalisé + libellé). */
  skills: Array<{ slug: string; label: string; required: boolean }>;
  rawPayload?: unknown;
}

export interface ProviderResult {
  source: string;
  offers: NormalizedOffer[];
  errors: string[];
  durationMs: number;
}

/**
 * Contrat commun à tous les fournisseurs d'offres.
 * Ajouter une source = implémenter cette interface et l'enregistrer dans le
 * JobSearchModule : le service d'agrégation les exécute en parallèle.
 */
export interface JobProvider {
  /** Identifiant technique, ex. "france-travail". */
  readonly name: string;
  /** Libellé affiché dans l'interface. */
  readonly label: string;
  /** Un provider sans credentials (ou désactivé) est ignoré silencieusement. */
  isEnabled(): boolean;
  search(query: ProviderQuery): Promise<NormalizedOffer[]>;
}
