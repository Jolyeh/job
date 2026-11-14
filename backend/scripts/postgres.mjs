#!/usr/bin/env node
/**
 * PostgreSQL local de développement (`embedded-postgres`).
 *
 *   npm run db:start    démarre le cluster en arrière-plan (idempotent)
 *   npm run db:stop     arrête le cluster
 *   npm run db:status   affiche l'état et la version du serveur
 *   npm run db:reset    supprime les données puis réinitialise
 *
 * Trois écueils corrigés par rapport à un `await pg.start()` naïf :
 *
 *  1. **Idempotence** — si le port répond déjà, on s'arrête là. Sans ce test,
 *     `embedded-postgres` relance `initdb`/`postgres` sur un dossier occupé et
 *     rejette *sans argument* : le processus meurt avec `undefined`, sans
 *     message exploitable (c'était le « back bloqué »).
 *  2. **Démon** — le serveur est détaché (`detached: true` + `unref()`) et rend
 *     le terminal, pour pouvoir enchaîner `npm run start:dev` dans la même
 *     fenêtre. Avant, `db:start` restait au premier plan et *bloquait* le shell.
 *  3. **Erreurs lisibles** — chaque échec est traduit en message actionnable
 *     (port occupé, `postmaster.pid` périmé, binaire absent).
 *
 * Le script utilise `main()` + `return` (jamais `process.exit()`) : sortir
 * brutalement tronque stdout et déclenche le hook de sortie d'
 * `embedded-postgres`, qui tuerait le serveur qu'on vient de détacher.
 */
import EmbeddedPostgres from 'embedded-postgres';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  PGPORT = '55432',
  PGDATABASE = 'jobradar',
  PGUSER = 'jobradar',
  PGPASSWORD = 'jobradar',
} = process.env;

const port = Number(PGPORT);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptDir, '..');
const databaseDir = process.env.PGDATA ?? path.join(backendDir, '.pgdata');
const pidFile = path.join(databaseDir, 'postmaster.pid');
const logFile = path.join(databaseDir, 'postgres.log');
const connectionString = `postgresql://${PGUSER}:${PGPASSWORD}@localhost:${port}/${PGDATABASE}`;

const log = (message) => console.log(`[db] ${message}`);

/** Un serveur accepte-t-il les connexions sur le port ? */
function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const settle = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(400);
    socket.once('connect', () => settle(true));
    socket.once('timeout', () => settle(false));
    socket.once('error', () => settle(false));
  });
}

/** `postmaster.pid` pointant vers un processus mort : cause classique du crash. */
function removeStalePidFile() {
  if (!fs.existsSync(pidFile)) return;
  const [rawPid] = fs.readFileSync(pidFile, 'utf-8').split('\n');
  const pid = Number(rawPid);
  const alive = Number.isInteger(pid) && pid > 0;
  if (alive) {
    try {
      process.kill(pid, 0);
      return; // le serveur tourne encore
    } catch {
      /* processus mort */
    }
  }
  fs.rmSync(pidFile, { force: true });
  log('fichier postmaster.pid périmé supprimé');
}

function serverBinary() {
  return path.join(
    backendDir,
    'node_modules',
    '@embedded-postgres',
    `${process.platform}-${process.arch}`,
    'native',
    'bin',
    'postgres',
  );
}

/**
 * Le serveur qui écoute sur le port utilise-t-il *ce* répertoire de données ?
 *
 * `postmaster.pid` contient le PID, le chemin du PGDATA, le port… Un autre
 * cluster (autre projet, instance système) peut occuper le port : sans cette
 * vérification, `db:start` répondrait « déjà actif » et l'application se
 * connecterait silencieusement à la mauvaise base.
 */
