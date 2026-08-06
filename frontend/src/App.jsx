import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ProblemList from './pages/ProblemList.jsx';
import InterviewRoom from './pages/InterviewRoom.jsx';
import Leaderboard from './pages/Leaderboard.jsx';

export default function App() {
  return (
    // AuthProvider wraps EVERYTHING so any page can call useAuth() —
    // it needs to be above the routes, not inside a specific one.
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes: redirect to /login if not authenticated */}
          <Route
            path="/problems"
            element={
              <ProtectedRoute>
                <ProblemList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/:slug"
            element={
              <ProtectedRoute>
                <InterviewRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />

          {/* Default: send people to the problem list (which itself
              redirects to /login if they're not signed in) */}
          <Route path="/" element={<Navigate to="/problems" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
