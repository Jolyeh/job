import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

/**
 * Configuration Prisma 7.
 * Depuis la v7, l'URL de connexion ne vit plus dans `schema.prisma` :
 * elle est déclarée ici (CLI : migrate, studio, db push) et injectée
 * côté runtime via un driver adapter (`@prisma/adapter-pg`).
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
