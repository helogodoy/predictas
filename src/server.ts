// src/server.ts
import express from "express";
import cors from "cors";
import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// conexão MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  timezone: "Z", // força mysql2 a tratar DATETIME como UTC
});

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

/**
 * LOGIN (igual ao seu)
 */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Preencha todos os campos" });

  const sql = "SELECT * FROM login WHERE email = ? LIMIT 1";
  db.query(sql, [email], (err, results: any[]) => {
    if (err) {
      console.error("Erro ao consultar banco:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }
    if (!results || results.length === 0) return res.status(401).json({ error: "Usuário não encontrado" });

    const user = results[0];
    if (user.password_hash !== password) return res.status(401).json({ error: "Senha incorreta" });

    return res.json({
      message: "Login realizado com sucesso!",
      user: { id: user.id, nome_empresa: user.nome_empresa, email: user.email },
    });
  });
});

/**
 * LEITURAS
 * /api/leituras?metric=temperatura|vibracao&limit=120
 * Retorna timestamps já convertidos para America/Sao_Paulo
 */
app.get("/api/leituras", (req, res) => {
  const metric = (req.query.metric as string) || "temperatura";
  const limit = Math.min(Number(req.query.limit) || 120, 1000);

  // sua tabela Python grava: temperatura, umidade, transicoes, percent_low, recebido_em (TIMESTAMP)
  // geraremos séries a partir dela:
  const sql =
    metric === "vibracao"
      ? `
        SELECT 
          DATE_FORMAT(CONVERT_TZ(recebido_em, '+00:00','-03:00'), '%Y-%m-%dT%H:%i:%s') AS momento,
          COALESCE(percent_low, 0) AS valor
        FROM leituras
        WHERE percent_low IS NOT NULL
        ORDER BY recebido_em DESC
        LIMIT ?`
      : `
        SELECT 
          DATE_FORMAT(CONVERT_TZ(recebido_em, '+00:00','-03:00'), '%Y-%m-%dT%H:%i:%s') AS momento,
          COALESCE(temperatura, 0) AS valor
        FROM leituras
        WHERE temperatura IS NOT NULL
        ORDER BY recebido_em DESC
        LIMIT ?`;

  db.query(sql, [limit], (err, rows: any[]) => {
    if (err) {
      console.error("Erro /api/leituras:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }
    // devolve em ordem crescente
    rows.reverse();
    res.json(rows);
  });
});

/**
 * MOTORES
 * Mapeia sua tabela 'dispositivos' para o front.
 * Se não existir, retorna vazio.
 */
app.get("/api/motores", (_req, res) => {
  const sql = `SELECT id, nome, localizacao, 'online' AS status FROM dispositivos ORDER BY id ASC`;
  db.query(sql, [], (err, rows: any[]) => {
    if (err) {
      console.error("Erro /api/motores:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }
    res.json(rows || []);
  });
});

/**
 * STATUS GERAL
 * dispositivos: count(*)
 * sensores / alertas: básicos (ajuste depois com tabelas reais)
 */
app.get("/api/status-geral", (_req, res) => {
  const sqlDispositivos = `SELECT COUNT(*) AS c FROM dispositivos`;
  const sqlAlertasAbertos = `
    SELECT COUNT(*) AS c FROM (
      SELECT 
        temperatura AS valor,
        CASE 
          WHEN temperatura >= 90 THEN 'critico'
          WHEN temperatura >= 75 THEN 'alto'
          WHEN temperatura IS NULL THEN NULL
          ELSE 'normal'
        END AS nivel
      FROM leituras WHERE temperatura IS NOT NULL
    ) t
    WHERE t.nivel IN ('alto','critico')
  `;

  db.query(sqlDispositivos, [], (e1, r1: any[]) => {
    if (e1) {
      console.error(e1);
      return res.status(500).json({ error: "Erro no servidor" });
    }
    db.query(sqlAlertasAbertos, [], (e2, r2: any[]) => {
      if (e2) {
        console.error(e2);
        return res.status(500).json({ error: "Erro no servidor" });
      }
      res.json({
        dispositivos: Number(r1?.[0]?.c || 0),
        sensores: 0, // ajuste se tiver tabela sensores
        leituras: 0, // opcional computar
        alertas: Number(r2?.[0]?.c || 0),
      });
    });
  });
});

/**
 * ALERTAS
 * Gera alertas a partir de TEMPERATURA (simples).
 * Regras:
 *  - temp >= 90 → 'critico' (severidade 'alta')
 *  - temp >= 75 → 'alto'    (severidade 'media')
 *  - senão 'normal' (ignorado aqui)
 */
app.get("/api/alertas", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 200);

  const sql = `
    SELECT
      id,
      DATE_FORMAT(CONVERT_TZ(recebido_em, '+00:00','-03:00'), '%Y-%m-%dT%H:%i:%s') AS criado_em,
      'temperatura' AS tipo,
      /* Vamos usar id como sensor_id temporariamente, ajuste quando tiver tabela sensores */
      id AS sensor_id,
      temperatura AS valor,
      CASE
        WHEN temperatura >= 90 THEN 'critico'
        WHEN temperatura >= 75 THEN 'alto'
        ELSE 'normal'
      END AS nivel,
      CONCAT('valor=', temperatura, ' max=90') AS mensagem
    FROM leituras
    WHERE temperatura IS NOT NULL
    ORDER BY recebido_em DESC
    LIMIT ?`;

  db.query(sql, [limit], (err, rows: any[]) => {
    if (err) {
      console.error("Erro /api/alertas:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }
    // mantém apenas alto/critico
    const filtered = rows.filter(r => r.nivel === "alto" || r.nivel === "critico");
    res.json(filtered);
  });
});

app.listen(port, () => {
  console.log(`✅ API ouvindo em http://localhost:${port}`);
});
