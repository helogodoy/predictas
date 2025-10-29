import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const main = async () => {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  const [rows] = await conn.query(`
    SELECT a.id, a.leitura_id, a.sensor_id, a.tipo, a.nivel, a.mensagem, a.criado_em
    FROM alertas a
    ORDER BY a.id DESC
    LIMIT 20
  `);

  console.table(rows);
  await conn.end();
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
