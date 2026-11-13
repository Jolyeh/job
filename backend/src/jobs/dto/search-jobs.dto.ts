import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ContractType,
  ExperienceLevel,
  WorkMode,
} from '../../generated/prisma/enums';

export const SORT_OPTIONS = ['relevance', 'recent', 'salary'] as const;

/**
 * Normalise un filtre multivalué : accepte `?x=A&x=B` (tableau natif) ou
 * `?x=A,B` (chaîne séparée par des virgules), et ignore les valeurs vides.
 */
const toArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const normalized = raw.map((entry) => String(entry).trim()).filter(Boolean);
  return normalized.length ? normalized : undefined;
};
export type SortOption = (typeof SORT_OPTIONS)[number];

/**
 * Filtres de recherche. En GET, les booléens/tableaux arrivent en query string :
 * ils sont normalisés en amont par `ValidationPipe({ transform: true })`.
 */
export class SearchJobsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(ContractType, { each: true })
  contractType?: ContractType[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(WorkMode, { each: true })
  workMode?: WorkMode[];

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMin?: number;

  /** Score de matching minimal (0..100) lorsque le tri est `relevance`. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  /** Uniquement les offres publiées dans les N derniers jours. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  maxAgeDays?: number;

  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort: SortOption = 'relevance';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 12;

  /** Restreint l'agrégation à une source précise. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  /** Force une synchronisation des providers avant de répondre. */
  @IsOptional()
  @IsBoolean()
  refresh?: boolean;
}
