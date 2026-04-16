const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/schema');
const { authenticateToken, requireRole, scopeToBase } = require('../middleware/auth');

const router = express.Router();

// GET /api/purchases
router.get('/', authenticateToken, scopeToBase, async (req, res) => {
  try {
    const db = getPool();
    let query = `
      SELECT p.id, p.quantity, p.purchase_date, p.notes, p.created_at,
             at.id as asset_type_id, at.name as asset_name, at.category, at.unit,
             b.id as base_id, b.name as base_name,
             u.username as created_by_username
      FROM purchases p
      JOIN asset_types at ON p.asset_type_id = at.id
      JOIN bases b ON p.base_id = b.id
      JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // apply filters
    if (req.baseFilter) {
      query += ' AND p.base_id = ?';
      params.push(req.baseFilter);
    } else if (req.query.base_id) {
      query += ' AND p.base_id = ?';
      params.push(req.query.base_id);
    }

    if (req.query.asset_type_id) {
      query += ' AND p.asset_type_id = ?';
      params.push(req.query.asset_type_id);
    }
    if (req.query.from_date) {
      query += ' AND p.purchase_date >= ?';
      params.push(req.query.from_date);
    }
    if (req.query.to_date) {
      query += ' AND p.purchase_date <= ?';
      params.push(req.query.to_date);
    }

    query += ' ORDER BY p.purchase_date DESC, p.created_at DESC';

    const [purchases] = await db.execute(query, params);
    res.json({ purchases });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// GET /api/purchases/:id
router.get('/:id', authenticateToken, scopeToBase, async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute(
      `SELECT p.id, p.quantity, p.purchase_date, p.notes, p.created_at,
              at.id as asset_type_id, at.name as asset_name, at.category, at.unit,
              b.id as base_id, b.name as base_name,
              u.username as created_by_username
       FROM purchases p
       JOIN asset_types at ON p.asset_type_id = at.id
       JOIN bases b ON p.base_id = b.id
       JOIN users u ON p.created_by = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Purchase not found' });

    if (req.baseFilter && rows[0].base_id !== req.baseFilter) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ purchase: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/purchases - only admin and logistics can add purchases
router.post('/', authenticateToken, requireRole('admin', 'logistics_officer'), async (req, res) => {
  const { asset_type_id, base_id, quantity, purchase_date, notes } = req.body;

  if (!asset_type_id || !base_id || !quantity || !purchase_date) {
    return res.status(400).json({ error: 'asset_type_id, base_id, quantity and purchase_date are required' });
  }
  if (quantity <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0' });

  try {
    const db = getPool();

    const [atCheck] = await db.execute('SELECT id FROM asset_types WHERE id = ?', [asset_type_id]);
    if (!atCheck[0]) return res.status(404).json({ error: 'Asset type not found' });

    const [baseCheck] = await db.execute('SELECT id FROM bases WHERE id = ?', [base_id]);
    if (!baseCheck[0]) return res.status(404).json({ error: 'Base not found' });

    const id = uuidv4();
    await db.execute(
      'INSERT INTO purchases (id, asset_type_id, base_id, quantity, purchase_date, notes, created_by) VALUES (?,?,?,?,?,?,?)',
      [id, asset_type_id, base_id, quantity, purchase_date, notes || null, req.user.id]
    );

    const [newRows] = await db.execute(
      `SELECT p.*, at.name as asset_name, at.unit, b.name as base_name
       FROM purchases p
       JOIN asset_types at ON p.asset_type_id = at.id
       JOIN bases b ON p.base_id = b.id
       WHERE p.id = ?`,
      [id]
    );

    res.status(201).json({ message: 'Purchase recorded', purchase: newRows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to create purchase' });
  }
});

// DELETE /api/purchases/:id - admin only
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute('SELECT id FROM purchases WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Purchase not found' });

    await db.execute('DELETE FROM purchases WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;