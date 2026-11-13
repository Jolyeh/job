import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApplicationStatus } from '../../generated/prisma/enums';

export class UpdateBookmarkDto {
  @IsOptional()
  @IsEnum(ApplicationStatus, { message: 'Statut de candidature invalide' })
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  nextActionAt?: string;

  /** Commentaire ajouté au journal de la candidature. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
