import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/transactions', label: 'Transaksi', icon: '💳' },
  { to: '/budget', label: 'Budget', icon: '🎯' },
  { to: '/analytics', label: 'Analitik', icon: '🔍' },
  { to: '/debts', label: 'Hutang', icon: '🤝' },
  { to: '/settings', label: 'Pengaturan', icon: '⚙️' },
]

export default function Sidebar({ isOpen, onToggle, user }) {
  const { signOut } = useAuth()

  // Show only the first part of email before '@'
  const displayName = user?.email?.split('@')[0] || 'User'
  const avatarLetter = displayName[0]?.toUpperCase() || 'U'

  const handleLogout = async () => {
    if (!confirm('Yakin ingin keluar?')) return
    await signOut()
  }

  return (
    <>
      {/* ── Desktop Sidebar (always visible, full or mini) ── */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-mini'}`}>

        {/* Brand / Logo */}
        <div className="sidebar-brand">
          <div 
            className="sidebar-logo-wrap" 
            onClick={!isOpen ? onToggle : undefined}
            style={{ cursor: !isOpen ? 'pointer' : 'default' }}
            title={!isOpen ? "Buka sidebar" : ""}
          >
            <span className="sidebar-logo">💰</span>
          </div>
          {isOpen && <span className="sidebar-title" style={{ flex: 1 }}>Pocketly</span>}
          {isOpen && (
            <button className="sidebar-close-btn" onClick={onToggle} aria-label="Tutup sidebar">
              ✕
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {isOpen && <p className="sidebar-section-label">Menu</p>}
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title={!isOpen ? item.label : undefined}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {isOpen && <span className="sidebar-link-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer — User info + Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user" title={user?.email}>
            <div className="sidebar-avatar">{avatarLetter}</div>
            {isOpen && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{displayName}</span>
                <span className="sidebar-user-email">{user?.email}</span>
              </div>
            )}
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Keluar"
          >
            🚪
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
