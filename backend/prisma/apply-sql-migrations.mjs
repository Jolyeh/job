#!/usr/bin/env node
/**
 * Applique les migrations SQL de `prisma/migrations` avec le driver `pg`.
 *
 * Pourquoi ce script ?
 *  - `prisma migrate deploy` reste la commande de référence (CI, prod, Docker).
 *  - Ce fallback couvre les environnements où le binaire `schema-engine`
 *    (téléchargé depuis binaries.prisma.sh) est indisponible : sandboxes
 *    restreintes, runners hors-ligne, images durcies.
 *
 * Il tient le même registre `_prisma_migrations` : une base migrée par ce
 * script reste compatible avec `prisma migrate status|deploy`.
 *
 * ATTENTION : ce fichier est exécuté par `node` (pas par `tsx`), il doit donc
 * charger explicitement `.env` — sans quoi il retomberait sur l'URL par défaut
 * et migrerait une *autre* base que celle utilisée par l'API et le seed.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { Client } from 'pg';

const DEFAULT_URL = 'postgresql://jobradar:jobradar@localhost:55432/jobradar';
const connectionString = process.env.DATABASE_URL ?? DEFAULT_URL;

/** Masque le mot de passe avant affichage dans les journaux. */
const safeUrl = connectionString.replace(/:\/\/[^@]*@/, '://***@');

/**
 * Garde-fou : une entrée `_prisma_migrations` ne suffit pas à prouver que la
 * migration est réellement appliquée (base restaurée, registre importé à la
 * main, migration interrompue). On vérifie donc aussi qu'il existe au moins
 * une table applicative.
 */
async function hasApplicationTables(client) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS total FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  return rows[0].total > 0;
}

const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const client = new Client({ connectionString });

await client.connect();
console.log(`[migrate] cible : ${safeUrl}`);

await client.query(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id                  varchar(36) PRIMARY KEY,
    checksum            varchar(64) NOT NULL,
    finished_at         timestamptz,
    migration_name      varchar(255) NOT NULL,
    logs                text,
    rolled_back_at      timestamptz,
    started_at          timestamptz NOT NULL DEFAULT now(),
    applied_steps_count integer NOT NULL DEFAULT 0
  );
`);

const tablesPresent = await hasApplicationTables(client);
const applied = new Set(
  tablesPresent
    ? (
        await client.query(
          `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
        )
      ).rows.map((row) => row.migration_name)
    : [],
);

if (!tablesPresent) {
  const { rows } = await client.query('SELECT count(*)::int AS total FROM "_prisma_migrations"');
  if (rows[0].total > 0) {
    console.log(
      '[migrate] registre présent mais aucune table applicative : réapplication complète',
    );
    await client.query('TRUNCATE "_prisma_migrations"');
  }
}

const migrations = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const name of migrations) {
  const sqlPath = path.join(migrationsDir, name, 'migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const checksum = crypto.createHash('sha256').update(sql).digest('hex');

  if (applied.has(name)) {
    console.log(`[migrate] ${name} — déjà appliquée`);
    continue;
  }

  process.stdout.write(`[migrate] ${name} … `);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
       VALUES ($1, $2, now(), $3, 1)`,
      [crypto.randomUUID(), checksum, name],
    );
    await client.query('COMMIT');
    console.log('OK');
  } catch (error) {
    await client.query('ROLLBACK');
    console.log('ÉCHEC');
    throw error;
  }
}

const { rows } = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
);
console.log(`[migrate] ${rows.length} tables : ${rows.map((r) => r.tablename).join(', ')}`);

await client.end();
