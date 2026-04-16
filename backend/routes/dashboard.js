const express = require('express');
const { getPool } = require('../database/schema');
const { authenticateToken, scopeToBase } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/summary
// returns asset balance per base per asset type
router.get('/summary', authenticateToken, scopeToBase, async (req, res) => {
  try {
    const db = getPool();
    const baseFilter = req.baseFilter || req.query.base_id || null;
    const { from_date, to_date, category } = req.query;

    // get asset types (optionally filtered by category)
    let atQ = 'SELECT * FROM asset_types';
    const atP = [];
    if (category) { atQ += ' WHERE category=?'; atP.push(category); }
    atQ += ' ORDER BY category, name';
    const [assetTypes] = await db.execute(atQ, atP);

    // get bases
    let bQ = 'SELECT * FROM bases';
    const bP = [];
    if (baseFilter) { bQ += ' WHERE id=?'; bP.push(baseFilter); }
    bQ += ' ORDER BY name';
    const [bases] = await db.execute(bQ, bP);

    const summary = [];

    for (const at of assetTypes) {
      for (const base of bases) {
        // build date conditions
        let dateCond = '';
        const dateP = [];
        if (from_date) { dateCond += ' AND date_col >= ?'; dateP.push(from_date); }
        if (to_date) { dateCond += ' AND date_col <= ?'; dateP.push(to_date); }

        // purchases
        const pCond = dateCond.replace(/date_col/g, 'purchase_date');
        const [[pRow]] = await db.execute(
          `SELECT COALESCE(SUM(quantity),0) as v FROM purchases WHERE asset_type_id=? AND base_id=?${pCond}`,
          [at.id, base.id, ...dateP]
        );

        // transfers out
        const tCond = dateCond.replace(/date_col/g, 'transfer_date');
        const [[tOutRow]] = await db.execute(
          `SELECT COALESCE(SUM(quantity),0) as v FROM transfers WHERE asset_type_id=? AND from_base_id=? AND status='completed'${tCond}`,
          [at.id, base.id, ...dateP]
        );

        // transfers in
        const [[tInRow]] = await db.execute(
          `SELECT COALESCE(SUM(quantity),0) as v FROM transfers WHERE asset_type_id=? AND to_base_id=? AND status='completed'${tCond}`,
          [at.id, base.id, ...dateP]
        );

        // assigned (active)
        const aCond = dateCond.replace(/date_col/g, 'assignment_date');
        const [[aRow]] = await db.execute(
          `SELECT COALESCE(SUM(quantity),0) as v FROM assignments WHERE asset_type_id=? AND base_id=? AND status='active'${aCond}`,
          [at.id, base.id, ...dateP]
        );

        // expended
        const eCond = dateCond.replace(/date_col/g, 'expenditure_date');
        const [[eRow]] = await db.execute(
          `SELECT COALESCE(SUM(quantity),0) as v FROM expenditures WHERE asset_type_id=? AND base_id=?${eCond}`,
          [at.id, base.id, ...dateP]
        );

        const purchased = Number(pRow.v);
        const tIn = Number(tInRow.v);
        const tOut = Number(tOutRow.v);
        const assigned = Number(aRow.v);
        const expended = Number(eRow.v);
        const closing = purchased + tIn - tOut - assigned - expended;

        // skip rows with no activity at all
        if (purchased === 0 && tIn === 0 && tOut === 0 && assigned === 0 && expended === 0) continue;

        summary.push({
          asset_type_id: at.id,
          asset_name: at.name,
          category: at.category,
          unit: at.unit,
          base_id: base.id,
          base_name: base.name,
          opening_balance: purchased,
          transfers_in: tIn,
          transfers_out: tOut,
          assigned,
          expended,
          closing_balance: closing
        });
      }
    }

    const totals = {
      total_purchased: summary.reduce((s, r) => s + r.opening_balance, 0),
      total_transfers_in: summary.reduce((s, r) => s + r.transfers_in, 0),
      total_transfers_out: summary.reduce((s, r) => s + r.transfers_out, 0),
      total_assigned: summary.reduce((s, r) => s + r.assigned, 0),
      total_expended: summary.reduce((s, r) => s + r.expended, 0),
      total_closing_balance: summary.reduce((s, r) => s + r.closing_balance, 0)
    };

    res.json({ summary, totals, bases, asset_types: assetTypes });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /api/dashboard/bases
router.get('/bases', authenticateToken, async (req, res) => {
  try {
    const db = getPool();
    const [bases] = await db.execute('SELECT * FROM bases ORDER BY name');
    res.json({ bases });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/asset-types
router.get('/asset-types', authenticateToken, async (req, res) => {
  try {
    const db = getPool();
    const [asset_types] = await db.execute('SELECT * FROM asset_types ORDER BY category, name');
    res.json({ asset_types });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/net-movements
// used by the popup modal on the dashboard
router.get('/net-movements', authenticateToken, scopeToBase, async (req, res) => {
  try {
    const db = getPool();
    const { base_id, asset_type_id, from_date, to_date } = req.query;
    const effectiveBase = req.baseFilter || base_id || null;

    // purchases
    let pQ = `
      SELECT p.id, p.quantity, p.purchase_date as date, p.notes,
             at.name as asset_name, b.name as base_name, 'purchase' as type
      FROM purchases p
      JOIN asset_types at ON p.asset_type_id=at.id
      JOIN bases b ON p.base_id=b.id
      WHERE 1=1
    `;
    const pP = [];
    if (effectiveBase) { pQ += ' AND p.base_id=?'; pP.push(effectiveBase); }
    if (asset_type_id) { pQ += ' AND p.asset_type_id=?'; pP.push(asset_type_id); }
    if (from_date) { pQ += ' AND p.purchase_date>=?'; pP.push(from_date); }
    if (to_date) { pQ += ' AND p.purchase_date<=?'; pP.push(to_date); }
    pQ += ' ORDER BY p.purchase_date DESC';

    // transfers
    let tQ = `
      SELECT t.id, t.quantity, t.transfer_date as date, t.notes,
             at.name as asset_name, fb.name as from_base_name, tb.name as to_base_name,
             'transfer' as type, t.status
      FROM transfers t
      JOIN asset_types at ON t.asset_type_id=at.id
      JOIN bases fb ON t.from_base_id=fb.id
      JOIN bases tb ON t.to_base_id=tb.id
      WHERE 1=1
    `;
    const tP = [];
    if (effectiveBase) { tQ += ' AND (t.from_base_id=? OR t.to_base_id=?)'; tP.push(effectiveBase, effectiveBase); }
    if (asset_type_id) { tQ += ' AND t.asset_type_id=?'; tP.push(asset_type_id); }
    if (from_date) { tQ += ' AND t.transfer_date>=?'; tP.push(from_date); }
    if (to_date) { tQ += ' AND t.transfer_date<=?'; tP.push(to_date); }
    tQ += ' ORDER BY t.transfer_date DESC';

    const [purchases] = await db.execute(pQ, pP);
    const [transfers] = await db.execute(tQ, tP);

    res.json({ purchases, transfers });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;