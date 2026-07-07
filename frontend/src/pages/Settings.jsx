import { useState, useEffect } from 'react'
import * as api from '../api'

export default function Settings({ user, onBalanceUpdate }) {
  const [info, setInfo] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) api.getUser(user.id).then(setInfo).catch(() => {})
  }, [user])

  const copyId = () => {
    if (user) {
      navigator.clipboard.writeText(user.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="page settings-page">
      <h2 className="settings-title">Настройки</h2>

      <div className="settings-card">
        <h3>Аккаунт</h3>
        <div className="settings-row">
          <span className="settings-label">Никнейм</span>
          <span className="settings-value">{user?.username}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Баланс</span>
          <span className="settings-value gold">{user?.balance?.toLocaleString()} ₽</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">ID пользователя</span>
          <span className="settings-value id-value">
            <code className="user-id-code">{user?.id}</code>
            <button className="btn btn-sm btn-primary" onClick={copyId}>
              {copied ? 'Скопировано!' : 'Копировать'}
            </button>
          </span>
        </div>
      </div>

      <div className="settings-card">
        <h3>Telegram</h3>
        {info ? (
          <>
            <div className="settings-row">
              <span className="settings-label">Привязка</span>
              <span className="settings-value">{info.telegram_linked ? '✅ Привязан' : '❌ Не привязан'}</span>
            </div>
            {info.telegram_linked && (
              <div className="settings-row">
                <span className="settings-label">Бонус за подписку</span>
                <span className="settings-value">{info.telegram_sub_checked ? '✅ Получен (+300₽)' : '❌ Не получен'}</span>
              </div>
            )}
            <div className="settings-telegram-info">
              <p>1. Напиши боту: <a href={`https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'bot'}`} target="_blank" className="link">@cs2up_bot</a></p>
              <p>2. Отправь команду <code>/link</code> и твой ID</p>
              <p>3. Получи <strong>+100₽</strong> за привязку</p>
              <p>4. Подпишись на канал и отправь <code>/sub</code> — ещё <strong>+300₽</strong></p>
            </div>
          </>
        ) : (
          <p className="settings-loading">Загрузка...</p>
        )}
      </div>

      <div className="settings-card">
        <h3>О проекте</h3>
        <p className="settings-about">
          CS 2 UP ↑ — демо-проект апгрейда скинов CS2.<br/>
          Все цены виртуальные, никаких реальных денег.<br/>
          Покупай скины, продавай, рискуй в колесе фортуны.
        </p>
      </div>
    </div>
  )
}
