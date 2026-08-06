import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/leaderboard')
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <h1>Leaderboard</h1>
      <Link to="/problems">← Back to problems</Link>

      {loading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No completed interviews yet — be the first!</p>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Interviews</th>
              <th>Correctness</th>
              <th>Efficiency</th>
              <th>Communication</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.user_id}>
                <td>{i + 1}</td>
                <td>{row.username}</td>
                <td>{row.interviews_completed}</td>
                <td>{row.avg_correctness}</td>
                <td>{row.avg_efficiency}</td>
                <td>{row.avg_communication}</td>
                <td>{row.avg_total_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
