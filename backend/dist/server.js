// backend/src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db.js";
// ===== ESM-friendly __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ===== .env (sempre da pasta backend/.env)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
// ===== App base
const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "predictas-secret-fallback";
// ===== CORS básico (libera mesma origem e chamadas diretas)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// ===== Log simples
app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});
// ===== Teste inicial de conexão
(async () => {
    try {
        const [rows] = await db.query("SELECT NOW() AS agora");
        console.log("✅ Conectado ao banco —", rows[0].agora);
    }
    catch (err) {
        console.error("❌ Falha ao conectar ao banco:", err);
    }
})();
// ===== Auth util
function auth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token)
        return res.status(401).json({ error: "Token ausente" });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    }
    catch {
        return res.status(401).json({ error: "Token inválido/expirado" });
    }
}
// ===== Healthchecks
app.get("/", (_req, res) => {
    res.json({ ok: true, service: "Predictas API", version: "1.0.0" });
});
app.get("/api/healthz", (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
});
app.get("/api/healthz/db", async (_req, res) => {
    try {
        const [[row]] = await db.query("SELECT 1 AS ok");
        res.json({ ok: row?.ok === 1 });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: "db" });
    }
});
// ===== Login
async function handleLogin(req, res) {
    try {
        const { email, senha } = (req.body || {});
        if (!email || !senha)
            return res.status(400).json({ error: "Preencha todos os campos" });
        const [rows] = await db.query("SELECT id, email, nome, role, senha_hash FROM usuarios WHERE email = ? LIMIT 1", [email]);
        if (!Array.isArray(rows) || rows.length === 0)
            return res.status(401).json({ error: "Usuário não encontrado" });
        const user = rows[0];
        const ok = await bcrypt.compare(String(senha), String(user.senha_hash || ""));
        if (!ok)
            return res.status(401).json({ error: "Senha incorreta" });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "8h" });
        return res.json({ token, nome: user.nome, email: user.email });
    }
    catch (e) {
        console.error("[/api/login] erro:", e);
        return res.status(500).json({ error: "Erro no servidor" });
    }
}
app.post("/api/login", handleLogin);
app.post("/login", handleLogin); // alias
// ===== Esqueci / Reset de senha
function plusMinutes(min) {
    const d = new Date();
    d.setMinutes(d.getMinutes() + min);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
app.post("/api/forgot", async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email)
            return res.status(400).json({ error: "Informe o e-mail" });
        const [rows] = await db.query("SELECT id, email, nome FROM usuarios WHERE email = ? LIMIT 1", [email]);
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.json({ message: "Se o e-mail estiver cadastrado, enviaremos um link." });
        }
        const user = rows[0];
        const token = crypto.randomBytes(24).toString("hex");
        const expires = plusMinutes(30);
        await db.query("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?,?)", [user.id, token, expires]);
        console.log("🔗 Link de reset:", `http://SEU_IP:3000/#/reset?token=${token}`);
        return res.json({ message: "Se o e-mail estiver cadastrado, enviaremos um link." });
    }
    catch (e) {
        console.error("[/api/forgot] erro:", e);
        return res.status(500).json({ error: "Erro ao processar reset" });
    }
});
app.post("/api/reset", async (req, res) => {
    try {
        const { token, novaSenha } = req.body || {};
        if (!token || !novaSenha)
            return res.status(400).json({ error: "Dados incompletos" });
        const [rows] = await db.query(`SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at
         FROM password_resets pr
        WHERE pr.token = ?
        LIMIT 1`, [token]);
        if (!Array.isArray(rows) || rows.length === 0)
            return res.status(400).json({ error: "Token inválido" });
        const pr = rows[0];
        if (pr.used_at)
            return res.status(400).json({ error: "Token já utilizado" });
        if (new Date(pr.expires_at).getTime() < Date.now())
            return res.status(400).json({ error: "Token expirado" });
        const hash = await bcrypt.hash(String(novaSenha), 10);
        await db.query("UPDATE usuarios SET senha_hash = ? WHERE id = ?", [hash, pr.user_id]);
        await db.query("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [pr.id]);
        return res.json({ message: "Senha redefinida com sucesso!" });
    }
    catch (e) {
        console.error("[/api/reset] erro:", e);
        return res.status(500).json({ error: "Erro ao redefinir senha" });
    }
});
// ===== KPIs
app.get("/api/status-geral", auth, async (_req, res) => {
    try {
        const [[kpi]] = await db.query(`SELECT COUNT(*) AS leituras,
              AVG(temperatura) AS temperatura_media,
              AVG(umidade) AS umidade_media,
              AVG(percent_low) AS percent_low_media
         FROM dht11_sw520_leituras`);
        return res.json({
            dispositivos: 1,
            sensores: 2,
            leituras: Number(kpi?.leituras || 0),
            alertas: Number(kpi?.percent_low_media || 0) > 80 ? 1 : 0
        });
    }
    catch (e) {
        console.error("[/api/status-geral] erro:", e);
        return res.json({ dispositivos: 0, sensores: 0, leituras: 0, alertas: 0 });
    }
});
// ===== Série temporal
app.get("/api/leituras", auth, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 200), 1000);
        const metric = String(req.query.metric || "temperatura").toLowerCase();
        let col = "temperatura";
        if (metric === "umidade")
            col = "umidade";
        else if (metric === "vibracao")
            col = "percent_low";
        const [rows] = await db.query(`SELECT recebido_em AS momento, ${col} AS valor
         FROM dht11_sw520_leituras
        WHERE ${col} IS NOT NULL
        ORDER BY recebido_em DESC
        LIMIT ?`, [limit]);
        return res.json(rows);
    }
    catch (e) {
        console.error("[/api/leituras] erro:", e);
        return res.json([]);
    }
});
// ===== Lista de motores (placeholder)
app.get("/api/motores", auth, async (_req, res) => {
    return res.json([
        { id: 1, nome: "Motor Principal", localizacao: "Linha 1", status: "ativo" }
    ]);
});
// ===== (Opcional) servir front buildado se você copiar o build para ../dist (web)
// Em runtime, __dirname === backend/dist. Então "../dist" resolve para "backend/dist".
const webroot = path.resolve(__dirname, "../dist");
app.use(express.static(webroot));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(webroot, "index.html")));
// ===== Start — bind em 0.0.0.0 p/ acesso por IP
const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Predictas API ouvindo em http://0.0.0.0:${PORT}  (acesse por http://SEU_IP:${PORT})`);
});
// ===== Graceful shutdown
function shutdown(signal) {
    console.log(`\n${signal} recebido. Encerrando...`);
    server.close(async () => {
        try {
            await db.end();
        }
        catch { }
        console.log("HTTP fechado e pool do MySQL encerrado.");
        process.exit(0);
    });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
