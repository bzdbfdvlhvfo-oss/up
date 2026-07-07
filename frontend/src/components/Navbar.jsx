import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import * as api from '../api'

export default function Navbar({ user, balance, onLoginClick, onLogout, onBalanceUpdate }) {
  const [promoCode, setPromoCode] = useState('')
  const [promoMsg, setPromoMsg] = useState(null)

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

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">CS2 Upgrader</Link>
        <div className="nav-links">
          <NavLink to="/marketplace" className={({isActive}) => isActive ? 'active' : ''}>Маркет</NavLink>
          <NavLink to="/inventory" className={({isActive}) => isActive ? 'active' : ''}>Инвентарь</NavLink>
          {user && <NavLink to="/upgrade" className={({isActive}) => isActive ? 'active' : ''}>Апгрейд</NavLink>}
        </div>
        <div className="nav-user">
          {user ? (
            <>
              <span className="nav-balance">{balance.toLocaleString()} ₽</span>
              <form className="promo-form" onSubmit={handlePromo}>
                <input
                  className="promo-input"
                  placeholder="ПРОМО"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  maxLength={20}
                />
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
      </div>
    </nav>
  )
}
