import { useState, useEffect } from 'react'
import * as api from '../api'

export default function Leaderboard() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getLeaderboard().then(d => { setUsers(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Лидерборд</h2>
        <div className="page-subtitle">Топ игроков по балансу</div>
      </div>

      <div className="leaderboard-wrap">
        {loading ? (
          <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="lb-rank">#</th>
                <th className="lb-user">Игрок</th>
                <th className="lb-balance">Баланс</th>
                <th className="lb-items">Скинов</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={i < 3 ? `lb-top lb-top-${i + 1}` : ''}>
                  <td className="lb-rank">
                    {i < 3 ? <span className={`lb-rank-medal lb-rank-${i + 1}`}>{['🥇','🥈','🥉'][i]}</span> : `#${i + 1}`}
                  </td>
                  <td className="lb-user">{u.username}</td>
                  <td className="lb-balance">{u.balance.toLocaleString()} ₽</td>
                  <td className="lb-items">{u.items_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
