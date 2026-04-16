import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  // which pages each role can see
  const allLinks = [
    { path: '/dashboard', label: '📊 Dashboard', roles: ['admin', 'base_commander', 'logistics_officer'] },
    { path: '/purchases', label: '🛒 Purchases', roles: ['admin', 'logistics_officer'] },
    { path: '/transfers', label: '🔄 Transfers', roles: ['admin', 'base_commander', 'logistics_officer'] },
    { path: '/assignments', label: '📋 Assignments', roles: ['admin', 'base_commander', 'logistics_officer'] },
  ];

  const links = allLinks.filter(l => l.roles.includes(user?.role));

  const roleColor = {
    admin: '#e94560',
    base_commander: '#f39c12',
    logistics_officer: '#27ae60',
  };

  const roleLabel = {
    admin: 'Admin',
    base_commander: 'Base Commander',
    logistics_officer: 'Logistics Officer',
  };

  const rc = roleColor[user?.role] || '#aaa';

  return (
    <nav style={{
      background: 'linear-gradient(90deg, #1a1a2e, #16213e)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      height: '60px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
    }}>
      {/* brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '32px' }}>
        <span style={{ fontSize: '22px' }}>⚔️</span>
        <span style={{ color: '#fff', fontWeight: '700', fontSize: '18px', letterSpacing: '1px' }}>MilAsset</span>
      </div>

      {/* nav links */}
      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
        {links.map(l => {
          const isActive = location.pathname === l.path;
          return (
            <Link
              key={l.path}
              to={l.path}
              style={{
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      {/* user info + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{user?.username}</span>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: rc + '22',
            color: rc,
            border: `1px solid ${rc}44`,
          }}>
            {roleLabel[user?.role]}
          </span>
          {user?.base_name && (
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>📍 {user.base_name}</span>
          )}
        </div>
        <button onClick={doLogout} style={{
          background: 'rgba(233,69,96,0.2)',
          color: '#e94560',
          border: '1px solid rgba(233,69,96,0.4)',
          borderRadius: '6px',
          padding: '6px 14px',
          fontSize: '13px',
          cursor: 'pointer',
          fontWeight: '500',
        }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;