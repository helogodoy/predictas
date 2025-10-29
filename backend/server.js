//backend/server.js
import express from "express";
import mysql from "mysql2";
import dotenv from "dotenv";

// carregar variáveis de ambiente o quanto antes
dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// middlewares
app.use(express.json());

// conexão MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// testa conexão
db.connect((err) => {
  if (err) {
    console.error("❌ Erro ao conectar no MySQL:", err);
  } else {
    console.log("✅ Conectado ao banco MySQL com sucesso!");
  }
});

app.get("/", (req, res) => {
  res.send("Servidor Node conectado ao MySQL 🚀");
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
