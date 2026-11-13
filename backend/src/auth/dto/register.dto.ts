import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(2, { message: 'Le nom complet est trop court' })
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(72, { message: 'Le mot de passe ne peut pas dépasser 72 caractères' })
  @Matches(/\d/, { message: 'Le mot de passe doit contenir au moins un chiffre' })
  password!: string;
}
