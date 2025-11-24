// backend/src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
// ===== ESM-friendly __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ===== .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });
// ===== App base
const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "predictas-secret-fallback";
// ===== CORS mínimo (ok p/ mesma origem e chamadas diretas)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// ===== Log simples
app.use((req, _res, next) => { console.log(`${req.method} ${req.path}`); next(); });
// ===== Pool MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST, // ex.: crossover.proxy.rlwy.net
    port: Number(process.env.DB_PORT || 3306), // ex.: 17940
    user: process.env.DB_USER, // ex.: root
    password: process.env.DB_PASSWORD, // ex.: ********
    database: process.env.DB_NAME, // ex.: railway
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000, // 10s
    // 🔴 Railway costuma exigir TLS. Em Windows, o CA pode dar atrito:
    ssl: { rejectUnauthorized: false },
});
// Teste inicial
(async () => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query("SELECT NOW() AS agora");
        console.log("✅ Conectado ao banco —", rows[0].agora);
        conn.release();
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
// ===== Login
async function handleLogin(req, res) {
    try {
        const { email, senha } = (req.body || {});
        if (!email || !senha)
            return res.status(400).json({ error: "Preencha todos os campos" });
        const [rows] = await pool.query("SELECT id, email, nome, role, senha_hash FROM usuarios WHERE email = ? LIMIT 1", [email]);
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
// ===== Reset de senha
app.post("/api/forgot", async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email)
            return res.status(400).json({ error: "Informe o e-mail" });
        const [rows] = await pool.query("SELECT id, email, nome FROM usuarios WHERE email = ? LIMIT 1", [email]);
        // Resposta idempotente
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.json({ message: "Se o e-mail estiver cadastrado, enviaremos um link." });
        }
        const user = rows[0];
        const token = crypto.randomBytes(24).toString("hex");
        const expires = new Date(Date.now() + 30 * 60 * 1000); // +30 min
        await pool.query("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?,?)", [user.id, token, expires]);
        // Em produção, gere URL do seu IP/host
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
        const [rows] = await pool.query(`SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at FROM password_resets pr WHERE pr.token = ? LIMIT 1`, [token]);
        if (!Array.isArray(rows) || rows.length === 0)
            return res.status(400).json({ error: "Token inválido" });
        const pr = rows[0];
        if (pr.used_at)
            return res.status(400).json({ error: "Token já utilizado" });
        if (new Date(pr.expires_at).getTime() < Date.now())
            return res.status(400).json({ error: "Token expirado" });
        const hash = await bcrypt.hash(String(novaSenha), 10);
        await pool.query("UPDATE usuarios SET senha_hash = ? WHERE id = ?", [hash, pr.user_id]);
        await pool.query("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [pr.id]);
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
        const [[kpi]] = await pool.query(`SELECT COUNT(*) AS leituras, AVG(temperatura) AS temperatura_media, AVG(umidade) AS umidade_media, AVG(percent_low) AS percent_low_media
         FROM dht11_sw520_leituras`);
        return res.json({
            dispositivos: 1,
            sensores: 2,
            leituras: Number(kpi?.leituras || 0),
            alertas: Number(kpi?.percent_low_media || 0) > 80 ? 1 : 0,
        });
    }
    catch (e) {
        console.error("[/api/status-geral] erro:", e);
        return res.json({ dispositivos: 0, sensores: 0, leituras: 0, alertas: 0 });
    }
});
// ===== Séries
app.get("/api/leituras", auth, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 200), 1000);
        const metric = String(req.query.metric || "temperatura").toLowerCase();
        let col = metric === "umidade" ? "umidade" : metric === "vibracao" ? "percent_low" : "temperatura";
        const [rows] = await pool.query(`SELECT recebido_em AS momento, ${col} AS valor
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
    return res.json([{ id: 1, nome: "Motor Principal", localizacao: "Linha 1", status: "ativo" }]);
});
// ===== Alertas simples
app.get("/api/alertas", auth, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 20), 200);
        const [rows] = await pool.query(`SELECT id AS leitura_id, recebido_em, temperatura, umidade, percent_low
         FROM dht11_sw520_leituras
        ORDER BY recebido_em DESC
        LIMIT ?`, [limit]);
        const mapped = rows.map((r) => {
            const temperatura = r["temperatura"];
            const umidade = r["umidade"];
            const percent_low = r["percent_low"];
            let nivel = "normal";
            if (temperatura != null && temperatura > 95)
                nivel = "critico";
            else if (temperatura != null && temperatura > 80)
                nivel = "alto";
            if (percent_low != null && percent_low > 90)
                nivel = "critico";
            else if (percent_low != null && percent_low > 75 && nivel !== "critico")
                nivel = "alto";
            return {
                id: r["leitura_id"],
                leitura_id: r["leitura_id"],
                sensor_id: 1,
                tipo: "temperatura",
                nivel,
                mensagem: `Temp=${temperatura ?? "-"} | Umid=${umidade ?? "-"} | %LOW=${percent_low ?? "-"}`,
                criado_em: r["recebido_em"],
            };
        });
        return res.json(mapped);
    }
    catch (e) {
        console.error("[/api/alertas] erro:", e);
        return res.json([]);
    }
});
// ===== Servir FRONT (build do Vite) — usa a SUA pasta backend/dist
const webroot = path.resolve(__dirname, "../dist"); // <- pelo seu print, index.html está aqui
app.use(express.static(webroot));
// SPA fallback: qualquer rota não-API devolve o index.html
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(webroot, "index.html")));
// ===== Start — bind em 0.0.0.0 p/ abrir por IP
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Predictas ouvindo em http://0.0.0.0:${PORT}  (acesse por http://SEU_IP:${PORT})`);
});
