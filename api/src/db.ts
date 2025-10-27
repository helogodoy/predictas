import 'dotenv/config';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

function resolveEnvPath(): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), '../backend/.env'),
    path.resolve(process.cwd(), 'backend/.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return undefined;
}

const envPath = resolveEnvPath();
if (envPath) {
  // load explicitly to honor chosen path precedence
  const dotenv = await import('dotenv');
  dotenv.config({ path: envPath });
}

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_DATABASE = 'predictas',
  TZ = 'Z',
} = process.env;

export const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  timezone: TZ,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export type DBPool = typeof pool;
