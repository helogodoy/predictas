import { Router, Request, Response } from "express";
import { pool } from "../db.js"; // ou "../db" se seu tsconfig resolve a extensão
const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const [rows] = await pool.query("SELECT * FROM empresas ORDER BY id DESC");
  res.json(rows);
});

export default router;
