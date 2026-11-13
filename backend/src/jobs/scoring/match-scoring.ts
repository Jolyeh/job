/**
 * Moteur de scoring profil ↔ offre.
 * ---------------------------------------------------------------------------
 * Fonction pure et déterministe (aucune dépendance framework/SQL) : elle est
 * donc triviale à tester unitairement et réutilisable côté frontend si besoin.
 *
 * Score final 0..100 = somme pondérée de 5 critères :
 *   1. Compétences   45 %  — recouvrement pondéré + bonus compétences requises
 *   2. Intitulé      20 %  — similarité sémantique du poste recherché
 *   3. Rémunération  15 %  — positionnement vs prétentions salariales
 *   4. Expérience    10 %  — adéquation niveau / années
 *   5. Localisation  10 %  — ville, télétravail, rayon de recherche
 *
 * Un score par critère vaut `null` quand la donnée est absente des deux côtés :
 * le poids est alors redistribué sur les critères renseignés (pas de pénalité
 * pour une offre qui ne publie pas de salaire).
 */

export interface ScoringSkill {
  /** Slug normalisé, ex. "angular", "nestjs". */
  slug: string;
  /** Libellé lisible, utilisé pour les explications. */
  label: string;
  /** Poids profil (1..5, auto-évaluation) ou poids offre (1..5). */
  weight: number;
  /** Côté offre : compétence explicitement requise. */
  required?: boolean;
}

export interface ScoringProfile {
  headline: string;
  experienceLevel: 'JUNIOR' | 'INTERMEDIATE' | 'SENIOR' | 'LEAD';
  yearsExperience: number;
  locationCity: string;
  locationCountry: string;
  radiusKm: number;
  contractTypes: string[];
  workModes: string[];
  salaryMin?: number | null;
  salaryCurrency?: string | null;
  skills: ScoringSkill[];
}

export interface ScoringOffer {
  id: string;
  title: string;
  city: string;
  country: string;
  contractType: string;
  workMode: string;
  experienceLevel: 'JUNIOR' | 'INTERMEDIATE' | 'SENIOR' | 'LEAD';
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  publishedAt: Date | string;
  skills: ScoringSkill[];
}

export interface ScoreBreakdown {
  skills: number;
  title: number;
  salary: number;
  experience: number;
  location: number;
  contract: number;
}

export interface MatchResult {
  /** Score global 0..100, arrondi. */
  score: number;
  breakdown: ScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  /** Arguments courts affichables dans l'interface. */
  reasons: string[];
  warnings: string[];
}

const DEFAULT_WEIGHTS = {
  skills: 0.4,
  title: 0.2,
  salary: 0.13,
  experience: 0.1,
  location: 0.1,
  contract: 0.07,
} as const;

/** Villes françaises et leurs voisines : approximation « rayon » sans géocodage. */
const CITY_NEIGHBOURS: Record<string, string[]> = {
  paris: ['boulogne-billancourt', 'saint-denis', 'nanterre', 'montreuil', 'ivry-sur-seine', 'levallois-perret', 'la defense', 'la défense', 'issy-les-moulineaux'],
  lyon: ['villeurbanne', 'vénissieux', 'bron', 'caluire-et-cuire'],
  marseille: ['aix-en-provence', 'vitrolles', 'aubagne'],
  toulouse: ['blagnac', 'colomiers', 'labège'],
  bordeaux: ['mérignac', 'pessac', 'talence'],
  lille: ['roubaix', 'tourcoing', 'villeneuve-d\u2019ascq', 'villeneuve-d\'ascq'],
  nantes: ['saint-herblain', 'reze', 'rezé'],
  nice: ['antibes', 'cagnes-sur-mer'],
  rennes: ['cesson-sévigné', 'cesson-sevigne'],
  strasbourg: ['schiltigheim', 'illkirch-graffenstaden'],
  montpellier: ['lattes', 'castelnau-le-lez'],
};

const LEVEL_ORDER = ['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'LEAD'] as const;

const CONTRACT_LABELS: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  STAGE: 'stage',
  ALTERNANCE: 'alternance',
  FREELANCE: 'freelance',
  INTERIM: 'intérim',
};

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const STOP_WORDS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'a', 'au', 'aux', 'pour',
  'un', 'une', 'with', 'and', 'the', 'of', 'for', 'job', 'poste', 'offre',
  'h/f', 'hf', 'f/h', 'senior', 'junior', 'confirme', 'confirmee',
]);

function tokenize(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/** Similarité par recouvrement de tokens (type Jaccard pondéré par rareté). */
export function titleSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection += 1;
      continue;
    }
    // Tolérance aux variantes : "developpeur" ↔ "developpement", "full-stack" ↔ "fullstack"
    for (const other of tokensB) {
      if (token.length >= 5 && other.length >= 5 && (token.startsWith(other.slice(0, 5)) || other.startsWith(token.slice(0, 5)))) {
        intersection += 0.6;
        break;
      }
    }
  }

  const union = tokensA.size + tokensB.size - intersection;
  return Math.max(0, Math.min(1, intersection / union));
}

