import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'predictas.sqlite');

const db = new Database(DB_FILE, { readonly: true });
const row = db.prepare('SELECT id, nome_empresa, email, password_hash FROM login WHERE email = ? LIMIT 1').get('teste@predictas.com');
if(!row){
  console.error('Usuário não encontrado no DB');
  process.exit(1);
}
console.log('row:', row);
(async ()=>{
  const ok = await bcrypt.compare('12345678', row.password_hash);
  console.log('bcrypt.compare("12345678", storedHash) =>', ok);
  process.exit(0);
})();
