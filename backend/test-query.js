import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const emailArg = process.argv[2];
const dbName = process.env.DB_NAME || process.env.DB_DATABASE;

async function run(){
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  });

  try{
    if (!emailArg || emailArg.toUpperCase() === 'ALL'){
      console.log("Conectado ao banco — listando até 200 usuários da tabela 'login'");
      const [rows] = await conn.execute("SELECT * FROM login LIMIT 200");
      console.log("RESULT:", JSON.stringify(rows, null, 2));
    } else if (emailArg.includes('%')){
      console.log("Conectado ao banco — buscando por padrão:", emailArg);
      const [rows] = await conn.execute("SELECT * FROM login WHERE email LIKE ? LIMIT 100", [emailArg]);
      console.log("RESULT:", JSON.stringify(rows, null, 2));
    } else {
      console.log("Conectado ao banco — testando consulta para:", emailArg);
      const [rows] = await conn.execute("SELECT * FROM login WHERE email = ? LIMIT 5", [emailArg]);
      console.log("RESULT:", JSON.stringify(rows, null, 2));
    }
  }catch(err){
    console.error("Erro ao executar consulta:", err && err.message ? err.message : err);
  }finally{
    await conn.end();
  }
}

run();
