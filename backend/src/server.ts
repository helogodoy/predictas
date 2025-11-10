// backend/src/server.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import mysql from "mysql2/promise";
import path from "path";
import type { RowDataPacket } from "mysql2";

// ✅ ESM-friendly __dirname
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Carrega .env da pasta backend com caminho absoluto
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ----------------------------
// Configuração básica
// ----------------------------
const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "predictas-secret-fallback";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// log simples
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ----------------------------
// Tipagens de linhas do banco
// ----------------------------
interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  nome: string;
  role: string | null;
  senha_hash: string;
}

interface PasswordResetRow extends RowDataPacket {
  id: number;
  user_id: number;
  expires_at: string | Date;
  used_at: string | Date | null;
}

interface SerieRow extends RowDataPacket {
  momento: Date | string;
  valor: number | null;
}

interface KpiRow extends RowDataPacket {
  leituras: number;
  temperatura_media: number | null;
  umidade_media: number | null;
  percent_low_media: number | null;
}

// ----------------------------
// Pool MySQL (Railway)
// ----------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,                 // crossover.proxy.rlwy.net
  port: Number(process.env.DB_PORT || 3306),// 17940
  user: process.env.DB_USER,                // root
  password: process.env.DB_PASSWORD,        // ****
  database: process.env.DB_NAME,            // railway
  connectionLimit: 10,
});

// Teste inicial de conexão (tipado)
(async () => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query<RowDataPacket[]>("SELECT NOW() AS agora");
    // Access seguro com RowDataPacket
    const agora = (rows[0] as RowDataPacket)["agora"];
    console.log("✅ Conectado ao banco de dados Railway —", agora);
    conn.release();
  } catch (err) {
    console.error("❌ Falha ao conectar ao banco:", err);
  }
})();

// healthcheck
app.get("/", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "Predictas API", version: "1.0.0" });
});

// ----------------------------
// Utils
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
// Login (JWT) - usa tabela `usuarios`
// ----------------------------
async function handleLogin(req: Request, res: Response) {
  try {
    const { email, senha } = (req.body || {}) as { email?: string; senha?: string };
    console.log("[LOGIN] email:", email, "senha_len:", senha ? String(senha).length : 0);

    if (!email || !senha) return res.status(400).json({ error: "Preencha todos os campos" });

    const [rows] = await pool.query<UserRow[]>(
      "SELECT id, email, nome, role, senha_hash FROM usuarios WHERE email = ? LIMIT 1",
      [email]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

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

app.post("/api/login", handleLogin);
app.post("/login", handleLogin); // alias

// ----------------------------
// Esqueci / Reset de senha - usa `password_resets`
// ----------------------------
app.post("/api/forgot", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Informe o e-mail" });

    const [rows] = await pool.query<UserRow[]>(
      "SELECT id, email, nome FROM usuarios WHERE email = ? LIMIT 1",
      [email]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.json({ message: "Se o e-mail estiver cadastrado, enviaremos um link." });
    }
    const user = rows[0];

    const token = crypto.randomBytes(24).toString("hex");
    const expires = plusMinutes(30);

    await pool.query(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?,?)",
      [user.id, token, expires]
    );

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

    const [rows] = await pool.query<PasswordResetRow[]>(
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
// Rotas protegidas (leem a TABELA REAL do Python: dht11_sw520_leituras)
// colunas: id, temperatura, umidade, transicoes, percent_low, recebido_em
// ----------------------------

// KPIs / status geral
app.get("/api/status-geral", auth, async (_req: Request, res: Response) => {
  try {
    const [[kpi]] = await pool.query<KpiRow[]>(
      `SELECT
         COUNT(*)          AS leituras,
         AVG(temperatura)  AS temperatura_media,
         AVG(umidade)      AS umidade_media,
         AVG(percent_low)  AS percent_low_media
       FROM dht11_sw520_leituras`
    );

    return res.json({
      dispositivos: 1, // placeholder
      sensores: 2,     // DHT + SW520
      leituras: Number(kpi?.leituras || 0),
      alertas: (Number(kpi?.percent_low_media || 0) > 80) ? 1 : 0,
    });
  } catch (e) {
    console.error("[/api/status-geral] erro:", e);
    return res.json({ dispositivos: 0, sensores: 0, leituras: 0, alertas: 0 });
  }
});

// série temporal: usa query param "metric": temperatura|umidade|vibracao
// vibracao = percent_low (ou troque para transicoes)
app.get("/api/leituras", auth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit || 200), 1000);
    const metric = String(req.query.metric || "temperatura").toLowerCase();

    let col = "temperatura";
    if (metric === "umidade") col = "umidade";
    else if (metric === "vibracao") col = "percent_low"; // ou "transicoes"

    const [rows] = await pool.query<SerieRow[]>(
      `SELECT recebido_em AS momento, ${col} AS valor
         FROM dht11_sw520_leituras
        WHERE ${col} IS NOT NULL
        ORDER BY recebido_em DESC
        LIMIT ?`,
      [limit]
    );
    return res.json(rows);
  } catch (e) {
    console.error("[/api/leituras] erro:", e);
    return res.json([]);
  }
});

// lista de "motores" (placeholder para não quebrar o front)
app.get("/api/motores", auth, async (_req: Request, res: Response) => {
  return res.json([
    { id: 1, nome: "Motor Principal", localizacao: "Linha 1", status: "ativo" }
  ]);
});

// "Alertas" gerados a partir de regras simples sobre as leituras recentes
app.get("/api/alertas", auth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 200);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id AS leitura_id, recebido_em, temperatura, umidade, percent_low
         FROM dht11_sw520_leituras
        ORDER BY recebido_em DESC
        LIMIT ?`,
      [limit]
    );

    const mapped = rows.map((r) => {
      const temperatura = r["temperatura"] as number | null;
      const umidade = r["umidade"] as number | null;
      const percent_low = r["percent_low"] as number | null;

      let nivel: "baixo" | "normal" | "alto" | "critico" = "normal";
      if (temperatura != null && temperatura > 95) nivel = "critico";
      else if (temperatura != null && temperatura > 80) nivel = "alto";

      if (percent_low != null && percent_low > 90) nivel = "critico";
      else if (percent_low != null && percent_low > 75 && nivel !== "critico") nivel = "alto";

      return {
        id: r["leitura_id"] as number,
        leitura_id: r["leitura_id"] as number,
        sensor_id: 1,
        tipo: "temperatura",
        nivel,
        mensagem: `Temp=${temperatura ?? "-"} | Umid=${umidade ?? "-"} | %LOW=${percent_low ?? "-"}`,
        criado_em: r["recebido_em"],
      };
    });

    return res.json(mapped);
  } catch (e) {
    console.error("[/api/alertas] erro:", e);
    return res.json([]);
  }
});

// ----------------------------
// Start
// ----------------------------
app.listen(PORT, () => {
  console.log(`✅ Predictas API ouvindo em http://localhost:${PORT}`);
});
