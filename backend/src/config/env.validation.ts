import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Validation des variables d'environnement au démarrage.
 * L'application refuse de booter si la configuration est incomplète :
 * on évite ainsi les erreurs découvertes en production.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL doit être une URL PostgreSQL',
  })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16, {
    message: 'JWT_SECRET doit contenir au moins 16 caractères',
  })
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:4200';

  // --- Fournisseurs d'offres (facultatifs : le provider seed prend le relais)
  @IsString()
  @IsOptional()
  FRANCE_TRAVAIL_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  FRANCE_TRAVAIL_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  REMOTIVE_API_URL: string = 'https://remotive.com/api/remote-jobs';
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(`Configuration invalide :\n  - ${details}`);
  }

  return validated;
}
