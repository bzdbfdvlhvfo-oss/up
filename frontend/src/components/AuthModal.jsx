import { useState } from 'react'

export default function AuthModal({ onLogin, onClose }) {
  const [username, setUsername] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (username.trim()) onLogin(username.trim())
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Вход</h2>
        <p className="modal-hint">Введи любой никнейм для входа (демо-режим)</p>
        <form onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Steam Никнейм"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
          />
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary">Войти</button>
            <button type="button" className="btn" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  )
}
