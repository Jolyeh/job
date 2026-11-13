import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBookmarkDto {
  @IsUUID('4', { message: 'Identifiant d\u2019offre invalide' })
  jobOfferId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsDateString({}, { message: 'nextActionAt doit être une date ISO' })
  nextActionAt?: string;
}
