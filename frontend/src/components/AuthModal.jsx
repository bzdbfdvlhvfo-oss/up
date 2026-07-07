import { useState } from 'react'
import * as api from '../api'

export default function AuthModal({ onLogin, onClose }) {
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!username.trim()) return setError('Введите никнейм')
    if (!password.trim()) return setError('Введите пароль')
    setLoading(true)
    try {
      const fn = tab === 'register' ? api.register : api.login
      const u = await fn(username.trim(), password)
      onLogin(u)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{tab === 'login' ? 'Вход' : 'Регистрация'}</h2>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Вход</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Регистрация</button>
        </div>
        <form onSubmit={handleSubmit}>
          <input className="input" placeholder="Никнейм" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
          <input className="input" type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="error-msg">{error}</div>}
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '...' : tab === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
            <button type="button" className="btn" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  )
}
