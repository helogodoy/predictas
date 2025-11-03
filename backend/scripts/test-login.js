import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const email = "predictas@email.com";
const senha = "12345678";

const main = async () => {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  const [rows] = await conn.query("SELECT * FROM usuarios WHERE email = ?", [email]);
  if (!rows.length) {
    console.log("❌ Usuário não encontrado");
  } else {
    const ok = await bcrypt.compare(senha, rows[0].senha_hash);
    console.log(ok ? "✅ Login autorizado!" : "❌ Senha incorreta!");
  }
  await conn.end();
};

main().catch(e => { console.error(e.message); process.exit(1); });
