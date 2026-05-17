const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'safepulse_secret_key_123';

// verifies Bearer token in Authorization header.
// Attaches req.userId for use in protected routes.
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token expired or invalid' });
  }
}

// Generate a JWT for a user. Call after OTP verification.
function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { requireAuth, signToken };
