import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

(async () => {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  const [info] = await conn.query("SELECT DATABASE() AS db, USER() AS user, @@hostname AS host, VERSION() AS ver");
  console.log("🔗 Conectado em:", info[0]);

  const [counts] = await conn.query(`
    SELECT
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()) AS tabelas,
      (SELECT COUNT(*) FROM empresas)     AS empresas,
      (SELECT COUNT(*) FROM dispositivos) AS dispositivos,
      (SELECT COUNT(*) FROM sensores)     AS sensores,
      (SELECT COUNT(*) FROM leituras)     AS leituras,
      (SELECT COUNT(*) FROM alertas)      AS alertas
  `);
  console.log("📊 Contagens:", counts[0]);

  await conn.end();
})().catch(e => { console.error(e.message); process.exit(1); });
