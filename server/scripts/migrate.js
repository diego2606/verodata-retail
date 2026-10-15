#!/usr/bin/env node
/*
 * Runner de migraciones de VeroData Retail.
 *
 * Aplica los archivos `.sql` de `database/migrations/` que aún no estén
 * registrados en la tabla de control `schema_migrations`, en orden numérico y
 * cada uno dentro de su propia transacción (atomicidad por migración).
 *
 * Uso:
 *   node scripts/migrate.js              # aplica las pendientes
 *   node scripts/migrate.js --status     # lista aplicadas y pendientes
 *   node scripts/migrate.js --baseline   # marca las migraciones actuales como
 *                                        # aplicadas SIN ejecutarlas (para una BD
 *                                        # que ya tiene el esquema)
 */
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'database', 'migrations');

function crearPool() {
  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
    max: 2,
  });
}

/** Ordena por el número inicial del archivo (001, 002, …); empate alfabético. */
function compararVersiones(a, b) {
  const na = Number.parseInt(a, 10);
  const nb = Number.parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, 'es');
}

function listarArchivos() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((nombre) => nombre.toLowerCase().endsWith('.sql'))
    .sort(compararVersiones);
}

async function asegurarTabla(client) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version    VARCHAR(160) PRIMARY KEY,
       applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
}

async function versionesAplicadas(client) {
  const resultado = await client.query('SELECT version FROM schema_migrations');
  return new Set(resultado.rows.map((fila) => fila.version));
}

async function comandoStatus(pool) {
  const client = await pool.connect();
  try {
    await asegurarTabla(client);
    const aplicadas = await versionesAplicadas(client);
    const archivos = listarArchivos();
    const pendientes = archivos.filter((nombre) => !aplicadas.has(nombre));

    console.log(`Migraciones: ${aplicadas.size} aplicadas, ${pendientes.length} pendientes.`);
    for (const nombre of archivos) {
      console.log(`  ${aplicadas.has(nombre) ? '[aplicada] ' : '[PENDIENTE]'} ${nombre}`);
    }
  } finally {
    client.release();
  }
}

async function comandoBaseline(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await asegurarTabla(client);
    const archivos = listarArchivos();
    for (const nombre of archivos) {
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
        [nombre]
      );
    }
    await client.query('COMMIT');
    console.log(`Baseline: ${archivos.length} migraciones marcadas como aplicadas (sin ejecutar).`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function comandoMigrar(pool) {
  const client = await pool.connect();
  try {
    await asegurarTabla(client);
    const aplicadas = await versionesAplicadas(client);
    const pendientes = listarArchivos().filter((nombre) => !aplicadas.has(nombre));

    if (pendientes.length === 0) {
      console.log('Sin migraciones pendientes.');
      return;
    }

    for (const nombre of pendientes) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, nombre), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [nombre]);
        await client.query('COMMIT');
        console.log(`  OK   ${nombre}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  FALLA ${nombre} — se revirtió (ROLLBACK):`, error.message);
        process.exitCode = 1;
        return;
      }
    }
    console.log(`${pendientes.length} migración(es) aplicada(s).`);
  } finally {
    client.release();
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const pool = crearPool();
  try {
    if (args.has('--status')) {
      await comandoStatus(pool);
    } else if (args.has('--baseline')) {
      await comandoBaseline(pool);
    } else {
      await comandoMigrar(pool);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('ERROR:', error.message);
  process.exitCode = 1;
});