function isOwnClusterRunning() {
  if (!fs.existsSync(pidFile)) return false;
  const lines = fs.readFileSync(pidFile, 'utf-8').split('\n');
  const pid = Number(lines[0]);
  const dataDir = lines[1]?.trim();
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (dataDir && path.resolve(dataDir) !== path.resolve(databaseDir)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Crée la base applicative si elle n'existe pas encore. */
async function ensureDatabase() {
  const { Client } = await import('pg');
  const client = new Client({
    connectionString: connectionString.replace(/\/[^/]+$/, '/postgres'),
  });
  try {
    await client.connect();
    await client.query(`CREATE DATABASE ${client.escapeIdentifier(PGDATABASE)}`);
  } catch (error) {
    // 42P04 = la base existe déjà : cas nominal au second démarrage.
    if (error?.code !== '42P04') throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

/** Attend que le serveur accepte les connexions (20 s max). */
async function waitForPort(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen()) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

/** Attend la fermeture effective du port (arrêt en cours). */
async function waitForPortClosed(timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isPortOpen())) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function startExistingCluster() {
  const binary = serverBinary();
  if (!fs.existsSync(binary)) {
    log(`binaire PostgreSQL introuvable : ${binary}`);
    log('lancez « npm install » à la racine de backend/.');
    return 1;
  }

  const out = fs.openSync(logFile, 'a');
  const child = spawn(binary, ['-D', databaseDir, '-p', String(port)], {
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();

  if (!(await waitForPort())) {
    log('échec du démarrage : le serveur n’a pas ouvert son port.');
    log(`consultez ${logFile}`);
    log('ou repartez de zéro : « npm run db:reset && npm run db:setup ».');
    return 1;
  }

  await ensureDatabase();
  log(`actif sur le port ${port} (processus ${child.pid})`);
  log(`connexion : ${connectionString}`);
  log(`journaux  : ${path.relative(process.cwd(), logFile)}`);
  return 0;
}

async function initialiseCluster() {
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: PGUSER,
    password: PGPASSWORD,
    port,
    persistent: true,
    autoRehydrateSymlinks: true,
    onLog: () => {},
  });

  log(`initialisation du cluster dans ${path.relative(process.cwd(), databaseDir)}`);
  try {
    await pg.initialise();
  } catch (error) {
    log(`initialisation impossible : ${error?.message ?? error}`);
    log('supprimez le dossier backend/.pgdata puis relancez « npm run db:start ».');
    return 1;
  }

  // `initialise()` n'a pas besoin de serveur : on démarre ensuite le cluster
  // par le chemin « démon », identique au cas d'un cluster déjà existant.
  return startExistingCluster();
}

async function main() {
  const action = process.argv[2] ?? 'start';

  if (action === 'stop') {
    if (!(await isPortOpen()) || !isOwnClusterRunning()) {
      removeStalePidFile();
      log('déjà arrêté');
      return 0;
    }
    // Le serveur est lancé en processus détaché : `EmbeddedPostgres#stop()`
    // ne le connaît pas (il ne garde la main que sur les clusters qu'il a
    // lui-même démarrés). On envoie donc SIGINT au PID de `postmaster.pid`,
    // exactement ce que fait `pg_ctl stop -m fast`, puis on attend la sortie.
    if (!fs.existsSync(pidFile)) {
      log('serveur détecté sans postmaster.pid : arrêt manuel nécessaire');
      return 1;
    }
    const pid = Number(fs.readFileSync(pidFile, 'utf-8').split('\n')[0]);
    try {
      process.kill(pid, 'SIGINT');
    } catch (error) {
      log(`impossible de signaler le processus ${pid} : ${error.code ?? error.message}`);
      return 1;
    }
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if (!(await isPortOpen())) {
        removeStalePidFile();
        log('arrêté');
        return 0;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    log('le serveur ne s’est pas arrêté dans le délai imparti');
    return 1;
  }

  if (action === 'status') {
    if (!(await isPortOpen())) {
      removeStalePidFile();
      log(`arrêté (port ${port} fermé)`);
      return 1;
    }
    if (!isOwnClusterRunning()) {
      log(`le port ${port} est occupé par un autre cluster (pas celui de backend/.pgdata)`);
      return 1;
    }
    const { Client } = await import('pg');
    const client = new Client({ connectionString });
    try {
      await client.connect();
      const { rows } = await client.query('select version()');
      log(`actif sur le port ${port} — ${rows[0].version}`);
      log(`connexion : ${connectionString}`);
      return 0;
    } catch (error) {
      log(`port ${port} occupé mais connexion impossible : ${error.message}`);
      return 1;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (action === 'reset') {
    if (await isPortOpen() && fs.existsSync(pidFile)) {
      const pid = Number(fs.readFileSync(pidFile, 'utf-8').split('\n')[0]);
      try {
        process.kill(pid, 'SIGINT');
        await waitForPortClosed();
      } catch {
        log(`serveur ${pid} non arrêté — supprimez backend/.pgdata manuellement`);
        return 1;
      }
    }
    fs.rmSync(databaseDir, { recursive: true, force: true });
    log(`données supprimées (${path.relative(process.cwd(), databaseDir)})`);
    log('relancez « npm run db:start » puis « npm run db:setup ».');
    return 0;
  }

  if (action !== 'start') {
    log(`action inconnue « ${action} » — attendu : start | stop | status | reset`);
    return 1;
  }

  // --- start ---------------------------------------------------------------
  if (isOwnClusterRunning() && (await isPortOpen())) {
    log(`déjà actif sur le port ${port}`);
    log(`connexion : ${connectionString}`);
    return 0;
  }

  removeStalePidFile();

  if (await isPortOpen()) {
    log(`le port ${port} est occupé par un autre serveur PostgreSQL.`);
    log(`arrêtez-le, ou choisissez un autre port : PGPORT=55433 npm run db:start`);
    log(`(pensez alors à mettre à jour DATABASE_URL dans backend/.env).`);
    return 1;
  }

  const initialised = fs.existsSync(path.join(databaseDir, 'PG_VERSION'));
  return initialised ? startExistingCluster() : initialiseCluster();
}

process.exitCode = await main();
