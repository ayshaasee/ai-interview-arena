import jwt from 'jsonwebtoken';

// This runs BEFORE any protected route handler.
// Flow: client sends "Authorization: Bearer <token>" header on every
// request → we verify the token's signature (proves it was issued by
// US and hasn't been tampered with) → attach the decoded user info to
// req.user so route handlers know who's calling.
//
// IMPORTANT: JWTs are NOT encrypted, only signed. Anyone can read the
// payload (try pasting a token into jwt.io) — never put passwords or
// secrets inside one. We only put { userId, username } in ours.
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization; // "Bearer eyJhbGci..."

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, username }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}