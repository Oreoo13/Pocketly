import { NavLink } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">💰</span>
        <span className="navbar-title">Pocketly</span>
      </div>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <span>📊</span> Dashboard
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <span>💳</span> Transaksi
        </NavLink>
        <NavLink to="/budget" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <span>🎯</span> Budget
        </NavLink>
      </div>
    </nav>
  )
}
