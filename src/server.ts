// src/server.ts
import express from "express";
import cors from "cors";
import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

// middlewares
app.use(cors());            // libera o front (http://localhost:5173)
app.use(express.json());    // permite ler JSON no body
// opcional se enviar <form>
app.use(express.urlencoded({ extended: true }));

// conexão MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
});

// testa conexão
db.connect((err) => {
  if (err) {
    console.error("❌ Erro ao conectar no MySQL:", err);
  } else {
    console.log("✅ Conectado ao MySQL!");
  }
});

app.get("/", (_req, res) => {
  res.send("Servidor Node conectado ao MySQL 🚀");
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Preencha todos os campos" });
  }

  const sql = "SELECT * FROM login WHERE email = ? LIMIT 1";
  db.query(sql, [email], (err, results: any[]) => {
    if (err) {
      console.error("Erro ao consultar banco:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }

    if (!results || results.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const user = results[0];

    // ⚠️ no seu banco o campo chama password_hash mas está em texto puro (ex.: 12345678)
    if (user.password_hash !== password) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    return res.json({
      message: "Login realizado com sucesso!",
      user: {
        id: user.id,
        nome_empresa: user.nome_empresa,
        email: user.email,
      },
    });
  });
});

app.listen(port, () => {
  console.log(`✅ API ouvindo em http://localhost:${port}`);
});
