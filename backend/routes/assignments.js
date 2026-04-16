const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/schema');
const { authenticateToken, requireRole, scopeToBase } = require('../middleware/auth');

const router = express.Router();

// calculate available balance for an asset at a base
async function getAvailableBalance(db, assetTypeId, baseId) {
  const [[p]] = await db.execute(
    'SELECT COALESCE(SUM(quantity),0) as v FROM purchases WHERE asset_type_id=? AND base_id=?',
    [assetTypeId, baseId]
  );
  const [[tOut]] = await db.execute(
    "SELECT COALESCE(SUM(quantity),0) as v FROM transfers WHERE asset_type_id=? AND from_base_id=? AND status='completed'",
    [assetTypeId, baseId]
  );
  const [[tIn]] = await db.execute(
    "SELECT COALESCE(SUM(quantity),0) as v FROM transfers WHERE asset_type_id=? AND to_base_id=? AND status='completed'",
    [assetTypeId, baseId]
  );
  const [[assigned]] = await db.execute(
    "SELECT COALESCE(SUM(quantity),0) as v FROM assignments WHERE asset_type_id=? AND base_id=? AND status='active'",
    [assetTypeId, baseId]
  );
  const [[expended]] = await db.execute(
    'SELECT COALESCE(SUM(quantity),0) as v FROM expenditures WHERE asset_type_id=? AND base_id=?',
    [assetTypeId, baseId]
  );

  return Number(p.v) + Number(tIn.v) - Number(tOut.v) - Number(assigned.v) - Number(expended.v);
}

// ---- ASSIGNMENTS ----

// GET /api/assignments
router.get('/', authenticateToken, scopeToBase, async (req, res) => {
  try {
    const db = getPool();
    let q = `
      SELECT a.id, a.assigned_to, a.quantity, a.assignment_date, a.return_date, a.status, a.notes, a.created_at,
             at.id as asset_type_id, at.name as asset_name, at.category, at.unit,
             b.id as base_id, b.name as base_name,
             u.username as created_by_username
      FROM assignments a
      JOIN asset_types at ON a.asset_type_id = at.id
      JOIN bases b ON a.base_id = b.id
      JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.baseFilter) { q += ' AND a.base_id=?'; params.push(req.baseFilter); }
    else if (req.query.base_id) { q += ' AND a.base_id=?'; params.push(req.query.base_id); }

    if (req.query.asset_type_id) { q += ' AND a.asset_type_id=?'; params.push(req.query.asset_type_id); }
    if (req.query.status) { q += ' AND a.status=?'; params.push(req.query.status); }
    if (req.query.from_date) { q += ' AND a.assignment_date>=?'; params.push(req.query.from_date); }
    if (req.query.to_date) { q += ' AND a.assignment_date<=?'; params.push(req.query.to_date); }

    q += ' ORDER BY a.assignment_date DESC, a.created_at DESC';

    const [assignments] = await db.execute(q, params);
    res.json({ assignments });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST /api/assignments
router.post('/', authenticateToken, requireRole('admin', 'base_commander', 'logistics_officer'), async (req, res) => {
  const { asset_type_id, base_id, assigned_to, quantity, assignment_date, notes } = req.body;

  if (!asset_type_id || !base_id || !assigned_to || !quantity || !assignment_date) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (quantity <= 0) return res.status(400).json({ error: 'Quantity must be positive' });

  if (req.user.role === 'base_commander' && req.user.base_id !== base_id) {
    return res.status(403).json({ error: 'You can only assign from your own base' });
  }

  try {
    const db = getPool();

    const [atRows] = await db.execute('SELECT id FROM asset_types WHERE id=?', [asset_type_id]);
    if (!atRows[0]) return res.status(404).json({ error: 'Asset type not found' });

    const [baseRows] = await db.execute('SELECT id FROM bases WHERE id=?', [base_id]);
    if (!baseRows[0]) return res.status(404).json({ error: 'Base not found' });

    const balance = await getAvailableBalance(db, asset_type_id, base_id);
    if (balance < quantity) {
      return res.status(400).json({ error: `Not enough stock. Available: ${balance}` });
    }

    const id = uuidv4();
    await db.execute(
      "INSERT INTO assignments (id,asset_type_id,base_id,assigned_to,quantity,assignment_date,status,notes,created_by) VALUES (?,?,?,?,?,?,'active',?,?)",
      [id, asset_type_id, base_id, assigned_to, quantity, assignment_date, notes || null, req.user.id]
    );

    const [rows] = await db.execute(
      `SELECT a.*, at.name as asset_name, at.unit, b.name as base_name
       FROM assignments a
       JOIN asset_types at ON a.asset_type_id=at.id
       JOIN bases b ON a.base_id=b.id
       WHERE a.id=?`,
      [id]
    );

    res.status(201).json({ message: 'Assignment created', assignment: rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// PATCH /api/assignments/:id/return
router.patch('/:id/return', authenticateToken, requireRole('admin', 'base_commander', 'logistics_officer'), async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM assignments WHERE id=?', [req.params.id]);
    const a = rows[0];

    if (!a) return res.status(404).json({ error: 'Assignment not found' });
    if (a.status !== 'active') return res.status(400).json({ error: 'Assignment is not active' });

    if (req.user.role === 'base_commander' && req.user.base_id !== a.base_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const returnDate = req.body.return_date || new Date().toISOString().split('T')[0];
    await db.execute(
      "UPDATE assignments SET status='returned', return_date=? WHERE id=?",
      [returnDate, req.params.id]
    );

    res.json({ message: 'Marked as returned' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- EXPENDITURES ----

// GET /api/assignments/expenditures
router.get('/expenditures', authenticateToken, scopeToBase, async (req, res) => {
  try {
    const db = getPool();
    let q = `
      SELECT e.id, e.quantity, e.expenditure_date, e.reason, e.notes, e.created_at,
             at.id as asset_type_id, at.name as asset_name, at.category, at.unit,
             b.id as base_id, b.name as base_name,
             u.username as created_by_username
      FROM expenditures e
      JOIN asset_types at ON e.asset_type_id = at.id
      JOIN bases b ON e.base_id = b.id
      JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.baseFilter) { q += ' AND e.base_id=?'; params.push(req.baseFilter); }
    else if (req.query.base_id) { q += ' AND e.base_id=?'; params.push(req.query.base_id); }

    if (req.query.asset_type_id) { q += ' AND e.asset_type_id=?'; params.push(req.query.asset_type_id); }
    if (req.query.from_date) { q += ' AND e.expenditure_date>=?'; params.push(req.query.from_date); }
    if (req.query.to_date) { q += ' AND e.expenditure_date<=?'; params.push(req.query.to_date); }

    q += ' ORDER BY e.expenditure_date DESC, e.created_at DESC';

    const [expenditures] = await db.execute(q, params);
    res.json({ expenditures });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenditures' });
  }
});

