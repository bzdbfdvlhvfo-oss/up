import { useState, useEffect } from 'react'
import * as api from '../api'

export default function TradeUp({ user, onBalanceUpdate }) {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [doing, setDoing] = useState(false)

  useEffect(() => {
    api.getInventory(user.id).then(d => { setItems(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const toggle = (id) => {
    if (doing) return
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 10 ? [...prev, id] : prev)
  }

  const doTrade = async () => {
    if (selected.length !== 10 || doing) return
    setDoing(true)
    try {
      const res = await api.tradeUp(user.id, selected)
      setResult(res)
      setSelected([])
      api.getInventory(user.id).then(setItems)
      onBalanceUpdate()
    } catch (err) { alert(err.message) }
    setDoing(false)
  }

  const selectedItems = items.filter(i => selected.includes(i.inventory_id))

  // Group by rarity+quality for validation display
  const byRarity = {}
  items.forEach(i => {
    const k = `${i.rarity}|${i.quality}`
    if (!byRarity[k]) byRarity[k] = []
    byRarity[k].push(i)
  })

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Контракт</h2>
        <div className="page-subtitle">Заложи 10 скинов одного качества и получи 1 лучше</div>
      </div>

      <div className="tradeup-layout">
        <div className="tradeup-slots">
          <h3>Заложено: {selected.length}/10</h3>
          <div className="tradeup-grid">
            {Array.from({ length: 10 }).map((_, i) => {
              const item = selectedItems[i]
              return (
                <div key={i} className={`tradeup-slot ${item ? 'filled' : 'empty'}`}>
                  {item && (
                    <>
                      <img src={item.image_url} alt={item.name} />
                      <div className="tradeup-slot-name">{item.name}</div>
                    </>
                  )}
                  <div className="tradeup-slot-num">{i + 1}</div>
                </div>
              )
            })}
          </div>
          {selected.length === 10 && (
            <button className="btn btn-primary tradeup-btn" onClick={doTrade} disabled={doing}>
              {doing ? '...' : 'Обменять'}
            </button>
          )}
          {result && (
            <div className="tradeup-result">
              <div className="tradeup-result-title">Результат контракта</div>
              {result.won && (
                <div className="tradeup-result-skin">
                  <img src={result.won.image_url} alt={result.won.name} />
                  <div className={`tradeup-result-rarity rarity-${result.won.rarity?.toLowerCase()}`}>{result.won.rarity}</div>
                  <div className="tradeup-result-name">{result.won.name}</div>
                  <div className="tradeup-result-price">{result.won.price.toLocaleString()} ₽</div>
                </div>
              )}
              <button className="btn btn-sm" onClick={() => setResult(null)}>Ок</button>
            </div>
          )}
        </div>

        <div className="tradeup-inventory">
          <h3>Инвентарь</h3>
          {loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : (
            <div className="skin-grid">
              {items.filter(i => !i.withdrawn_at).map(item => {
                const isSel = selected.includes(item.inventory_id)
                const disabled = !isSel && selected.length >= 10
                return (
                  <div key={item.inventory_id}
                    className={`skin-card${isSel ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
                    onClick={() => toggle(item.inventory_id)}>
                    <div className="skin-img-wrap">
                      {item.image_url ? <img src={item.image_url} alt=""/> : <div className="skin-ph"/>}
                    </div>
                    <div className="skin-info">
                      <div className="skin-name">{item.name}</div>
                      <div className="skin-ql">{item.rarity} · {item.quality}</div>
                      <div className="skin-price">{item.price.toLocaleString()} ₽</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
