import React, { useState, useEffect, useCallback } from 'react';
import { transfersAPI, dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Transfers() {
  const { user, isAdmin } = useAuth();
  const [transfers, setTransfers] = useState([]);
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
    status: '',
  });

  const [form, setForm] = useState({
    asset_type_id: '',
    from_base_id: defaultBase,
    to_base_id: '',
    quantity: '',
    transfer_date: today,
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
      if (filters.status) p.status = filters.status;

      const [tRes, bRes, atRes] = await Promise.all([
        transfersAPI.getAll(p),
        dashboardAPI.getBases(),
        dashboardAPI.getAssetTypes(),
      ]);

      setTransfers(tRes.data.transfers || []);
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
      await transfersAPI.create({ ...form, quantity: parseInt(form.quantity) });
      setMsg({ ok: true, text: 'Transfer recorded successfully!' });
      setShowForm(false);
      setForm({ asset_type_id: '', from_base_id: defaultBase, to_base_id: '', quantity: '', transfer_date: today, notes: '' });
      loadData();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || 'Failed to record transfer' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transfer record?')) return;
    try {
      await transfersAPI.delete(id);
      setMsg({ ok: true, text: 'Transfer deleted.' });
      loadData();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || 'Delete failed' });
    }
  };

  const statusColor = {
    completed: '#27ae60',
    pending: '#f39c12',
    cancelled: '#e74c3c',
  };

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

  const filterSel = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px', padding: '8px 12px',
    color: '#fff', fontSize: '13px', minWidth: '160px',
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0' }}>🔄 Transfers</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>Manage asset transfers between bases</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
          {showForm ? '✕ Cancel' : '+ New Transfer'}
        </button>
      </div>

      {/* alert */}
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

      {/* form */}
      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: '0 0 20px 0' }}>Record New Transfer</h3>
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
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Base *</label>
                <select value={form.from_base_id} onChange={e => setForm(p => ({ ...p, from_base_id: e.target.value }))} style={inp} required disabled={user?.role === 'base_commander'}>
                  <option value="">Select source base</option>
                  {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Base *</label>
                <select value={form.to_base_id} onChange={e => setForm(p => ({ ...p, to_base_id: e.target.value }))} style={inp} required>
                  <option value="">Select destination base</option>
                  {bases.filter(b => b.id !== form.from_base_id).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantity *</label>
                <input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} style={inp} placeholder="Enter quantity" required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transfer Date *</label>
                <input type="date" value={form.transfer_date} onChange={e => setForm(p => ({ ...p, transfer_date: e.target.value }))} style={inp} required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={inp} placeholder="Optional notes..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                {submitting ? 'Saving...' : 'Record Transfer'}
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
            <select value={filters.base_id} onChange={e => setFilters(p => ({ ...p, base_id: e.target.value }))} style={filterSel}>
              <option value="">All Bases</option>
              {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select value={filters.asset_type_id} onChange={e => setFilters(p => ({ ...p, asset_type_id: e.target.value }))} style={filterSel}>
            <option value="">All Asset Types</option>
            {assetTypes.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
          </select>
          <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} style={filterSel}>
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="date" value={filters.from_date} onChange={e => setFilters(p => ({ ...p, from_date: e.target.value }))} style={{ ...filterSel, minWidth: 'unset' }} />
          <input type="date" value={filters.to_date} onChange={e => setFilters(p => ({ ...p, to_date: e.target.value }))} style={{ ...filterSel, minWidth: 'unset' }} />
          <button onClick={() => setFilters({ base_id: defaultBase, asset_type_id: '', from_date: '', to_date: '', status: '' })} style={{ background: 'rgba(233,69,96,0.2)', color: '#e94560', border: '1px solid rgba(233,69,96,0.4)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Clear</button>
        </div>
      </div>

      {/* table */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', margin: 0 }}>Transfer Records</h3>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{transfers.length} records</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
        ) : transfers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>No transfer records found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Asset</th>
                  <th style={thStyle}>From Base</th>
                  <th style={thStyle}>To Base</th>
                  <th style={thStyle}>Quantity</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Notes</th>
                  <th style={thStyle}>Recorded By</th>
                  {isAdmin() && <th style={thStyle}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {transfers.map((t, i) => {
                  const sc = statusColor[t.status] || '#aaa';
                  return (
                    <tr key={t.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={tdStyle}>{t.transfer_date?.split('T')[0]}</td>
                      <td style={tdStyle}>{t.asset_name}</td>
                      <td style={tdStyle}><span style={{ color: '#e74c3c', fontSize: '13px' }}>📤 {t.from_base_name}</span></td>
                      <td style={tdStyle}><span style={{ color: '#27ae60', fontSize: '13px' }}>📥 {t.to_base_name}</span></td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#3498db' }}>{t.quantity.toLocaleString()} {t.unit}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', background: sc + '22', color: sc, border: `1px solid ${sc}44` }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={tdStyle}>{t.notes || '-'}</td>
                      <td style={tdStyle}>{t.created_by_username}</td>
                      {isAdmin() && (
                        <td style={tdStyle}>
                          <button onClick={() => handleDelete(t.id)} style={{ background: 'rgba(231,76,60,0.2)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.4)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transfers;