// POST /api/assignments/expenditures
router.post('/expenditures', authenticateToken, requireRole('admin', 'base_commander', 'logistics_officer'), async (req, res) => {
  const { asset_type_id, base_id, quantity, expenditure_date, reason, notes } = req.body;

  if (!asset_type_id || !base_id || !quantity || !expenditure_date || !reason) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (quantity <= 0) return res.status(400).json({ error: 'Quantity must be positive' });

  if (req.user.role === 'base_commander' && req.user.base_id !== base_id) {
    return res.status(403).json({ error: 'You can only record expenditures for your own base' });
  }

  try {
    const db = getPool();

    const [atRows] = await db.execute('SELECT id FROM asset_types WHERE id=?', [asset_type_id]);
    if (!atRows[0]) return res.status(404).json({ error: 'Asset type not found' });

    const [baseRows] = await db.execute('SELECT id FROM bases WHERE id=?', [base_id]);
    if (!baseRows[0]) return res.status(404).json({ error: 'Base not found' });

    const balance = await getAvailableBalance(db, asset_type_id, base_id);
    if (balance < quantity) {
      return res.status(400).json({ error: `Not enough stock. Available: ${balance}` });
    }

    const id = uuidv4();
    await db.execute(
      'INSERT INTO expenditures (id,asset_type_id,base_id,quantity,expenditure_date,reason,notes,created_by) VALUES (?,?,?,?,?,?,?,?)',
      [id, asset_type_id, base_id, quantity, expenditure_date, reason, notes || null, req.user.id]
    );

    const [rows] = await db.execute(
      `SELECT e.*, at.name as asset_name, at.unit, b.name as base_name
       FROM expenditures e
       JOIN asset_types at ON e.asset_type_id=at.id
       JOIN bases b ON e.base_id=b.id
       WHERE e.id=?`,
      [id]
    );

    res.status(201).json({ message: 'Expenditure recorded', expenditure: rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to record expenditure' });
  }
});

module.exports = router;