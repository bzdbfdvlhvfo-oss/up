import { useState, useEffect, useRef } from 'react'
import * as api from '../api'
import SkinCard from '../components/SkinCard'

function playTone(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'win') {
      osc.frequency.setValueAtTime(523, ctx.currentTime)
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } else if (type === 'lose') {
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.setValueAtTime(300, ctx.currentTime + 0.15)
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } else if (type === 'spin') {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.05, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    }
  } catch {}
}

export default function Upgrade({ user, onBalanceUpdate }) {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [animClass, setAnimClass] = useState('')
  const circleRef = useRef(null)

  const fetchData = () => {
    api.getInventory(user.id).then(setItems).catch(() => {})
    api.getUpgradeHistory(user.id).then(setHistory).catch(() => {})
  }

  useEffect(() => { fetchData() }, [])

  const toggleSkin = (inventoryId) => {
    setSelected(prev =>
      prev.includes(inventoryId)
        ? prev.filter(id => id !== inventoryId)
        : [...prev, inventoryId]
    )
    setResult(null)
    setAnimClass('')
  }

  const handleUpgrade = async () => {
    if (selected.length === 0) return
    setLoading(true)
    setResult(null)
    setAnimClass('')
    playTone('spin')
    setTimeout(async () => {
      try {
        const res = await api.upgrade(user.id, selected)
        setResult(res)
        if (res.won) {
          setAnimClass('win-anim')
          playTone('win')
        } else {
          setAnimClass('lose-anim')
          playTone('lose')
          setSelected([])
        }
        fetchData()
        onBalanceUpdate()
      } catch (err) {
        alert(err.message)
      }
      setLoading(false)
    }, 600)
  }

  const totalStaked = items
    .filter(i => selected.includes(i.inventory_id))
    .reduce((sum, i) => sum + i.price, 0)

  return (
    <div className="page upgrade-page">
      <h2>Апгрейд</h2>
      <p className="upgrade-hint">Выбери скины для ставки и нажми <strong>FAK</strong></p>

      {result && (
        <div className={`upgrade-result-overlay ${result.won ? 'win' : 'lose'}`}>
          {result.won ? (
            <>Ты выиграл <strong>{result.won_skin?.name}</strong> ({result.won_skin?.quality}) — {result.won_skin?.price.toLocaleString()} ₽</>
          ) : (
            <>Ты проиграл ставку. Повезёт в следующий раз!</>
          )}
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            Шанс: {result.chance}% (roll: {result.roll}%)
          </div>
        </div>
      )}

      <div className="upgrade-section">
        <div className="upgrade-circle-wrap">
          <div className={`upgrade-circle ${animClass}`} ref={circleRef}>
            <div className="upgrade-circle-inner">
              <button
                className={`upgrade-circle-btn ${loading ? 'spinning' : ''}`}
                onClick={handleUpgrade}
                disabled={loading || selected.length === 0}
              >
                FAK
              </button>
            </div>
          </div>
        </div>
        <div className="circle-stake-info">
          {selected.length > 0 ? (
            <>Поставлено: <span className="highlight">{selected.length}</span> скинов на <span className="highlight">{totalStaked.toLocaleString()} ₽</span></>
          ) : (
            <>Выбери скины ниже чтобы сделать ставку</>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>В инвентаре нет скинов. Купи что-нибудь в Маркете.</p>
          <a href="/marketplace" className="btn btn-primary">В Маркет</a>
        </div>
      ) : (
        <div className="skin-grid">
          {items.map(item => (
            <SkinCard
              key={item.inventory_id}
              skin={item}
              inInventory
              inventoryId={item.inventory_id}
              selected={selected.includes(item.inventory_id)}
              onToggle={() => toggleSkin(item.inventory_id)}
            />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="history-section">
          <h3>История апгрейдов</h3>
          <div className="history-list">
            {history.map(h => (
              <div key={h.id} className={`history-item ${h.result}`}>
                <span>{h.result === 'win' ? 'ВЫИГРЫШ' : 'ПРОИГРЫШ'}</span>
                <span>{h.staked_name}</span>
                <span className="history-date">{new Date(h.created_at).toLocaleString('ru')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
