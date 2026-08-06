-- ============================================================
-- AI Interview Arena — Database Schema
-- ============================================================
-- Design notes (read this before touching anything else):
--
-- 1. `problems.test_cases` is JSONB, not a separate table.
--    Why: test cases are always read/written as a whole unit with
--    their problem (never queried individually), so normalizing them
--    into their own table would just add join overhead for no benefit.
--    This is a deliberate exception to "always normalize" — know why.
--
-- 2. `sessions` is the heart of the app. One row = one interview attempt.
--    `transcript` (JSONB) stores the full back-and-forth with the AI as
--    an array of {role, content} objects — same shape as what you send
--    back to the Claude API. This means "replay the conversation" is
--    just "read this column," not a complex join across a messages table.
--
-- 3. We store `final_score` as three separate integer columns rather
--    than one JSON blob, because leaderboard queries need to SORT and
--    AVERAGE these values — you can't efficiently do that on JSON fields.
--    Lesson: model choice should be driven by how the data will be QUERIED.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS problems (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    slug          VARCHAR(200) UNIQUE NOT NULL,
    description   TEXT NOT NULL,
    difficulty    VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    company_tags  TEXT[] DEFAULT '{}',
    starter_code  JSONB NOT NULL,
    test_cases    JSONB NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id        INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language          VARCHAR(20) NOT NULL DEFAULT 'javascript',
    code              TEXT NOT NULL DEFAULT '',
    status            VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    transcript        JSONB NOT NULL DEFAULT '[]',
    tests_passed      INTEGER DEFAULT 0,
    tests_total       INTEGER DEFAULT 0,
    correctness_score INTEGER,
    efficiency_score  INTEGER,
    communication_score INTEGER,
    summary           TEXT,
    started_at        TIMESTAMP DEFAULT NOW(),
    completed_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_problem ON sessions(problem_id);
CREATE INDEX IF NOT EXISTS idx_problems_company_tags ON problems USING GIN(company_tags);

CREATE OR REPLACE VIEW leaderboard AS
SELECT
    u.id AS user_id,
    u.username,
    COUNT(s.id) AS interviews_completed,
    ROUND(AVG(s.correctness_score)::numeric, 1) AS avg_correctness,
    ROUND(AVG(s.efficiency_score)::numeric, 1) AS avg_efficiency,
    ROUND(AVG(s.communication_score)::numeric, 1) AS avg_communication,
    ROUND(AVG(s.correctness_score + s.efficiency_score + s.communication_score)::numeric, 1) AS avg_total_score
FROM users u
JOIN sessions s ON s.user_id = u.id AND s.status = 'completed'
GROUP BY u.id, u.username
ORDER BY avg_total_score DESC;