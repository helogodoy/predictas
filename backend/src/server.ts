// backend/src/server.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import mysql from "mysql2/promise";

dotenv.config();

// ----------------------------
// Configuração básica
// ----------------------------
const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "predictas-secret-fallback";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});


// Pool MySQL (mysql2/promise)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

// Healthcheck
app.get("/", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "Predictas API", version: "1.0.0" });
});

// ----------------------------
// Utilitários
// ----------------------------
function plusMinutes(min: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + min);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token ausente" });
  try {
    (req as any).user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido/expirado" });
  }
}

// ----------------------------
// Login (gera JWT)
// ----------------------------
async function handleLogin(req: Request, res: Response) {
  try {
    const { email, senha } = (req.body || {}) as { email?: string; senha?: string };
    console.log("[LOGIN] email:", email, "senha_len:", senha ? String(senha).length : 0);

    if (!email || !senha) return res.status(400).json({ error: "Preencha todos os campos" });

    const [rows] = await pool.query<any[]>("SELECT * FROM usuarios WHERE email = ? LIMIT 1", [email]);
    if (!Array.isArray(rows) || rows.length === 0) return res.status(401).json({ error: "Usuário não encontrado" });

    const user = rows[0];
    const ok = await bcrypt.compare(String(senha), String(user.senha_hash || ""));
    if (!ok) return res.status(401).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "8h" });
    return res.json({ token, nome: user.nome, email: user.email });
  } catch (e) {
    console.error("[/api/login] erro:", e);
    return res.status(500).json({ error: "Erro no servidor" });
  }
}

// expõe /api/login e alias /login
app.post("/api/login", handleLogin);
app.post("/login", handleLogin);

// ----------------------------
// Esqueci / Reset de senha
// ----------------------------
app.post("/api/forgot", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Informe o e-mail" });

    const [rows] = await pool.query<any[]>("SELECT id, email FROM usuarios WHERE email = ? LIMIT 1", [email]);
    if (!Array.isArray(rows) || rows.length === 0) {
      // resposta genérica para não revelar existência
      return res.json({ message: "Se o e-mail estiver cadastrado, enviaremos um link." });
    }
    const user = rows[0];

    const token = crypto.randomBytes(24).toString("hex");
    const expires = plusMinutes(30);

    await pool.query("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?,?)", [user.id, token, expires]);

    const resetUrl = `http://localhost:5173/#/reset?token=${token}`;
    console.log("🔗 Link de reset (dev):", resetUrl);

    return res.json({ message: "Se o e-mail estiver cadastrado, enviaremos um link." });
  } catch (e) {
    console.error("[/api/forgot] erro:", e);
    return res.status(500).json({ error: "Erro ao processar reset" });
  }
});

app.post("/api/reset", async (req, res) => {
  try {
    const { token, novaSenha } = req.body || {};
    if (!token || !novaSenha) return res.status(400).json({ error: "Dados incompletos" });

    const [rows] = await pool.query<any[]>(
      `SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at
         FROM password_resets pr
        WHERE pr.token = ?
        LIMIT 1`,
      [token]
    );
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "Token inválido" });

    const pr = rows[0];
    if (pr.used_at) return res.status(400).json({ error: "Token já utilizado" });
    if (new Date(pr.expires_at).getTime() < Date.now()) return res.status(400).json({ error: "Token expirado" });

    const hash = await bcrypt.hash(String(novaSenha), 10);
    await pool.query("UPDATE usuarios SET senha_hash = ? WHERE id = ?", [hash, pr.user_id]);
    await pool.query("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [pr.id]);

    return res.json({ message: "Senha redefinida com sucesso!" });
  } catch (e) {
    console.error("[/api/reset] erro:", e);
    return res.status(500).json({ error: "Erro ao redefinir senha" });
  }
});

// ----------------------------
// Rotas protegidas (JWT)
// ----------------------------
app.get("/api/status-geral", auth, async (_req: Request, res: Response) => {
  try {
    const [[counts]] = await pool.query<any[]>(
      `SELECT
        (SELECT COUNT(*) FROM dispositivos) AS dispositivos,
        (SELECT COUNT(*) FROM sensores)     AS sensores,
        (SELECT COUNT(*) FROM leituras)     AS leituras,
        (SELECT COUNT(*) FROM alertas)      AS alertas`
    );
    return res.json(counts || { dispositivos: 0, sensores: 0, leituras: 0, alertas: 0 });
  } catch (e) {
    console.error("[/api/status-geral] erro:", e);
    return res.json({ dispositivos: 0, sensores: 0, leituras: 0, alertas: 0 });
  }
});

app.get("/api/alertas", auth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 200);
    const [rows] = await pool.query<any[]>(
      `SELECT id, leitura_id, sensor_id, tipo, nivel, mensagem, criado_em
         FROM alertas
        ORDER BY id DESC
        LIMIT ?`,
      [limit]
    );
    return res.json(rows);
  } catch (e) {
    console.error("[/api/alertas] erro:", e);
    return res.json([]);
  }
});

app.get("/api/leituras", auth, async (req: Request, res: Response) => {
  try {
    const sensorId = Number(req.query.sensorId || 0);
    const limit = Math.min(Number(req.query.limit || 60), 500);
    if (!sensorId) return res.json([]);

    const [rows] = await pool.query<any[]>(
      `SELECT momento, valor
         FROM leituras
        WHERE sensor_id = ?
        ORDER BY momento DESC
        LIMIT ?`,
      [sensorId, limit]
    );
    return res.json(rows);
  } catch (e) {
    console.error("[/api/leituras] erro:", e);
    return res.json([]);
  }
});

app.get("/api/motores", auth, async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT id, nome, localizacao, status
         FROM dispositivos
        ORDER BY id DESC
        LIMIT 500`
    );
    return res.json(rows);
  } catch (e) {
    console.error("[/api/motores] erro:", e);
    return res.json([]);
  }
});

// ----------------------------
// Start
// ----------------------------
app.listen(PORT, () => {
  console.log(`✅ Predictas API ouvindo em http://localhost:${PORT}`);
});
