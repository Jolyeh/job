#!/usr/bin/env node
/**
 * Petit wrapper autour d'`embedded-postgres` utilisé par les scripts npm.
 *
 *   node scripts/postgres.mjs start     # démarre (et initialise si besoin)
 *   node scripts/postgres.mjs stop      # arrête
 *   node scripts/postgres.mjs status    # état
 */
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';
import path from 'node:path';

const action = process.argv[2] ?? 'start';

const {
  PGPORT = '55432',
  PGDATABASE = 'jobradar',
  PGUSER = 'jobradar',
  PGPASSWORD = 'jobradar',
} = process.env;

const databaseDir = process.env.PGDATA ?? path.join(process.cwd(), '.pgdata');

const pg = new EmbeddedPostgres({
  databaseDir,
  user: PGUSER,
  password: PGPASSWORD,
  port: Number(PGPORT),
  persistent: true,
  autoRehydrateSymlinks: true,
  onLog: () => {},
});

if (action === 'stop') {
  await pg.stop().catch(() => {});
  console.log('[db] arrêté');
  process.exit(0);
}

if (!fs.existsSync(path.join(databaseDir, 'PG_VERSION'))) {
  console.log(`[db] initialisation du cluster dans ${databaseDir}`);
  await pg.initialise();
}

await pg.start();
await pg.createDatabase(PGDATABASE).catch(() => undefined);

console.log(
  `[db] PostgreSQL prêt → postgresql://${PGUSER}:${PGPASSWORD}@localhost:${PGPORT}/${PGDATABASE}`,
);

if (action === 'status') {
  const client = pg.getPgClient();
  await client.connect();
  const { rows } = await client.query('select version()');
  console.log(`[db] ${rows[0].version}`);
  await client.end();
  await pg.stop();
  process.exit(0);
}

// Reste au premier plan : `npm run db:start` garde la base vivante.
// Un simple `setInterval` maintient l'event loop active ; l'arrêt du cluster
// est géré par embedded-postgres (arrêt rapide / SIGKILL) ou par `db:stop`.
setInterval(() => {}, 1 << 30);

