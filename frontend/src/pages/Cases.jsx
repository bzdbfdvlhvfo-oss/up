import { useState, useEffect } from 'react'
import * as api from '../api'

export default function Cases({ user, onBalanceUpdate }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(null)
  const [result, setResult] = useState(null)
  const [showAnim, setShowAnim] = useState(false)

  useEffect(() => {
    api.getCases().then(d => { setCases(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const openCase = async (c) => {
    if (opening) return
    setOpening(c.id)
    try {
      const res = await api.buyCase(user.id, c.id)
      setResult(res)
      setShowAnim(true)
      setTimeout(() => setShowAnim(false), 3500)
      onBalanceUpdate()
    } catch (err) { alert(err.message) }
    setOpening(null)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Кейсы</h2>
        <div className="page-subtitle">Купи кейс и открой — испытай удачу</div>
      </div>

      <div className="cases-grid">
        {cases.map(c => (
          <div key={c.id} className="case-card">
            <div className="case-img-wrap">
              <img src={c.image_url} alt={c.name} className="case-img" />
            </div>
            <div className="case-info">
              <div className="case-name">{c.name}</div>
              <div className="case-price">{c.price.toLocaleString()} ₽</div>
            </div>
            <div className="case-drops-preview">
              {c.drops.slice(0, 6).map(d => (
                d.skin && <div key={d.skin_id} className="case-drop-mini" title={d.skin.name}>
                  <img src={d.skin.image_url} alt={d.skin.name} />
                </div>
              ))}
              {c.drops.length > 6 && <div className="case-drop-more">+{c.drops.length - 6}</div>}
            </div>
            {user ? (
              <button className="btn btn-primary case-btn" onClick={() => openCase(c)} disabled={opening === c.id}>
                {opening === c.id ? '...' : 'Открыть'}
              </button>
            ) : (
              <div className="case-nologin">Войди чтобы открыть</div>
            )}
          </div>
        ))}
      </div>

      {showAnim && result && (
        <div className="case-open-overlay" onClick={() => setShowAnim(false)}>
          <div className="case-open-modal" onClick={e => e.stopPropagation()}>
            <div className="case-open-title">Открытие кейса</div>
            <div className="case-open-sub">{result.case_name}</div>
            <div className="case-open-reveal">
              <div className="case-open-skin-img">
                <img src={result.skin.image_url} alt={result.skin.name} />
              </div>
              <div className={`case-open-rarity rarity-${result.skin.rarity?.toLowerCase()}`}>{result.skin.rarity}</div>
              <div className="case-open-skin-name">{result.skin.name}</div>
              <div className="case-open-skin-price">{result.skin.price.toLocaleString()} ₽</div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAnim(false)}>Забрать</button>
          </div>
        </div>
      )}
    </div>
  )
}
