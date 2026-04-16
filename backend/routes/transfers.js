const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/schema');
const { authenticateToken, requireRole, scopeToBase } = require('../middleware/auth');

const router = express.Router();

// helper to calculate how many units are available at a base
async function getBalance(db, assetTypeId, baseId) {
  const [[r1]] = await db.execute(
    'SELECT COALESCE(SUM(quantity),0) as total FROM purchases WHERE asset_type_id=? AND base_id=?',
    [assetTypeId, baseId]
  );
  const [[r2]] = await db.execute(
    "SELECT COALESCE(SUM(quantity),0) as total FROM transfers WHERE asset_type_id=? AND from_base_id=? AND status='completed'",
    [assetTypeId, baseId]
  );
  const [[r3]] = await db.execute(
    "SELECT COALESCE(SUM(quantity),0) as total FROM transfers WHERE asset_type_id=? AND to_base_id=? AND status='completed'",
    [assetTypeId, baseId]
  );
  const [[r4]] = await db.execute(
    "SELECT COALESCE(SUM(quantity),0) as total FROM assignments WHERE asset_type_id=? AND base_id=? AND status='active'",
    [assetTypeId, baseId]
  );
  const [[r5]] = await db.execute(
    'SELECT COALESCE(SUM(quantity),0) as total FROM expenditures WHERE asset_type_id=? AND base_id=?',
    [assetTypeId, baseId]
  );

  return Number(r1.total) + Number(r3.total) - Number(r2.total) - Number(r4.total) - Number(r5.total);
}

// GET /api/transfers
router.get('/', authenticateToken, scopeToBase, async (req, res) => {
  try {
    const db = getPool();
    let q = `
      SELECT t.id, t.quantity, t.transfer_date, t.status, t.notes, t.created_at,
             at.id as asset_type_id, at.name as asset_name, at.category, at.unit,
             fb.id as from_base_id, fb.name as from_base_name,
             tb.id as to_base_id, tb.name as to_base_name,
             u.username as created_by_username
      FROM transfers t
      JOIN asset_types at ON t.asset_type_id = at.id
      JOIN bases fb ON t.from_base_id = fb.id
      JOIN bases tb ON t.to_base_id = tb.id
      JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.baseFilter) {
      q += ' AND (t.from_base_id=? OR t.to_base_id=?)';
      params.push(req.baseFilter, req.baseFilter);
    } else if (req.query.base_id) {
      q += ' AND (t.from_base_id=? OR t.to_base_id=?)';
      params.push(req.query.base_id, req.query.base_id);
    }

    if (req.query.asset_type_id) { q += ' AND t.asset_type_id=?'; params.push(req.query.asset_type_id); }
    if (req.query.from_date) { q += ' AND t.transfer_date>=?'; params.push(req.query.from_date); }
    if (req.query.to_date) { q += ' AND t.transfer_date<=?'; params.push(req.query.to_date); }
    if (req.query.status) { q += ' AND t.status=?'; params.push(req.query.status); }

    q += ' ORDER BY t.transfer_date DESC, t.created_at DESC';

    const [transfers] = await db.execute(q, params);
    res.json({ transfers });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// GET /api/transfers/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute(
      `SELECT t.id, t.quantity, t.transfer_date, t.status, t.notes, t.created_at,
              at.id as asset_type_id, at.name as asset_name, at.category, at.unit,
              fb.id as from_base_id, fb.name as from_base_name,
              tb.id as to_base_id, tb.name as to_base_name,
              u.username as created_by_username
       FROM transfers t
       JOIN asset_types at ON t.asset_type_id = at.id
       JOIN bases fb ON t.from_base_id = fb.id
       JOIN bases tb ON t.to_base_id = tb.id
       JOIN users u ON t.created_by = u.id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Transfer not found' });
    res.json({ transfer: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/transfers
router.post('/', authenticateToken, requireRole('admin', 'logistics_officer', 'base_commander'), async (req, res) => {
  const { asset_type_id, from_base_id, to_base_id, quantity, transfer_date, notes } = req.body;

  if (!asset_type_id || !from_base_id || !to_base_id || !quantity || !transfer_date) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (from_base_id === to_base_id) {
    return res.status(400).json({ error: 'Source and destination cannot be the same base' });
  }
  if (quantity <= 0) return res.status(400).json({ error: 'Quantity must be positive' });

  // commanders can only transfer from their own base
  if (req.user.role === 'base_commander' && req.user.base_id !== from_base_id) {
    return res.status(403).json({ error: 'You can only transfer from your own base' });
  }

  try {
    const db = getPool();

    const [atRows] = await db.execute('SELECT id FROM asset_types WHERE id=?', [asset_type_id]);
    if (!atRows[0]) return res.status(404).json({ error: 'Asset type not found' });

    const [fromRows] = await db.execute('SELECT id FROM bases WHERE id=?', [from_base_id]);
    if (!fromRows[0]) return res.status(404).json({ error: 'Source base not found' });

    const [toRows] = await db.execute('SELECT id FROM bases WHERE id=?', [to_base_id]);
    if (!toRows[0]) return res.status(404).json({ error: 'Destination base not found' });

    // check if there's enough stock
    const available = await getBalance(db, asset_type_id, from_base_id);
    if (available < quantity) {
      return res.status(400).json({ error: `Not enough stock. Available: ${available}, Requested: ${quantity}` });
    }

    const id = uuidv4();
    await db.execute(
      "INSERT INTO transfers (id,asset_type_id,from_base_id,to_base_id,quantity,transfer_date,status,notes,created_by) VALUES (?,?,?,?,?,?,'completed',?,?)",
      [id, asset_type_id, from_base_id, to_base_id, quantity, transfer_date, notes || null, req.user.id]
    );

    const [newRows] = await db.execute(
      `SELECT t.*, at.name as asset_name, at.unit, fb.name as from_base_name, tb.name as to_base_name
       FROM transfers t
       JOIN asset_types at ON t.asset_type_id=at.id
       JOIN bases fb ON t.from_base_id=fb.id
       JOIN bases tb ON t.to_base_id=tb.id
       WHERE t.id=?`,
      [id]
    );

    res.status(201).json({ message: 'Transfer recorded', transfer: newRows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to create transfer' });
  }
});

// DELETE /api/transfers/:id - admin only
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute('SELECT id FROM transfers WHERE id=?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Transfer not found' });
    await db.execute('DELETE FROM transfers WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;