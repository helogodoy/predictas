import { Router } from 'express';
import { pool } from '../db';

const r = Router();

// Lista dispositivos (ajuste a query conforme seu schema)
r.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM dispositivos');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar dispositivos' });
  }
});

export default r;
