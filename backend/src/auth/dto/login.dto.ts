import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Le mot de passe est requis' })
  password!: string;
}
