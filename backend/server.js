// backend/server.js (MySQL + JWT + CORS, com /login e /api/login)
import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "predictas-secret-fallback";

// middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// pool MySQL (Railway TCP Proxy público)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10
});

// healthcheck
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "Predictas API", version: "1.0.0" });
});

// handler de login reaproveitável
async function handleLogin(req, res) {
  try {
    const { email, senha } = req.body || {};
    if (!email || !senha) return res.status(400).json({ error: "Preencha todos os campos" });

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (!rows.length) return res.status(401).json({ error: "Usuário não encontrado" });

    const user = rows[0];
    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) return res.status(401).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, nome: user.nome, email: user.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro no servidor" });
  }
}

// expõe as duas rotas: com e sem /api (compatível com proxy do Vite)
app.post("/login", handleLogin);
app.post("/api/login", handleLogin);

// middleware simples de auth (para rotas protegidas)
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token ausente" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido/expirado" });
  }
}

// exemplos de rotas protegidas
app.get("/status-geral", auth, async (_req, res) => {
  try {
    const [[counts]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM dispositivos) AS dispositivos,
        (SELECT COUNT(*) FROM sensores)     AS sensores,
        (SELECT COUNT(*) FROM leituras)     AS leituras,
        (SELECT COUNT(*) FROM alertas)      AS alertas
    `);
    res.json(counts);
  } catch (e) {
    console.error(e);
    res.json({ dispositivos: 0, sensores: 0, leituras: 0, alertas: 0 });
  }
});

app.get("/alertas", auth, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 20);
    const [rows] = await pool.query(
      `SELECT id, leitura_id, sensor_id, tipo, nivel, mensagem, criado_em
       FROM alertas ORDER BY id DESC LIMIT ?`, [limit]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Predictas API ouvindo em http://localhost:${PORT}`);
});
