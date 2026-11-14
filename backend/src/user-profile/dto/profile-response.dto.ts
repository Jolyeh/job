import {
  ContractType,
  ExperienceLevel,
  OfferLanguage,
  WorkMode,
} from '../../generated/prisma/enums';

export interface ProfileSkillView {
  slug: string;
  label: string;
  category: string;
  weight: number;
  years: number;
}

export interface ProfileResponseDto {
  id: string;
  headline: string;
  experienceLevel: ExperienceLevel;
  yearsExperience: number;
  locationCity: string;
  locationCountry: string;
  radiusKm: number;
  contractTypes: ContractType[];
  workModes: WorkMode[];
  languages: OfferLanguage[];
  salaryMin: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  bio: string | null;
  isPublished: boolean;
  lastSearchAt: Date | null;
  skills: ProfileSkillView[];
  updatedAt: Date;
  /** Indicateurs dérivés, calculés côté serveur. */
  completeness: number;
}
