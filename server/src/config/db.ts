import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10 s — suficiente para Supabase pooler
});

pool.on('error', (err: Error) => {
  // No matar el proceso; solo loguear para no perder el servidor ante un cliente caído
  console.error('[DB] Error en cliente inactivo del pool:', err.message);
});

/** Verifica la conexión al arrancar el servidor. Lanza si falla. */
export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ db: string }>('SELECT current_database() AS db');
    console.log(`[DB] Conectado a PostgreSQL — base: "${rows[0].db}" — host: ${process.env.DB_HOST}`);
  } finally {
    client.release();
  }
}

export default pool;
