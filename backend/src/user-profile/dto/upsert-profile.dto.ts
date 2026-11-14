import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ContractType,
  ExperienceLevel,
  OfferLanguage,
  WorkMode,
} from '../../generated/prisma/enums';

export class ProfileSkillDto {
  /** Slug du référentiel de compétences ("angular", "nestjs"…) ou libellé libre. */
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  slug!: string;

  /** Auto-évaluation de 1 (notions) à 5 (expert) : pondère le matching. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  weight = 3;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  years = 0;
}

export class UpsertProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  headline!: string;

  @IsEnum(ExperienceLevel)
  experienceLevel!: ExperienceLevel;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  yearsExperience!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  locationCity!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'locationCountry doit être un code ISO à 2 lettres' })
  locationCountry = 'FR';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  radiusKm = 30;

  /** Langues d'offres acceptées (vide = toutes). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @IsEnum(OfferLanguage, { each: true })
  languages?: OfferLanguage[];

  @IsArray()
  @ArrayMinSize(1, { message: 'Sélectionnez au moins un type de contrat' })
  @ArrayMaxSize(6)
  @IsEnum(ContractType, { each: true })
  contractTypes!: ContractType[];

  @IsArray()
  @ArrayMinSize(1, { message: 'Sélectionnez au moins un mode de travail' })
  @ArrayMaxSize(3)
  @IsEnum(WorkMode, { each: true })
  workModes!: WorkMode[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  salaryMin?: number;

  @IsOptional()
  @IsString()
  @IsIn(['EUR', 'USD', 'GBP', 'CHF', 'CAD'])
  salaryCurrency = 'EUR';

  @IsOptional()
  @IsIn(['YEAR', 'MONTH', 'DAY'])
  salaryPeriod = 'YEAR';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsBoolean()
  isPublished = true;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ProfileSkillDto)
  skills: ProfileSkillDto[] = [];
}
