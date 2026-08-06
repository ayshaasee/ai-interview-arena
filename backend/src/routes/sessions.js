import express from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { runAllTestCases } from '../services/executeCodeLocal.js';
import { generateFollowUp, evaluateResponse, generateFinalReport } from '../services/aiInterviewer.js';

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const { problemId, language } = req.body;

  const result = await pool.query(
    `INSERT INTO sessions (user_id, problem_id, language)
     VALUES ($1, $2, $3) RETURNING *`,
    [req.user.userId, problemId, language]
  );

  res.status(201).json(result.rows[0]);
});

router.post('/:id/run', async (req, res) => {
  const { code, functionName } = req.body;
  const session = await getOwnedSession(req.params.id, req.user.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const problem = await getProblem(session.problem_id);

  const testResults = await runAllTestCases({
    language: session.language,
    userCode: code,
    functionName,
    testCases: problem.test_cases,
  });

  const passedCount = testResults.filter((r) => r.passed).length;

  await pool.query(
    `UPDATE sessions SET code = $1, tests_passed = $2, tests_total = $3 WHERE id = $4`,
    [code, passedCount, testResults.length, session.id]
  );

  const safeResults = testResults.map((r) => ({
    passed: r.passed,
    hidden: r.hidden,
    error: r.hidden ? (r.error ? 'Execution error' : null) : r.error,
    actual: r.hidden ? undefined : r.actual,
    expected: r.hidden ? undefined : r.expected,
  }));

  res.json({ results: safeResults, passedCount, total: testResults.length });
});

router.post('/:id/interview', async (req, res) => {
  const session = await getOwnedSession(req.params.id, req.user.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const problem = await getProblem(session.problem_id);

  const aiResponse = await generateFollowUp({
    problem,
    userCode: session.code,
    language: session.language,
    transcript: session.transcript,
  });

  const updatedTranscript = [
    ...session.transcript,
    { role: 'assistant', content: aiResponse.follow_up_question },
  ];

  await pool.query(`UPDATE sessions SET transcript = $1 WHERE id = $2`, [
    JSON.stringify(updatedTranscript),
    session.id,
  ]);

  res.json({ question: aiResponse.follow_up_question });
});

router.post('/:id/reply', async (req, res) => {
  const { reply } = req.body;
  const session = await getOwnedSession(req.params.id, req.user.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const problem = await getProblem(session.problem_id);

  const transcriptWithReply = [...session.transcript, { role: 'user', content: reply }];

  const aiResponse = await evaluateResponse({
    problem,
    transcript: session.transcript,
    candidateReply: reply,
  });

  const finalTranscript = [
    ...transcriptWithReply,
    { role: 'assistant', content: aiResponse.message },
  ];

  await pool.query(`UPDATE sessions SET transcript = $1 WHERE id = $2`, [
    JSON.stringify(finalTranscript),
    session.id,
  ]);

  res.json(aiResponse);
});

router.post('/:id/complete', async (req, res) => {
  const session = await getOwnedSession(req.params.id, req.user.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const problem = await getProblem(session.problem_id);

  const testResults = await runAllTestCases({
    language: session.language,
    userCode: session.code,
    functionName: req.body.functionName,
    testCases: problem.test_cases,
  });

  const report = await generateFinalReport({
    problem,
    userCode: session.code,
    transcript: session.transcript,
    testResults,
  });

  await pool.query(
    `UPDATE sessions
     SET status = 'completed', completed_at = NOW(),
         correctness_score = $1, efficiency_score = $2,
         communication_score = $3, summary = $4
     WHERE id = $5`,
    [report.correctness, report.efficiency, report.communication, report.summary, session.id]
  );

  res.json(report);
});

async function getOwnedSession(id, userId) {
  const result = await pool.query('SELECT * FROM sessions WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ]);
  return result.rows[0];
}

async function getProblem(id) {
  const result = await pool.query('SELECT * FROM problems WHERE id = $1', [id]);
  return result.rows[0];
}

export default router;