function scoreSkills(
  profile: ScoringProfile,
  offer: ScoringOffer,
): { value: number | null; matched: string[]; missing: string[]; requiredMatched: number; requiredTotal: number } {
  if (profile.skills.length === 0 || offer.skills.length === 0) {
    return { value: null, matched: [], missing: [], requiredMatched: 0, requiredTotal: 0 };
  }

  const profileMap = new Map(profile.skills.map((skill) => [skill.slug, skill]));
  const required = offer.skills.filter((skill) => skill.required !== false);
  const matched: string[] = [];
  const missing: string[] = [];

  let gained = 0;
  let requiredGained = 0;
  let requiredTotal = 0;

  for (const skill of offer.skills) {
    // Le poids du besoin est le produit du poids de l'offre et de l'auto-évaluation.
    const own = profileMap.get(skill.slug);
    const isRequired = skill.required !== false;
    const offerWeight = skill.weight ?? 3;

    if (isRequired) requiredTotal += offerWeight;

    if (own) {
      const profileWeight = own.weight ?? 3;
      gained += offerWeight * profileWeight;
      if (isRequired) requiredGained += offerWeight;
      matched.push(skill.label);
    } else {
      missing.push(skill.label);
    }
  }

  const maxWeight = offer.skills.reduce(
    (sum, skill) => sum + (skill.weight ?? 3) * 5,
    0,
  );
  const coverage = maxWeight > 0 ? gained / maxWeight : 0;

  // Bonus/malus sur les compétences explicitement requises.
  const requiredRatio = requiredTotal > 0 ? requiredGained / requiredTotal : 1;
  const penalty = requiredRatio < 0.5 ? (0.5 - requiredRatio) * 0.6 : 0;

  const value = Math.max(0, Math.min(1, coverage * 1.15 - penalty));

  return {
    value,
    matched,
    missing: missing.slice(0, 6),
    requiredMatched: Math.round(requiredRatio * required.length),
    requiredTotal: required.length,
  };
}

function scoreSalary(
  profile: ScoringProfile,
  offer: ScoringOffer,
): number | null {
  const expected = profile.salaryMin ?? 0;
  const offerMin = offer.salaryMin ?? null;
  const offerMax = offer.salaryMax ?? offerMin;

  if (!expected || (!offerMin && !offerMax)) return null;

  const reference = offerMax ?? offerMin!;

  if (reference >= expected * 1.15) return 1;
  if (reference >= expected) {
    // Entre 100 % et 115 % des prétentions : satisfaction progressive.
    return 0.75 + ((reference - expected) / (expected * 0.15)) * 0.25;
  }
  if (offerMin && offerMin >= expected * 0.9) return 0.55;

  const gap = (expected - reference) / expected;
  return Math.max(0, 0.5 - gap * 2);
}

function scoreExperience(profile: ScoringProfile, offer: ScoringOffer): number {
  const profileIndex = LEVEL_ORDER.indexOf(profile.experienceLevel);
  const offerIndex = LEVEL_ORDER.indexOf(offer.experienceLevel);
  const gap = offerIndex - profileIndex;

  // Années d'expérience comme garde-fou quand le niveau est mal renseigné.
  const yearsFactor = offer.experienceLevel === 'SENIOR' && profile.yearsExperience < 3
    ? 0.15
    : offer.experienceLevel === 'LEAD' && profile.yearsExperience < 6
      ? 0.2
      : 0;

  if (gap === 0) return Math.max(0.85, 1 - yearsFactor);
  if (gap === -1) return 0.9; // Offre un cran en dessous : très accessible.
  if (gap === -2) return 0.6; // Sous-qualification perçue.
  if (gap <= -3) return 0.35;
  if (gap === 1) return Math.max(0.55, 0.75 - yearsFactor); // Légèrement au-dessus.
  return Math.max(0.2, 0.45 - yearsFactor); // Nettement au-dessus du profil.
}

function scoreLocation(profile: ScoringProfile, offer: ScoringOffer): number | null {
  if (offer.workMode === 'REMOTE') return 1;

  const profileCity = normalize(profile.locationCity);
  const offerCity = normalize(offer.city);

  if (!offerCity) return null;
  if (profileCity === offerCity) return 1;

  const neighbours = CITY_NEIGHBOURS[profileCity] ?? [];
  if (neighbours.includes(offerCity)) return 0.85;

  // Même région métropolitaine (préfixe de code postal non disponible ici) :
  // on retombe sur une tolérance liée au rayon accepté.
  if (profile.radiusKm >= 60 && offer.country === profile.locationCountry) return 0.6;
  if (offer.country !== profile.locationCountry) return 0.25;

  return 0.3;
}

