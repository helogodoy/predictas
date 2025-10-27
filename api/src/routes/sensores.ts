import { Router } from 'express';
import { pool } from '../db';

const r = Router();

r.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sensores');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar sensores' });
  }
});

export default r;
