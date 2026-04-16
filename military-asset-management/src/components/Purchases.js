import React, { useState, useEffect, useCallback } from 'react';
import { purchasesAPI, dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Purchases() {
  const { user, isAdmin, isLogistics } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [bases, setBases] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const defaultBase = user?.role === 'base_commander' ? user.base_id : '';
  const today = new Date().toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    base_id: defaultBase,
    asset_type_id: '',
    from_date: '',
    to_date: '',
  });

  const [form, setForm] = useState({
    asset_type_id: '',
    base_id: defaultBase,
    quantity: '',
    purchase_date: today,
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const p = {};
      if (filters.base_id) p.base_id = filters.base_id;
      if (filters.asset_type_id) p.asset_type_id = filters.asset_type_id;
      if (filters.from_date) p.from_date = filters.from_date;
      if (filters.to_date) p.to_date = filters.to_date;

      const [pRes, bRes, atRes] = await Promise.all([
        purchasesAPI.getAll(p),
        dashboardAPI.getBases(),
        dashboardAPI.getAssetTypes(),
      ]);

      setPurchases(pRes.data.purchases || []);
      setBases(bRes.data.bases || []);
      setAssetTypes(atRes.data.asset_types || []);
    } catch (err) {
      console.error('fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await purchasesAPI.create({ ...form, quantity: parseInt(form.quantity) });
      setMsg({ ok: true, text: 'Purchase recorded successfully!' });
      setShowForm(false);
      setForm({ asset_type_id: '', base_id: defaultBase, quantity: '', purchase_date: today, notes: '' });
      loadData();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || 'Failed to record purchase' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this purchase record?')) return;
    try {
      await purchasesAPI.delete(id);
      setMsg({ ok: true, text: 'Purchase deleted.' });
      loadData();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || 'Delete failed' });
    }
  };

  const canCreate = isAdmin() || isLogistics();

  // shared input style
  const inp = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  };

  const thStyle = {
    padding: '12px 16px', textAlign: 'left',
    color: 'rgba(255,255,255,0.6)', fontSize: '12px',
    fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: '0.5px', whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '12px 16px', color: 'rgba(255,255,255,0.85)',
    fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.05)',
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0' }}>🛒 Purchases</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>Record and track asset acquisitions</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(!showForm)} style={{ background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            {showForm ? '✕ Cancel' : '+ New Purchase'}
          </button>
        )}
      </div>

      {/* alert message */}
      {msg && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
          background: msg.ok ? 'rgba(39,174,96,0.2)' : 'rgba(231,76,60,0.2)',
          border: msg.ok ? '1px solid rgba(39,174,96,0.4)' : '1px solid rgba(231,76,60,0.4)',
          color: msg.ok ? '#2ecc71' : '#e74c3c',
        }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* new purchase form */}
      {showForm && canCreate && (
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: '0 0 20px 0' }}>Record New Purchase</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asset Type *</label>
                <select value={form.asset_type_id} onChange={e => setForm(p => ({ ...p, asset_type_id: e.target.value }))} style={inp} required>
                  <option value="">Select asset type</option>
                  {assetTypes.map(at => <option key={at.id} value={at.id}>{at.name} ({at.category})</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Base *</label>
                <select value={form.base_id} onChange={e => setForm(p => ({ ...p, base_id: e.target.value }))} style={inp} required disabled={user?.role === 'base_commander'}>
                  <option value="">Select base</option>
                  {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantity *</label>
                <input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} style={inp} placeholder="Enter quantity" required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Purchase Date *</label>
                <input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} style={inp} required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inp, minHeight: '80px', resize: 'vertical' }} placeholder="Optional notes..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                {submitting ? 'Saving...' : 'Record Purchase'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* filters */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {user?.role !== 'base_commander' && (
            <select value={filters.base_id} onChange={e => setFilters(p => ({ ...p, base_id: e.target.value }))} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px', minWidth: '160px' }}>
              <option value="">All Bases</option>
              {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select value={filters.asset_type_id} onChange={e => setFilters(p => ({ ...p, asset_type_id: e.target.value }))} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px', minWidth: '160px' }}>
            <option value="">All Asset Types</option>
            {assetTypes.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
          </select>
          <input type="date" value={filters.from_date} onChange={e => setFilters(p => ({ ...p, from_date: e.target.value }))} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }} />
          <input type="date" value={filters.to_date} onChange={e => setFilters(p => ({ ...p, to_date: e.target.value }))} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }} />
          <button onClick={() => setFilters({ base_id: defaultBase, asset_type_id: '', from_date: '', to_date: '' })} style={{ background: 'rgba(233,69,96,0.2)', color: '#e94560', border: '1px solid rgba(233,69,96,0.4)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Clear</button>
        </div>
      </div>

      {/* table */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', margin: 0 }}>Purchase Records</h3>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{purchases.length} records</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
        ) : purchases.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>No purchase records found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Asset</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Base</th>
                  <th style={thStyle}>Quantity</th>
                  <th style={thStyle}>Notes</th>
                  <th style={thStyle}>Recorded By</th>
                  {isAdmin() && <th style={thStyle}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {purchases.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={tdStyle}>{p.purchase_date?.split('T')[0]}</td>
                    <td style={tdStyle}>{p.asset_name}</td>
                    <td style={tdStyle}>
                      <span style={{ background: 'rgba(52,152,219,0.2)', color: '#3498db', border: '1px solid rgba(52,152,219,0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize' }}>
                        {p.category}
                      </span>
                    </td>
                    <td style={tdStyle}>{p.base_name}</td>
                    <td style={{ ...tdStyle, fontWeight: '600', color: '#27ae60' }}>{p.quantity.toLocaleString()} {p.unit}</td>
                    <td style={tdStyle}>{p.notes || '-'}</td>
                    <td style={tdStyle}>{p.created_by_username}</td>
                    {isAdmin() && (
                      <td style={tdStyle}>
                        <button onClick={() => handleDelete(p.id)} style={{ background: 'rgba(231,76,60,0.2)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.4)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Purchases;