function scoreContract(profile: ScoringProfile, offer: ScoringOffer): number | null {
  if (!profile.contractTypes.length) return null;
  if (profile.contractTypes.includes(offer.contractType)) return 1;
  // Un CDD accepté couvre souvent un CDI proposé et inversement.
  const compatible: Record<string, string[]> = {
    CDI: ['CDD', 'FREELANCE'],
    CDD: ['CDI', 'INTERIM'],
    FREELANCE: ['CDI'],
    INTERIM: ['CDD'],
  };
  if ((compatible[offer.contractType] ?? []).some((type) => profile.contractTypes.includes(type))) {
    return 0.5;
  }
  return 0.15;
}

function freshnessBonus(publishedAt: Date | string): number {
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return 0;
  const days = (Date.now() - published) / 86_400_000;
  if (days <= 3) return 1;
  if (days <= 7) return 0.6;
  if (days <= 21) return 0.3;
  if (days <= 45) return 0.1;
  return 0;
}

export interface ScoreOptions {
  weights?: Partial<typeof DEFAULT_WEIGHTS>;
}

export function scoreOffer(
  profile: ScoringProfile,
  offer: ScoringOffer,
  options: ScoreOptions = {},
): MatchResult {
  const weights = { ...DEFAULT_WEIGHTS, ...options.weights };
  const skillResult = scoreSkills(profile, offer);

  const raw: Record<keyof ScoreBreakdown, number | null> = {
    skills: skillResult.value,
    title: titleSimilarity(profile.headline, offer.title),
    salary: scoreSalary(profile, offer),
    experience: scoreExperience(profile, offer),
    location: scoreLocation(profile, offer),
    contract: scoreContract(profile, offer),
  };

  // Redistribution des poids des critères non renseignés.
  const available = (Object.keys(raw) as (keyof ScoreBreakdown)[]).filter(
    (key) => raw[key] !== null,
  );
  const totalWeight = available.reduce((sum, key) => sum + weights[key], 0) || 1;

  let score = 0;
  const breakdown = {} as ScoreBreakdown;
  for (const key of Object.keys(raw) as (keyof ScoreBreakdown)[]) {
    const value = raw[key];
    breakdown[key] = value === null ? 0 : Math.round(value * 100);
    if (value !== null) {
      score += value * (weights[key] / totalWeight);
    }
  }

  // Petite prime de fraîcheur (max 4 points) : une offre récente est plus actionnable.
  score = Math.min(100, score * 100 + freshnessBonus(offer.publishedAt) * 4);

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (skillResult.matched.length) {
    reasons.push(
      `${skillResult.matched.length} compétence(s) en commun : ${skillResult.matched.slice(0, 4).join(', ')}`,
    );
  }
  if (breakdown.location === 100) {
    reasons.push(offer.workMode === 'REMOTE' ? 'Poste 100 % télétravail' : `Basé à ${offer.city}`);
  }
  if (raw.salary !== null && raw.salary >= 0.75) {
    reasons.push('Rémunération alignée avec vos prétentions');
  }
  if (raw.experience !== null && raw.experience >= 0.85) {
    reasons.push('Niveau d\u2019expérience attendu compatible');
  }

  if (skillResult.missing.length && offer.skills.length) {
    warnings.push(`Compétences à renforcer : ${skillResult.missing.slice(0, 3).join(', ')}`);
  }
  if (raw.salary !== null && raw.salary < 0.5) {
    warnings.push('Rémunération en dessous de vos prétentions');
  }
  if (raw.experience !== null && raw.experience < 0.5) {
    warnings.push('Le niveau attendu est supérieur à votre profil');
  }
  if (raw.contract !== null && raw.contract < 0.5) {
    warnings.push(
      `Type de contrat non recherché (${CONTRACT_LABELS[offer.contractType] ?? offer.contractType})`,
    );
  }

  return {
    score: Math.round(score),
    breakdown,
    matchedSkills: skillResult.matched,
    missingSkills: skillResult.missing,
    reasons,
    warnings,
  };
}

/**
 * Trie un lot d'offres par score décroissant puis par date de publication.
 * Utilisé côté service avant de renvoyer la page de résultats.
 */
export function rankOffers<T extends ScoringOffer>(
  profile: ScoringProfile,
  offers: T[],
  options?: ScoreOptions,
): Array<{ offer: T; match: MatchResult }> {
  return offers
    .map((offer) => ({ offer, match: scoreOffer(profile, offer, options) }))
    .sort((a, b) => {
      if (b.match.score !== a.match.score) return b.match.score - a.match.score;
      return (
        new Date(b.offer.publishedAt).getTime() -
        new Date(a.offer.publishedAt).getTime()
      );
    });
}
