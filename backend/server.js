//backend/server.js
import express from "express";
import Database from 'better-sqlite3';
import bcrypt from "bcryptjs";
import fs from 'fs';
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

// carregar variáveis de ambiente o quanto antes
dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// middlewares
app.use(express.json());
// usamos SQLite local (arquivo `predictas.sqlite`) para manter o DB dentro do projeto
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'predictas.sqlite');
let db = null;
try{
  if (fsExistsSync(DB_FILE)) {
    db = new Database(DB_FILE, { readonly: false });
    console.log('✅ Usando SQLite local em', DB_FILE);
  } else {
    console.log('⚠️  Arquivo de banco local não encontrado. Criando novo DB em:', DB_FILE);
    // criar banco e tabela básica de login
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    const createLogin = `
      CREATE TABLE IF NOT EXISTS login (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_empresa TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
      );
    `;
    db.exec(createLogin);
    const insert = db.prepare('INSERT OR IGNORE INTO login (id, nome_empresa, email, password_hash) VALUES (?, ?, ?, ?)');
    const bcryptHash = '$2b$10$n6jXe9RZ/MTU2NYtNsDyoOeNUZ4KYV0QQrPfW3qamGmXVToQkueum';
    insert.run(1, 'Empresa Teste', 'teste@predictas.com', bcryptHash);
    console.log('✅ Banco criado e usuário de teste inserido.');
  }
}catch(e){
  console.error('Erro ao abrir/criar banco SQLite:', e && e.message ? e.message : e);
}

function fsExistsSync(p){
  try{ return require('fs').existsSync(p); }catch(e){ return false; }
}

app.get("/", (req, res) => {
  res.send("Servidor Node (SQLite) pronto — verifique /api/login para autenticação.");
});

// rota de login (POST /api/login)
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Preencha todos os campos" });

  if(!db) return res.status(500).json({ error: 'Banco local não inicializado. Rode node run-init-sqlite.js' });
  try{
    const stmt = db.prepare('SELECT * FROM login WHERE email = ? LIMIT 1');
    const user = stmt.get(email);
    if(!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    // se a senha estiver hasheada (bcrypt, normalmente começa com $2), use bcrypt.compare
  const stored = user.password_hash ?? user.password ?? null;
    if (!stored) {
      console.error('Usuário sem campo de senha definido no banco para', email);
      return res.status(500).json({ error: 'Senha não disponível no servidor' });
    }

    const isBcrypt = typeof stored === 'string' && stored.startsWith('$2');
    (async () => {
      try {
        const match = isBcrypt ? await bcrypt.compare(password, stored) : (stored === password);
        if (!match) return res.status(401).json({ error: 'Senha incorreta' });
        return res.json({ message: 'Login realizado com sucesso!', user: { id: user.id, nome_empresa: user.nome_empresa, email: user.email } });
      } catch (e) {
        console.error('Erro ao comparar senha:', e);
        return res.status(500).json({ error: 'Erro no servidor' });
      }
    })();
  }catch(err){
    console.error('Erro ao consultar banco SQLite:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
});

// status geral (contadores) - retorna valores seguros mesmo que tabelas não existam
app.get('/api/status-geral', (_req, res) => {
  if(!db) return res.json({ online: 0, offline: 0, alerta: 0 });
  try{
    const rows = db.prepare('SELECT status, COUNT(*) as cnt FROM motores GROUP BY status').all();
    if(!rows) return res.json({ online: 0, offline: 0, alerta: 0 });
    let online = 0, offline = 0, alerta = 0;
    for (const row of rows) {
      const s = (row.status || '').toUpperCase();
      if (s === 'OFFLINE') offline = row.cnt;
      else if (s === 'ALERTA') alerta = row.cnt;
      else online = row.cnt;
    }
    return res.json({ online, offline, alerta });
  }catch(e){
    return res.json({ online: 0, offline: 0, alerta: 0 });
  }
});

// últimos alertas
app.get('/api/alertas', (req, res) => {
  if(!db) return res.json([]);
  const limit = Number(req.query.limit) || 5;
  try{
    const sql = `SELECT id, motorId, tipo, valor, limite, ts, severidade, status FROM alertas ORDER BY ts DESC LIMIT ?`;
    const rows = db.prepare(sql).all(limit);
    return res.json(rows);
  }catch(e){
    return res.json([]);
  }
});

// leituras (temperatura/vibracao) - retorna série vazia se tabela ausente
app.get('/api/leituras', (req, res) => {
  if(!db) return res.json([]);
  const motorId = Number(req.query.motorId) || 0;
  const tipo = String(req.query.tipo || 'temperatura');
  try{
    const sql = `SELECT sensorId as sensorId, ts, valor FROM leituras WHERE tipo = ? AND sensorId = ? ORDER BY ts DESC LIMIT 100`;
    const rows = db.prepare(sql).all(tipo, motorId);
    return res.json(rows);
  }catch(e){
    return res.json([]);
  }
});

// lista de motores
app.get('/api/motores', (req, res) => {
  if(!db) return res.json([]);
  try{
    const rows = db.prepare('SELECT id, nome, localizacao, status FROM motores').all();
    return res.json(rows);
  }catch(e){
    return res.json([]);
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
