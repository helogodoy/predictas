// src/db.ts
import mysql from "mysql2/promise";

declare global {
  // evita recriar pool em hot-reload/dev
  // @ts-ignore
  var __PREDICTAS_DB__: mysql.Pool | undefined;
}

function createDbPool() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10_000,
    // TLS quase sempre requerido em DB gerenciado (Railway)
    ssl: { rejectUnauthorized: false },
    // Node 18+ + mysql2 v3
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000
  });

  // Ping periódico para não cair por idle timeout
  setInterval(() => {
    pool.query("SELECT 1").catch(() => {});
  }, 55_000);

  return pool;
}

export const db =
  globalThis.__PREDICTAS_DB__ || (globalThis.__PREDICTAS_DB__ = createDbPool());

export type DB = typeof db;
