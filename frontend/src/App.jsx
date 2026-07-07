import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import Home from './pages/Home'
import Marketplace from './pages/Marketplace'
import Inventory from './pages/Inventory'
import Upgrade from './pages/Upgrade'
import Settings from './pages/Settings'
import * as api from './api'

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cs2_user')
    return saved ? JSON.parse(saved) : null
  })
  const [balance, setBalance] = useState(0)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    if (user) {
      localStorage.setItem('cs2_user', JSON.stringify(user))
      api.getBalance(user.id).then(d => setBalance(d.balance)).catch(() => {})
    } else {
      localStorage.removeItem('cs2_user')
      setBalance(0)
    }
  }, [user])

  const handleAuthSuccess = (u) => {
    setUser(u)
    setBalance(u.balance)
    setShowAuth(false)
  }

  const handleLogout = () => {
    setUser(null)
    setBalance(0)
  }

  const refreshBalance = () => {
    if (user) {
      api.getBalance(user.id).then(d => setBalance(d.balance)).catch(() => {})
    }
  }

  return (
    <div className="app">
      <Navbar user={user} balance={balance} onLoginClick={() => setShowAuth(true)} onLogout={handleLogout} onBalanceUpdate={refreshBalance} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home user={user} onLoginClick={() => setShowAuth(true)} />} />
          <Route path="/marketplace" element={<Marketplace user={user} onBalanceUpdate={refreshBalance} />} />
          <Route path="/inventory" element={user ? <Inventory user={user} onBalanceUpdate={refreshBalance} /> : <Navigate to="/" />} />
          <Route path="/upgrade" element={user ? <Upgrade user={user} onBalanceUpdate={refreshBalance} /> : <Navigate to="/" />} />
          <Route path="/settings" element={user ? <Settings user={user} onBalanceUpdate={refreshBalance} /> : <Navigate to="/" />} />
        </Routes>
      </main>
      {showAuth && <AuthModal onLogin={handleAuthSuccess} onClose={() => setShowAuth(false)} />}
    </div>
  )
}

export default App
