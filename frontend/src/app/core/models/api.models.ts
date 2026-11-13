/** Contrats de données partagés avec l'API NestJS. */

export type ContractType =
  | 'CDI'
  | 'CDD'
  | 'STAGE'
  | 'ALTERNANCE'
  | 'FREELANCE'
  | 'INTERIM';

export type WorkMode = 'ONSITE' | 'HYBRID' | 'REMOTE';

export type ExperienceLevel = 'JUNIOR' | 'INTERMEDIATE' | 'SENIOR' | 'LEAD';

export type ApplicationStatus =
  | 'SAVED'
  | 'APPLIED'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface ApiEnvelope<T> {
  data: T;
  meta?: { durationMs: number };
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  tokenVersion: number;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface ProfileSkill {
  slug: string;
  label: string;
  category: string;
  weight: number;
  years: number;
}

export interface Profile {
  id: string;
  headline: string;
  experienceLevel: ExperienceLevel;
  yearsExperience: number;
  locationCity: string;
  locationCountry: string;
  radiusKm: number;
  contractTypes: ContractType[];
  workModes: WorkMode[];
  salaryMin: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  bio: string | null;
  isPublished: boolean;
  lastSearchAt: string | null;
  skills: ProfileSkill[];
  completeness: number;
  updatedAt: string;
}

/** Corps envoyé au PUT /profile (le formulaire est autoritaire). */
export interface ProfilePayload {
  headline: string;
  experienceLevel: ExperienceLevel;
  yearsExperience: number;
  locationCity: string;
  locationCountry: string;
  radiusKm: number;
  contractTypes: ContractType[];
  workModes: WorkMode[];
  salaryMin?: number;
  salaryCurrency: string;
  salaryPeriod: string;
  bio?: string;
  isPublished: boolean;
  skills: Array<{ slug: string; weight: number; years: number }>;
}

export interface MatchBreakdown {
  skills: number;
  title: number;
  salary: number;
  experience: number;
  location: number;
  contract: number;
}

export interface MatchResult {
  score: number;
  breakdown: MatchBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  warnings: string[];
}

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  description: string;
  city: string;
  country: string;
  contractType: ContractType;
  workMode: WorkMode;
  experienceLevel: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  url: string;
  applyUrl: string | null;
  logoUrl: string | null;
  tags: string[];
  publishedAt: string;
  source: string;
  skills: Array<{ slug: string; label: string; required: boolean }>;
  match: MatchResult;
}

export interface JobSearchFilters {
  q?: string;
  city?: string;
  contractType?: ContractType[];
  workMode?: WorkMode[];
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  minScore?: number;
  maxAgeDays?: number;
  sort?: 'relevance' | 'recent' | 'salary';
  page?: number;
  pageSize?: number;
  source?: string;
  refresh?: boolean;
}

export interface Facet {
  value: string;
  count: number;
}

export interface JobSearchResponse {
  items: JobOffer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    contractTypes: Facet[];
    workModes: Facet[];
    sources: Facet[];
    averageScore: number;
    topScore: number;
  };
  meta: {
    personalized: boolean;
    profileHeadline: string | null;
    sources: Array<{ source: string; fetched: number; errors: string[]; durationMs: number }>;
    aggregatedAt: string;
  };
}

export interface BookmarkEvent {
  id: string;
  status: ApplicationStatus;
  comment: string | null;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  status: ApplicationStatus;
  matchScore: number;
  notes: string | null;
  appliedAt: string | null;
  interviewAt: string | null;
  nextActionAt: string | null;
  createdAt: string;
  updatedAt: string;
  offer: {
    id: string;
    title: string;
    company: string;
    city: string;
    contractType: ContractType;
    workMode: WorkMode;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    url: string;
    publishedAt: string;
    logoUrl: string | null;
    skills: string[];
  };
  events: BookmarkEvent[];
}

export interface BookmarkStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  applied: number;
  responseRate: number;
  upcomingActions: number;
}

export interface SkillOption {
  slug: string;
  label: string;
  category: string;
  usage: number;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  database: { ok: boolean; latencyMs: number };
  catalog: { offers: number; profiles: number };
}
