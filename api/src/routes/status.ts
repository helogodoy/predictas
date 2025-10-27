// api/src/routes/status.ts
import { Router } from 'express';
import { pool } from '../db';
const r = Router();

r.get('/', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM v_status_sensor ORDER BY dispositivo, rotulo');
  res.json(rows);
});

export default r;
