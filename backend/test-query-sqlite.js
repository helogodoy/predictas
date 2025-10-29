#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'predictas.sqlite');

function usage(){
  console.log('Uso: node test-query-sqlite.js <email>');
}

function run(){
  const [, , email] = process.argv;
  if(!email){ usage(); process.exit(1); }

  const db = new Database(DB_FILE, { readonly: true });
  const row = db.prepare('SELECT id, nome_empresa, email FROM login WHERE email = ?').get(email);
  if(row) console.log(row);
  else console.log('Nenhum usuário encontrado com email', email);
  db.close();
}

run();
