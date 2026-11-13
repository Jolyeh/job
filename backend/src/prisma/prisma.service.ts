import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Une seule instance PrismaClient pour tout le processus.
 *
 * Prisma 7 supprime le moteur Rust côté application : la connexion passe par un
 * driver adapter (`@prisma/adapter-pg`), ce qui donne accès au pool `pg`
 * standard et simplifie le déploiement (pas de binaire à embarquer).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('DATABASE_URL');
    super({
      adapter: new PrismaPg({
        connectionString,
        max: config.get<number>('PG_POOL_MAX', 10),
      }),
      log:
        config.get('NODE_ENV') === 'development'
          ? ['warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connexion PostgreSQL établie (driver adapter pg)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Utilisé par le healthcheck : échoue vite si la base est injoignable. */
  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    await this.$queryRawUnsafe('SELECT 1');
    return { ok: true, latencyMs: Date.now() - start };
  }
}
