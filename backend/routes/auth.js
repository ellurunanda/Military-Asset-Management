const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/schema');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const db = getPool();
    const [rows] = await db.execute(
      `SELECT u.*, b.name as base_name 
       FROM users u 
       LEFT JOIN bases b ON u.base_id = b.id 
       WHERE u.username = ?`,
      [username]
    );

    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        base_id: user.base_id,
        base_name: user.base_name
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me - get current logged in user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.role, u.base_id, b.name as base_name
       FROM users u
       LEFT JOIN bases b ON u.base_id = b.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/users - admin only
router.get('/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admins only' });
  }

  try {
    const db = getPool();
    const [users] = await db.execute(
      `SELECT u.id, u.username, u.role, u.base_id, u.created_at, b.name as base_name
       FROM users u
       LEFT JOIN bases b ON u.base_id = b.id
       ORDER BY u.created_at DESC`
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register - admin only
router.post('/register', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admins only' });
  }

  const { username, password, role, base_id } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password and role are required' });
  }

  const validRoles = ['admin', 'base_commander', 'logistics_officer'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const db = getPool();
    const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const id = uuidv4();
    const hashed = bcrypt.hashSync(password, 10);
    await db.execute(
      'INSERT INTO users (id, username, password, role, base_id) VALUES (?,?,?,?,?)',
      [id, username, hashed, role, base_id || null]
    );

    res.status(201).json({ message: 'User created', id });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;