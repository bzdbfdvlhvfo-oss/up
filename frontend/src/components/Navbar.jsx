import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import * as api from '../api'

export default function Navbar({ user, balance, onLoginClick, onLogout, onBalanceUpdate }) {
  const [promoCode, setPromoCode] = useState('')
  const [promoMsg, setPromoMsg] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const handlePromo = async (e) => {
    e.preventDefault()
    if (!user || !promoCode.trim()) return
    try {
      setPromoMsg(null)
      const res = await api.redeemPromo(user.id, promoCode.trim())
      setPromoMsg(`+${res.amount}₽`)
      onBalanceUpdate()
      setPromoCode('')
    } catch (err) {
      setPromoMsg(err.message)
    }
    setTimeout(() => setPromoMsg(null), 3000)
  }

  const closeMenu = () => setMenuOpen(false)

  const links = [
    { to: '/marketplace', label: 'Маркет', auth: false },
    { to: '/inventory', label: 'Инвентарь', auth: true },
    { to: '/upgrade', label: 'Апгрейд', auth: true },
    { to: '/cases', label: 'Кейсы', auth: true },
    { to: '/tradeup', label: 'Контракт', auth: true },
    { to: '/leaderboard', label: 'Топ', auth: false },
    { to: '/settings', label: 'Настройки', auth: true },
  ]

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="nav-logo" onClick={closeMenu}>CS 2 UP ↑</Link>

        <div className="nav-links">
          {links.map(l => (!l.auth || user) ? (
            <NavLink key={l.to} to={l.to} className={({isActive}) => isActive ? 'active' : ''}>{l.label}</NavLink>
          ) : null)}
        </div>

        <div className="nav-user">
          {user ? (
            <>
              <span className="nav-balance">{balance.toLocaleString()} ₽</span>
              <form className="promo-form" onSubmit={handlePromo}>
                <input className="promo-input" placeholder="ПРОМО" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} maxLength={20} />
                <button type="submit" className="btn btn-sm btn-gold">OK</button>
              </form>
              {promoMsg && <span style={{ fontSize: 11, color: promoMsg.includes('+') ? 'var(--green)' : 'var(--red)' }}>{promoMsg}</span>}
              <span className="nav-username">{user.username}</span>
              <button className="btn btn-sm btn-red" onClick={onLogout}>Выход</button>
            </>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={onLoginClick}>Войти</button>
          )}
        </div>

        <button className={`nav-hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(o => !o)} aria-label="Меню">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 6v10M6 11h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className={`nav-dropdown ${menuOpen ? 'open' : ''}`}>
        {links.map(l => (!l.auth || user) ? (
          <NavLink key={l.to} to={l.to} className={({isActive}) => isActive ? 'active' : ''} onClick={closeMenu}>{l.label}</NavLink>
        ) : null)}
        {user && <div className="nav-dd-logout"><button className="btn btn-sm btn-red" onClick={() => { onLogout(); closeMenu() }}>Выход</button></div>}
      </div>
    </nav>
  )
}
