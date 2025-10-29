#!/usr/bin/env node
import fs from 'fs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve script directory reliably across platforms
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'predictas.sqlite');

function removeIfExists(file){
  try{ if(fs.existsSync(file)) fs.unlinkSync(file); }catch(e){}
}

function run(){
  // Remove DB if exists so script é idempotente para desenvolvimento
  removeIfExists(DB_FILE);

  const db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const createLogin = `
  CREATE TABLE IF NOT EXISTS login (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_empresa TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );
  `;

  db.exec(createLogin);

  const insert = db.prepare('INSERT OR REPLACE INTO login (id, nome_empresa, email, password_hash) VALUES (?, ?, ?, ?)');
  // password hash bcrypt para senha 12345678
  const bcryptHash = '$2b$10$n6jXe9RZ/MTU2NYtNsDyoOeNUZ4KYV0QQrPfW3qamGmXVToQkueum';
  insert.run(1, 'Empresa Teste', 'teste@predictas.com', bcryptHash);

  db.close();
  console.log('SQLite DB criado em', DB_FILE);
}

run();
