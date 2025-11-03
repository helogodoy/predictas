import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const email = process.argv[2];
const novaSenha = process.argv[3];
if (!email || !novaSenha) {
  console.error("Uso: node ./scripts/set-password.js <email> <senha>");
  process.exit(1);
}

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const conn = await mysql.createConnection({
  host: DB_HOST,
  port: Number(DB_PORT || 3306),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME
});
const hash = await bcrypt.hash(novaSenha, 10);
const [r] = await conn.query("UPDATE usuarios SET senha_hash=? WHERE email=?", [hash, email]);
if (r.affectedRows === 0) {
  await conn.query("INSERT INTO usuarios (nome, email, senha_hash) VALUES (?,?,?)", ["Predictas", email, hash]);
  console.log("✅ Usuário criado e senha definida.");
} else {
  console.log("✅ Senha atualizada com sucesso.");
}
await conn.end();
