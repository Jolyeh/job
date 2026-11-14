import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JobSiteKind } from '../../generated/prisma/enums';

/** Site du catalogue, tel qu'affiché dans l'interface. */
export interface JobSiteView {
  id: string;
  slug: string;
  name: string;
  url: string;
  kind: JobSiteKind;
  country: string;
  language: 'FR' | 'EN';
  description: string | null;
  logoUrl: string | null;
  isDefault: boolean;
  position: number;
  /** L'utilisateur courant suit-il ce site ? */
  followed: boolean;
  /** Nom personnalisé et identifiant de compte, si abonné. */
  customName: string | null;
  accountLabel: string | null;
  notes: string | null;
  /** Nombre d'offres rattachées à ce site (catalogue). */
  offerCount: number;
}

/** Ajout d'un site : soit depuis le catalogue (`jobSiteId`), soit libre. */
export class CreateJobSiteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  jobSiteId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'url doit être une URL complète (https://…)' })
  @MaxLength(300)
  url?: string;

  @IsOptional()
  @IsEnum(JobSiteKind)
  kind?: JobSiteKind;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  accountLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** Mise à jour de l'abonnement (activation, identifiant, notes). */
export class UpdateUserJobSiteDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  accountLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsInt()
  position?: number;
}
