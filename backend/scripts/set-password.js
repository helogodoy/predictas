// backend/scripts/set-password.js
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

dotenv.config();

async function main() {
  const email = process.argv[2];
  const novaSenha = process.argv[3];

  if (!email || !novaSenha) {
    console.log("Uso: node ./scripts/set-password.js <email> <novaSenha>");
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const hash = await bcrypt.hash(novaSenha, 10);
    const [res] = await conn.execute(
      "UPDATE usuarios SET senha_hash = ? WHERE email = ?",
      [hash, email]
    );
    console.log("Atualizado:", (res && res.affectedRows) || 0, "linha(s)");
    console.log("✅ Senha atualizada para", email);
  } catch (e) {
    console.error("Erro ao atualizar senha:", e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
