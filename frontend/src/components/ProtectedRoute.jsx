import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Wraps any page that requires login. If there's no user, bounce to
// /login instead of rendering the page (and instead of letting a
// logged-out user hit protected API routes and get confusing 401s).
export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
