import React, { useState, useEffect, useCallback } from 'react';
import { assignmentsAPI, dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Assignments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
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

  const [assignForm, setAssignForm] = useState({
    asset_type_id: '',
    base_id: defaultBase,
    assigned_to: '',
    quantity: '',
    assignment_date: today,
    notes: '',
  });

  const [expendForm, setExpendForm] = useState({
    asset_type_id: '',
    base_id: defaultBase,
    quantity: '',
    expenditure_date: today,
    reason: '',
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

      const [aRes, eRes, bRes, atRes] = await Promise.all([
        assignmentsAPI.getAll(p),
        assignmentsAPI.getExpenditures(p),
        dashboardAPI.getBases(),
        dashboardAPI.getAssetTypes(),
      ]);

      setAssignments(aRes.data.assignments || []);
      setExpenditures(eRes.data.expenditures || []);
      setBases(bRes.data.bases || []);
      setAssetTypes(atRes.data.asset_types || []);
    } catch (err) {
      console.error('fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await assignmentsAPI.create({ ...assignForm, quantity: parseInt(assignForm.quantity) });
      setMsg({ ok: true, text: 'Assignment created successfully!' });
      setShowForm(false);
      setAssignForm({ asset_type_id: '', base_id: defaultBase, assigned_to: '', quantity: '', assignment_date: today, notes: '' });
      loadData();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || 'Failed to create assignment' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpendSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await assignmentsAPI.createExpenditure({ ...expendForm, quantity: parseInt(expendForm.quantity) });
      setMsg({ ok: true, text: 'Expenditure recorded successfully!' });
      setShowForm(false);
      setExpendForm({ asset_type_id: '', base_id: defaultBase, quantity: '', expenditure_date: today, reason: '', notes: '' });
      loadData();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || 'Failed to record expenditure' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (id) => {
    if (!window.confirm('Mark this assignment as returned?')) return;
    try {
      await assignmentsAPI.markReturned(id, {});
      setMsg({ ok: true, text: 'Assignment marked as returned.' });
      loadData();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || 'Failed to update assignment' });
    }
  };

  const statusColor = {
    active: '#27ae60',
    returned: '#3498db',
    expended: '#9b59b6',
  };

  // shared input style used in both forms
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

  const lbl = {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0' }}>📋 Assignments &amp; Expenditures</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>Track asset assignments and usage</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
          {showForm ? '✕ Cancel' : '+ New Record'}
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

      {/* form panel */}
      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          {/* form type tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button onClick={() => setActiveTab('assignments')} style={{
              background: activeTab === 'assignments' ? 'rgba(243,156,18,0.2)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'assignments' ? '#f39c12' : 'rgba(255,255,255,0.5)',
              border: activeTab === 'assignments' ? '1px solid rgba(243,156,18,0.4)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
            }}>
              📋 Assignment
            </button>
            <button onClick={() => setActiveTab('expenditures')} style={{
              background: activeTab === 'expenditures' ? 'rgba(243,156,18,0.2)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'expenditures' ? '#f39c12' : 'rgba(255,255,255,0.5)',
              border: activeTab === 'expenditures' ? '1px solid rgba(243,156,18,0.4)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
            }}>
              💥 Expenditure
            </button>
          </div>

          {activeTab === 'assignments' ? (
            <form onSubmit={handleAssignSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={lbl}>Asset Type *</label>
                  <select value={assignForm.asset_type_id} onChange={e => setAssignForm(p => ({ ...p, asset_type_id: e.target.value }))} style={inp} required>
                    <option value="">Select asset type</option>
                    {assetTypes.map(at => <option key={at.id} value={at.id}>{at.name} ({at.category})</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={lbl}>Base *</label>
                  <select value={assignForm.base_id} onChange={e => setAssignForm(p => ({ ...p, base_id: e.target.value }))} style={inp} required disabled={user?.role === 'base_commander'}>
                    <option value="">Select base</option>
                    {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={lbl}>Assigned To *</label>
                  <input type="text" value={assignForm.assigned_to} onChange={e => setAssignForm(p => ({ ...p, assigned_to: e.target.value }))} style={inp} placeholder="Unit / Personnel name" required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={lbl}>Quantity *</label>
                  <input type="number" min="1" value={assignForm.quantity} onChange={e => setAssignForm(p => ({ ...p, quantity: e.target.value }))} style={inp} placeholder="Quantity" required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={lbl}>Assignment Date *</label>
                  <input type="date" value={assignForm.assignment_date} onChange={e => setAssignForm(p => ({ ...p, assignment_date: e.target.value }))} style={inp} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={lbl}>Notes</label>
                  <input type="text" value={assignForm.notes} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))} style={inp} placeholder="Optional notes" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                  {submitting ? 'Saving...' : 'Create Assignment'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px' }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleExpendSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={lbl}>Asset Type *</label>
                  <select value={expendForm.asset_type_id} onChange={e => setExpendForm(p => ({ ...p, asset_type_id: e.target.value }))} style={inp} required>
                    <option value="">Select asset type</option>
                    {assetTypes.map(at => <option key={at.id} value={at.id}>{at.name} ({at.category})</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={lbl}>Base *</label>
                  <select value={expendForm.base_id} onChange={e => setExpendForm(p => ({ ...p, base_id: e.target.value }))} style={inp} required disabled={user?.role === 'base_commander'}>
                    <option value="">Select base</option>
                    {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={lbl}>Quantity *</label>
                  <input type="number" min="1" value={expendForm.quantity} onChange={e => setExpendForm(p => ({ ...p, quantity: e.target.value }))} style={inp} placeholder="Quantity" required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={lbl}>Expenditure Date *</label>
                  <input type="date" value={expendForm.expenditure_date} onChange={e => setExpendForm(p => ({ ...p, expenditure_date: e.target.value }))} style={inp} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={lbl}>Reason *</label>
                  <input type="text" value={expendForm.reason} onChange={e => setExpendForm(p => ({ ...p, reason: e.target.value }))} style={inp} placeholder="Reason for expenditure" required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={lbl}>Notes</label>
                  <input type="text" value={expendForm.notes} onChange={e => setExpendForm(p => ({ ...p, notes: e.target.value }))} style={inp} placeholder="Optional notes" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg, #9b59b6, #8e44ad)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                  {submitting ? 'Saving...' : 'Record Expenditure'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* filters */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
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
            <option value="active">Active</option>
            <option value="returned">Returned</option>
            <option value="expended">Expended</option>
          </select>
          <input type="date" value={filters.from_date} onChange={e => setFilters(p => ({ ...p, from_date: e.target.value }))} style={{ ...filterSel, minWidth: 'unset' }} />
          <input type="date" value={filters.to_date} onChange={e => setFilters(p => ({ ...p, to_date: e.target.value }))} style={{ ...filterSel, minWidth: 'unset' }} />
          <button onClick={() => setFilters({ base_id: defaultBase, asset_type_id: '', from_date: '', to_date: '', status: '' })} style={{ background: 'rgba(233,69,96,0.2)', color: '#e94560', border: '1px solid rgba(233,69,96,0.4)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Clear</button>
        </div>
      </div>

      {/* view tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => setActiveTab('assignments')} style={{
          background: activeTab === 'assignments' ? 'rgba(243,156,18,0.15)' : 'rgba(255,255,255,0.05)',
          color: activeTab === 'assignments' ? '#f39c12' : 'rgba(255,255,255,0.5)',
          border: activeTab === 'assignments' ? '1px solid rgba(243,156,18,0.3)' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
        }}>
          📋 Assignments ({assignments.length})
        </button>
        <button onClick={() => setActiveTab('expenditures')} style={{
          background: activeTab === 'expenditures' ? 'rgba(243,156,18,0.15)' : 'rgba(255,255,255,0.05)',
          color: activeTab === 'expenditures' ? '#f39c12' : 'rgba(255,255,255,0.5)',
          border: activeTab === 'expenditures' ? '1px solid rgba(243,156,18,0.3)' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
        }}>
          💥 Expenditures ({expenditures.length})
        </button>
      </div>

      {/* assignments table */}
      {activeTab === 'assignments' && (
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', margin: 0 }}>Assignment Records</h3>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{assignments.length} records</span>
          </div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
          ) : assignments.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>No assignment records found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Asset</th>
                    <th style={thStyle}>Base</th>
                    <th style={thStyle}>Assigned To</th>
                    <th style={thStyle}>Quantity</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Return Date</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a, i) => {
                    const sc = statusColor[a.status] || '#aaa';
                    return (
                      <tr key={a.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={tdStyle}>{a.assignment_date?.split('T')[0]}</td>
                        <td style={tdStyle}>{a.asset_name}</td>
                        <td style={tdStyle}>{a.base_name}</td>
                        <td style={tdStyle}>{a.assigned_to}</td>
                        <td style={{ ...tdStyle, fontWeight: '600', color: '#f39c12' }}>{a.quantity.toLocaleString()} {a.unit}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', background: sc + '22', color: sc, border: `1px solid ${sc}44` }}>
                            {a.status}
                          </span>
                        </td>
                        <td style={tdStyle}>{a.return_date?.split('T')[0] || '-'}</td>
                        <td style={tdStyle}>
                          {a.status === 'active' && (
                            <button onClick={() => handleReturn(a.id)} style={{ background: 'rgba(52,152,219,0.2)', color: '#3498db', border: '1px solid rgba(52,152,219,0.4)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
                              Return
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* expenditures table */}
      {activeTab === 'expenditures' && (
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', margin: 0 }}>Expenditure Records</h3>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{expenditures.length} records</span>
          </div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
          ) : expenditures.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>No expenditure records found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Asset</th>
                    <th style={thStyle}>Base</th>
                    <th style={thStyle}>Quantity</th>
                    <th style={thStyle}>Reason</th>
                    <th style={thStyle}>Notes</th>
                    <th style={thStyle}>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {expenditures.map((e, i) => (
                    <tr key={e.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={tdStyle}>{e.expenditure_date?.split('T')[0]}</td>
                      <td style={tdStyle}>{e.asset_name}</td>
                      <td style={tdStyle}>{e.base_name}</td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#9b59b6' }}>{e.quantity.toLocaleString()} {e.unit}</td>
                      <td style={tdStyle}>{e.reason}</td>
                      <td style={tdStyle}>{e.notes || '-'}</td>
                      <td style={tdStyle}>{e.created_by_username}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Assignments;