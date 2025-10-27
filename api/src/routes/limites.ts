import { Router } from 'express';
import { pool } from '../db';

const r = Router();

r.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM limites');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar limites' });
  }
});

export default r;
