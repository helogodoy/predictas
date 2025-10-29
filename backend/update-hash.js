import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'predictas.sqlite');

async function run(){
  const db = new Database(DB_FILE);
  const plain = '12345678';
  const hash = await bcrypt.hash(plain, 10);
  const stmt = db.prepare('UPDATE login SET password_hash = ? WHERE email = ?');
  const info = stmt.run(hash, 'teste@predictas.com');
  console.log('Updated rows:', info.changes);
  console.log('New hash:', hash);
  db.close();
}

run();
