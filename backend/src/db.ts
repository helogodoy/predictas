// backend/src/db.ts
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// ==== Garante carregamento do .env (backend/.env), independente da ordem dos imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ==== Normaliza variáveis entre local (DB_*) e Railway (MYSQL*)
const DB_HOST = process.env.DB_HOST || process.env.MYSQLHOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
const DB_USER = process.env.DB_USER || process.env.MYSQLUSER || "";
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "";
const DB_NAME = process.env.DB_NAME || process.env.MYSQLDATABASE || "predictas";

function assertEnv() {
  const miss: string[] = [];
  if (!DB_USER) miss.push("DB_USER/MYSQLUSER");
  if (!DB_PASSWORD) miss.push("DB_PASSWORD/MYSQLPASSWORD");
  if (!DB_HOST) miss.push("DB_HOST/MYSQLHOST");
  if (!DB_NAME) miss.push("DB_NAME/MYSQLDATABASE");
  if (miss.length) {
    console.error("[DB] Variáveis ausentes:", miss.join(", "));
    throw new Error("Credenciais de banco ausentes. Verifique backend/.env");
  }
}

declare global {
  // evita recriar pool em hot-reload/dev
  // @ts-ignore
  var __PREDICTAS_DB__: mysql.Pool | undefined;
}

function createDbPool() {
  assertEnv();

  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10_000,
    // Railway e similares com proxy costumam exigir TLS
    ssl: { rejectUnauthorized: false },
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
  });

  // Ping periódico para evitar idle timeout
  setInterval(() => {
    pool.query("SELECT 1").catch(() => {});
  }, 55_000);

  // Log sanitizado (sem senha)
  console.log("[DB] Pool criado:", {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    database: DB_NAME,
  });

  return pool;
}

export const db =
  // @ts-ignore
  globalThis.__PREDICTAS_DB__ || (globalThis.__PREDICTAS_DB__ = createDbPool());
export type DB = typeof db;
