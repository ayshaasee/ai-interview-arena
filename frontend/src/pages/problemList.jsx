import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProblemList() {
  const [problems, setProblems] = useState([]);
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(true);

  const { user, logout } = useAuth();

  // Re-fetch whenever the filters change — this is what makes the
  // company/difficulty dropdowns actually filter results server-side
  // instead of just hiding rows client-side.
  useEffect(() => {
    setLoading(true);
    const params = {};
    if (company) params.company = company;
    if (difficulty) params.difficulty = difficulty;

    api
      .get('/problems', { params })
      .then((res) => setProblems(res.data))
      .finally(() => setLoading(false));
  }, [company, difficulty]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>AI Interview Arena</h1>
        <div>
          <span>Hi, {user?.username}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </header>

      <div className="filters">
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select value={company} onChange={(e) => setCompany(e.target.value)}>
          <option value="">All companies</option>
          <option value="Google">Google</option>
          <option value="Amazon">Amazon</option>
          <option value="Meta">Meta</option>
          <option value="Microsoft">Microsoft</option>
          <option value="Bloomberg">Bloomberg</option>
        </select>
      </div>

      {loading ? (
        <p>Loading problems...</p>
      ) : (
        <ul className="problem-list">
          {problems.map((p) => (
            <li key={p.id} className="problem-card">
              <Link to={`/interview/${p.slug}`}>
                <h3>{p.title}</h3>
                <span className={`badge badge-${p.difficulty}`}>{p.difficulty}</span>
                <div className="tags">
                  {p.company_tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link to="/leaderboard">View leaderboard →</Link>
    </div>
  );
}
