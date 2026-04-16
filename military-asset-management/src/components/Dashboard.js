import React, { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// modal that shows purchase + transfer breakdown for a row
function NetMovementsModal({ filters, onClose }) {
  const [data, setData] = useState({ purchases: [], transfers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getNetMovements(filters)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px',
  };
  const box = {
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px', width: '100%', maxWidth: '800px',
    maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
  };
  const thStyle = {
    padding: '10px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.5)',
    fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
    background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)',
  };
  const tdStyle = {
    padding: '10px 12px', color: 'rgba(255,255,255,0.8)',
    fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.05)',
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>📦 Net Movement Details</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
        ) : (
          <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
            <h4 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0' }}>
              Purchases ({data.purchases?.length || 0})
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Asset</th>
                    <th style={thStyle}>Base</th>
                    <th style={thStyle}>Qty</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.purchases?.map(p => (
                    <tr key={p.id}>
                      <td style={tdStyle}>{p.asset_name}</td>
                      <td style={tdStyle}>{p.base_name}</td>
                      <td style={tdStyle}>{p.quantity}</td>
                      <td style={tdStyle}>{p.date?.split('T')[0]}</td>
                      <td style={tdStyle}>{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 12px 0' }}>
              Transfers ({data.transfers?.length || 0})
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Asset</th>
                    <th style={thStyle}>From</th>
                    <th style={thStyle}>To</th>
                    <th style={thStyle}>Qty</th>
                    <th style={thStyle}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transfers?.map(t => (
                    <tr key={t.id}>
                      <td style={tdStyle}>{t.asset_name}</td>
                      <td style={tdStyle}>{t.from_base_name}</td>
                      <td style={tdStyle}>{t.to_base_name}</td>
                      <td style={tdStyle}>{t.quantity}</td>
                      <td style={tdStyle}>{t.date?.split('T')[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState([]);
  const [totals, setTotals] = useState({});
  const [bases, setBases] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalFilters, setModalFilters] = useState({});

  const defaultBase = user?.role === 'base_commander' ? user.base_id : '';
  const [filters, setFilters] = useState({
    base_id: defaultBase,
    asset_type_id: '',
    category: '',
    from_date: '',
    to_date: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // only send non-empty params
      const p = {};
      if (filters.base_id) p.base_id = filters.base_id;
      if (filters.asset_type_id) p.asset_type_id = filters.asset_type_id;
      if (filters.category) p.category = filters.category;
      if (filters.from_date) p.from_date = filters.from_date;
      if (filters.to_date) p.to_date = filters.to_date;

      const [sumRes, basesRes, atRes] = await Promise.all([
        dashboardAPI.getSummary(p),
        dashboardAPI.getBases(),
        dashboardAPI.getAssetTypes(),
      ]);

      setSummary(sumRes.data.summary || []);
      setTotals(sumRes.data.totals || {});
      setBases(basesRes.data.bases || []);
      setAssetTypes(atRes.data.asset_types || []);
    } catch (err) {
      console.error('dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  const clearFilters = () => setFilters({
    base_id: defaultBase,
    asset_type_id: '',
    category: '',
    from_date: '',
    to_date: '',
  });

  const openModal = (row) => {
    const f = {};
    if (row.base_id) f.base_id = row.base_id;
    if (row.asset_type_id) f.asset_type_id = row.asset_type_id;
    if (filters.from_date) f.from_date = filters.from_date;
    if (filters.to_date) f.to_date = filters.to_date;
    setModalFilters(f);
    setShowModal(true);
  };

  const catColor = {
    vehicle: '#3498db',
    weapon: '#e74c3c',
    ammunition: '#f39c12',
    equipment: '#27ae60',
  };

  const cards = [
    { label: 'Total Purchased', val: totals.total_purchased || 0, icon: '🛒', color: '#3498db' },
    { label: 'Transfers In', val: totals.total_transfers_in || 0, icon: '📥', color: '#27ae60' },
    { label: 'Transfers Out', val: totals.total_transfers_out || 0, icon: '📤', color: '#e74c3c' },
    { label: 'Assigned', val: totals.total_assigned || 0, icon: '📋', color: '#f39c12' },
    { label: 'Expended', val: totals.total_expended || 0, icon: '💥', color: '#9b59b6' },
    { label: 'Net Balance', val: totals.total_closing_balance || 0, icon: '📦', color: '#1abc9c' },
  ];

  const inputSel = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '13px',
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
  const tdNum = { ...tdStyle, textAlign: 'right', fontFamily: 'monospace' };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0' }}>📊 Asset Dashboard</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>Real-time asset balance and movement overview</p>
      </div>

      {/* stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {cards.map(c => (
          <div key={c.label} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: `3px solid ${c.color}`,
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{c.icon}</div>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>{c.val.toLocaleString()}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* filter bar */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '600', margin: '0 0 16px 0' }}>🔍 Filters</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {user?.role !== 'base_commander' && (
            <select value={filters.base_id} onChange={e => setFilter('base_id', e.target.value)} style={{ ...inputSel, minWidth: '160px' }}>
              <option value="">All Bases</option>
              {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          <select value={filters.category} onChange={e => setFilter('category', e.target.value)} style={{ ...inputSel, minWidth: '160px' }}>
            <option value="">All Categories</option>
            <option value="vehicle">Vehicle</option>
            <option value="weapon">Weapon</option>
            <option value="ammunition">Ammunition</option>
            <option value="equipment">Equipment</option>
          </select>

          <select value={filters.asset_type_id} onChange={e => setFilter('asset_type_id', e.target.value)} style={{ ...inputSel, minWidth: '160px' }}>
            <option value="">All Asset Types</option>
            {assetTypes
              .filter(at => !filters.category || at.category === filters.category)
              .map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
          </select>

          <input type="date" value={filters.from_date} onChange={e => setFilter('from_date', e.target.value)} style={inputSel} />
          <input type="date" value={filters.to_date} onChange={e => setFilter('to_date', e.target.value)} style={inputSel} />

          <button onClick={clearFilters} style={{ background: 'rgba(233,69,96,0.2)', color: '#e94560', border: '1px solid rgba(233,69,96,0.4)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>
            Clear
          </button>
        </div>
      </div>

      {/* main table */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', margin: 0 }}>Asset Balance Summary</h3>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{summary.length} records</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading data...</div>
        ) : summary.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>No data found for the selected filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={thStyle}>Base</th>
                  <th style={thStyle}>Asset</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Purchased</th>
                  <th style={thStyle}>Trans. In</th>
                  <th style={thStyle}>Trans. Out</th>
                  <th style={thStyle}>Assigned</th>
                  <th style={thStyle}>Expended</th>
                  <th style={thStyle}>Net Balance</th>
                  <th style={thStyle}>Details</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row, i) => (
                  <tr key={`${row.base_id}-${row.asset_type_id}`} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={tdStyle}>{row.base_name}</td>
                    <td style={tdStyle}>{row.asset_name}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                        fontWeight: '600', textTransform: 'capitalize',
                        background: (catColor[row.category] || '#aaa') + '22',
                        color: catColor[row.category] || '#aaa',
                        border: `1px solid ${catColor[row.category] || '#aaa'}44`,
                      }}>
                        {row.category}
                      </span>
                    </td>
                    <td style={tdNum}>{row.opening_balance.toLocaleString()}</td>
                    <td style={{ ...tdNum, color: '#27ae60' }}>+{row.transfers_in.toLocaleString()}</td>
                    <td style={{ ...tdNum, color: '#e74c3c' }}>-{row.transfers_out.toLocaleString()}</td>
                    <td style={{ ...tdNum, color: '#f39c12' }}>{row.assigned.toLocaleString()}</td>
                    <td style={{ ...tdNum, color: '#9b59b6' }}>{row.expended.toLocaleString()}</td>
                    <td style={{ ...tdNum, fontWeight: '700', color: row.closing_balance < 0 ? '#e74c3c' : '#1abc9c' }}>
                      {row.closing_balance.toLocaleString()} {row.unit}
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => openModal(row)} style={{ background: 'rgba(52,152,219,0.2)', color: '#3498db', border: '1px solid rgba(52,152,219,0.4)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <NetMovementsModal filters={modalFilters} onClose={() => setShowModal(false)} />}
    </div>
  );
}

export default Dashboard;