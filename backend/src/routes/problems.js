import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { company, difficulty } = req.query;

  const conditions = [];
  const values = [];

  if (company) {
    values.push(company);
    conditions.push(`$${values.length} = ANY(company_tags)`);
  }
  if (difficulty) {
    values.push(difficulty);
    conditions.push(`difficulty = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT id, title, slug, difficulty, company_tags FROM problems ${whereClause} ORDER BY id`,
    values
  );

  res.json(result.rows);
});

router.get('/:slug', async (req, res) => {
  const result = await pool.query('SELECT * FROM problems WHERE slug = $1', [req.params.slug]);
  const problem = result.rows[0];

  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }

  const visibleTestCases = problem.test_cases.filter((tc) => !tc.hidden);

  res.json({ ...problem, test_cases: visibleTestCases });
});

export default router;