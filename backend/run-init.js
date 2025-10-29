import fs from 'fs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function run(){
  const sql = fs.readFileSync(new URL('./init.sql', import.meta.url), 'utf8');

  // connect without database so we can create it
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    multipleStatements: true,
  });

  try{
    console.log('Executando init.sql...');
    const [res] = await conn.query(sql);
    console.log('init.sql executado com sucesso.');
  }catch(err){
    console.error('Erro ao executar init.sql:', err && err.message ? err.message : err);
  }finally{
    await conn.end();
  }
}

run();
