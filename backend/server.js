//backend/server.js
import express from "express";
import Database from 'better-sqlite3';
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

// carregar variáveis de ambiente o quanto antes
dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// middlewares
app.use(express.json());

// configurar DB SQLite local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'predictas.sqlite');

if (!DB_FILE) {
  console.error('❌ Caminho do banco SQLite inválido.');
  process.exit(1);
}

let db;
try {
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.log('✅ Conectado ao banco SQLite em', DB_FILE);
} catch (e) {
  console.error('❌ Erro ao abrir o banco SQLite:', e && e.message ? e.message : e);
  process.exit(1);
}

app.get("/", (req, res) => {
  res.send("Servidor Node conectado ao SQLite (local) 🚀");
});

// rota de login (POST /api/login)
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Preencha todos os campos" });

  try {
    const user = db.prepare('SELECT * FROM login WHERE email = ? LIMIT 1').get(email);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

    const stored = user.password_hash ?? user.password ?? null;
    if (!stored) {
      console.error('Usuário sem campo de senha definido no banco para', email);
      return res.status(500).json({ error: 'Senha não disponível no servidor' });
    }

    const isBcrypt = typeof stored === 'string' && stored.startsWith('$2');
    const match = isBcrypt ? await bcrypt.compare(password, stored) : (stored === password);
    if (!match) return res.status(401).json({ error: 'Senha incorreta' });
    return res.json({ message: 'Login realizado com sucesso!', user: { id: user.id, nome_empresa: user.nome_empresa, email: user.email } });
  } catch (err) {
    console.error('Erro ao consultar banco SQLite / comparar senha:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
});

// status geral (contadores) - retorna valores seguros mesmo que tabelas não existam
app.get('/api/status-geral', (_req, res) => {
  try {
    const rows = db.prepare('SELECT status, COUNT(*) as cnt FROM motores GROUP BY status').all();
    if (!rows || rows.length === 0) return res.json({ online: 0, offline: 0, alerta: 0 });
    let online = 0, offline = 0, alerta = 0;
    for (const row of rows) {
      const s = (row.status || '').toUpperCase();
      if (s === 'OFFLINE') offline = row.cnt;
      else if (s === 'ALERTA') alerta = row.cnt;
      else online = row.cnt;
    }
    return res.json({ online, offline, alerta });
  } catch (e) {
    return res.json({ online: 0, offline: 0, alerta: 0 });
  }
});

// últimos alertas
app.get('/api/alertas', (req, res) => {
  const limit = Number(req.query.limit) || 5;
  const sql = `SELECT id, motorId, tipo, valor, limite, ts, severidade, status FROM alertas ORDER BY ts DESC LIMIT ${limit}`;
  try {
    const rows = db.prepare(sql).all();
    return res.json(rows || []);
  } catch (e) {
    return res.json([]);
  }
});

// leituras (temperatura/vibracao) - retorna série vazia se tabela ausente
app.get('/api/leituras', (req, res) => {
  // espera motorId, tipo, janela
  // implementação simples: tentar consultar 'leituras' se existir
  const motorId = Number(req.query.motorId) || 0;
  const tipo = String(req.query.tipo || 'temperatura');
  try {
    const sql = `SELECT sensorId as sensorId, ts, valor FROM leituras WHERE tipo = ? AND sensorId = ? ORDER BY ts DESC LIMIT 100`;
    const rows = db.prepare(sql).all(tipo, motorId);
    return res.json(rows || []);
  } catch (e) {
    return res.json([]);
  }
});

// lista de motores
app.get('/api/motores', (req, res) => {
  try {
    const sql = `SELECT id, nome, localizacao, status FROM motores`;
    const rows = db.prepare(sql).all();
    return res.json(rows || []);
  } catch (e) {
    return res.json([]);
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
