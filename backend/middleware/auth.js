const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'military_asset_mgmt_secret_key_2024';

// check if token is valid
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token invalid or expired' });
    req.user = decoded;
    next();
  });
}

// restrict access by role
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' });
    }
    next();
  };
}

// base commanders only see their own base data
function scopeToBase(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  if (req.user.role === 'base_commander') {
    req.baseFilter = req.user.base_id;
  } else {
    req.baseFilter = null; // admin and logistics see everything
  }
  next();
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      base_id: user.base_id
    },
    SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { authenticateToken, requireRole, scopeToBase, generateToken };