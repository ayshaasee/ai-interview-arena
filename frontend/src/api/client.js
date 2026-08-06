import axios from 'axios';

// One shared axios instance for the whole app, instead of importing
// axios directly everywhere. Why this matters: we can attach the JWT
// token to every request in ONE place (the interceptor below) instead
// of remembering to add an Authorization header manually on every call.
const api = axios.create({
  baseURL: 'http://localhost:4000/api',
});

// Runs before every single request this instance makes.
// Reads the token from localStorage and attaches it as a Bearer header —
// this is what lets your backend's requireAuth middleware identify you.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend ever says 401 (token invalid/expired), automatically
// log the user out client-side rather than leaving them in a broken
// half-logged-in state where every request silently fails.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
