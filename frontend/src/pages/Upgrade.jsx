import { useState, useEffect, useRef } from 'react'
import * as api from '../api'

function playTone(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    if (type === 'win') {
      osc.frequency.setValueAtTime(523, ctx.currentTime)
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
    } else if (type === 'lose') {
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.setValueAtTime(300, ctx.currentTime + 0.15)
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
    } else if (type === 'tick') {
      osc.type = 'square'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      gain.gain.setValueAtTime(0.03, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05)
    }
  } catch {}
}

export default function Upgrade({ user, onBalanceUpdate }) {
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [mode, setMode] = useState('multiplier')
  const [value, setValue] = useState(2)
  const [spinning, setSpinning] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [liquidLevel, setLiquidLevel] = useState(0)
  const animRef = useRef(null)
  const tickRef = useRef(null)

  const fetchData = () => {
    api.getInventory(user.id).then(setItems).catch(() => {})
    api.getUpgradeHistory(user.id).then(setHistory).catch(() => {})
  }
  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (!spinning && animRef.current) {
      clearInterval(animRef.current); clearInterval(tickRef.current)
    }
  }, [spinning])

  const selected = items.find(i => i.inventory_id === selectedId)
  const calcChance = () => {
    if (!selected) return 0
    if (mode === 'chance') return Math.min(95, Math.max(1, value))
    const mult = Math.min(10, Math.max(1.01, value))
    return Math.round((1 / mult) * 98 * 100) / 100
  }
  const chance = calcChance()
  const calcMultiplier = () => {
    if (mode === 'multiplier') return value
    const c = Math.min(95, Math.max(1, value))
    return Math.round((100 / c) * 100) / 100
  }
  const multiplier = calcMultiplier()
  const potWin = selected ? Math.round(selected.price * multiplier) : 0

  useEffect(() => {
    if (!spinning) {
      setLiquidLevel(chance)
    }
  }, [chance, spinning, selectedId, mode, value])

  const toggleSkin = (inventoryId) => {
    if (spinning) return
    setSelectedId(prev => prev === inventoryId ? null : inventoryId)
    setResult(null); setShowResult(false)
  }

  const handleUpgrade = async () => {
    if (!selectedId || loading || spinning) return
    setLoading(true); setShowResult(false); setResult(null)
    try {
      const res = await api.upgrade(user.id, selectedId, mode, value)
      setResult(res)
      setSpinning(true)

      let tickCount = 0
      const tickInterval = setInterval(() => {
        playTone('tick'); tickCount++
        if (tickCount > 20) clearInterval(tickInterval)
      }, 100)
      tickRef.current = tickInterval

      // Animate liquid
      const startLevel = chance
      const endLevel = res.won ? 100 : 0
      const startTime = Date.now()
      const duration = 2500

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setLiquidLevel(startLevel + (endLevel - startLevel) * eased)
        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate)
        } else {
          setLiquidLevel(endLevel)
          setSpinning(false)
          clearInterval(tickInterval)
          setTimeout(() => {
            setShowResult(true)
            if (res.won) playTone('win')
            else playTone('lose')
            if (!res.won) setSelectedId(null)
            fetchData()
            onBalanceUpdate()
          }, 500)
        }
      }
      animate()
    } catch (err) { alert(err.message); setSpinning(false) }
    setLoading(false)
  }

  return (
    <div className="page upgrade-page">
      <h2 className="upgrade-title">Апгрейд скина</h2>

      <div className="upgrade-main">
        {selected ? (
          <div className="upgrade-selected-card">
            <div className="upgrade-selected-info">
              <div className="upgrade-selected-name">{selected.name}</div>
              <div className="upgrade-selected-meta">{selected.rarity} · {selected.quality}</div>
              <div className="upgrade-selected-price">{selected.price.toLocaleString()} ₽</div>
            </div>
          </div>
        ) : (
          <div className="upgrade-selected-empty">Выбери скин из инвентаря ниже</div>
        )}

        <div className="upgrade-controls">
          <div className="mode-toggle">
            <button className={`mode-btn ${mode === 'chance' ? 'active' : ''}`} onClick={() => setMode('chance')}>Шанс</button>
            <button className={`mode-btn ${mode === 'multiplier' ? 'active' : ''}`} onClick={() => setMode('multiplier')}>Множитель</button>
          </div>

          <div className="value-presets">
            {mode === 'chance' ? (
              <>
                {[30, 50, 75].map(v => (
                  <button key={v} className={`preset-btn ${value === v ? 'active' : ''}`} onClick={() => setValue(v)}>{v}%</button>
                ))}
              </>
            ) : (
              <>
                {[2, 4, 8].map(v => (
                  <button key={v} className={`preset-btn ${value === v ? 'active' : ''}`} onClick={() => setValue(v)}>{v}x</button>
                ))}
              </>
            )}
          </div>
        </div>

        {selected && (
          <div className="upgrade-stats">
            <div className="stat-item">
              <span className="stat-label">Шанс</span>
              <span className="stat-value chance-value">{chance}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Множитель</span>
              <span className="stat-value">{multiplier}x</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Потенц. выигрыш</span>
              <span className="stat-value potwin-value">{potWin.toLocaleString()} ₽</span>
            </div>
          </div>
        )}

        <div className="liquid-section">
          <div className="liquid-container">
            <div className="liquid-track-wrap">
              <div className="liquid-track">
                <div className="liquid-fill" style={{ height: `${liquidLevel}%` }}>
                  <div className="liquid-wave" />
                  <div className="liquid-glow" />
                </div>
              </div>
            </div>
            <div className="liquid-label">{Math.round(liquidLevel)}%</div>
          </div>

          {selected && (
            <button className="btn btn-primary btn-lg spin-btn" onClick={handleUpgrade} disabled={loading || spinning}>
              {spinning ? 'ПРОВЕРКА...' : loading ? '...' : 'КРУТИТЬ!'}
            </button>
          )}

          {showResult && result && (
            <div className={`upgrade-result ${result.won ? 'win' : 'lose'}`}>
              {result.won ? (
                <div className="result-inner">
                  <div className="result-title win-title">ВЫИГРЫШ!</div>
                  <div className="result-skin">{result.won_skin?.name}</div>
                  <div className="result-price">+{result.won_skin?.price.toLocaleString()} ₽</div>
                </div>
              ) : (
                <div className="result-inner">
                  <div className="result-title lose-title">ПРОИГРЫШ</div>
                  <div className="result-skin">Скин сгорел</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="history-section">
        <h3>История апгрейдов</h3>
        {history.length === 0 ? (
          <p className="history-empty">Пока нет попыток</p>
        ) : (
          <div className="history-list">
            {history.map(h => (
              <div key={h.id} className={`history-item ${h.result}`}>
                <span className="history-result">{h.result === 'win' ? 'ВЫИГРЫШ' : 'ПРОИГРЫШ'}</span>
                <span className="history-skin">{h.staked_name}</span>
                <span className="history-mult">x{h.multiplier}</span>
                <span className="history-date">{new Date(h.created_at).toLocaleString('ru')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="upgrade-inventory">
        <h3>Инвентарь</h3>
        {items.length === 0 ? (
          <div className="empty-state">
            <p>Нет скинов в инвентаре</p>
            <a href="/marketplace" className="btn btn-primary">В Маркет</a>
          </div>
        ) : (
          <div className="skin-grid">
            {items.map(item => (
              <div
                key={item.inventory_id}
                className={`skin-card${selectedId === item.inventory_id ? ' skin-card-selected' : ''}`}
                onClick={() => toggleSkin(item.inventory_id)}
              >
                <div className="skin-image-wrap">
                  <div className="skin-image-placeholder" />
                </div>
                <div className="skin-info">
                  <div className="skin-name">{item.name}</div>
                  <div className="skin-quality-label">{item.quality}</div>
                  <div className="skin-price">{item.price.toLocaleString()} ₽</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
