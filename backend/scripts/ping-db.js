import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  const [rows] = await conn.query(`
    SELECT
      (SELECT COUNT(*) FROM empresas)     AS empresas,
      (SELECT COUNT(*) FROM dispositivos) AS dispositivos,
      (SELECT COUNT(*) FROM sensores)     AS sensores,
      (SELECT COUNT(*) FROM leituras)     AS leituras,
      (SELECT COUNT(*) FROM alertas)      AS alertas
  `);

  console.log(rows[0]);

  await conn.end();
}

main().catch((err) => {
  console.error("Erro ao consultar o banco:", err.message);
  process.exit(1);
});
