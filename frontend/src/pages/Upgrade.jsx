import { useState, useEffect, useRef } from 'react'
import * as api from '../api'

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    if (type === 'whoosh') {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
    } else if (type === 'shatter') {
      osc.type = 'square'
      osc.frequency.setValueAtTime(1500, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2)
    } else if (type === 'tick') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1200 + Math.random() * 400, ctx.currentTime)
      gain.gain.setValueAtTime(0.03, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.04)
    } else if (type === 'win') {
      osc.frequency.setValueAtTime(523, ctx.currentTime)
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12)
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24)
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.36)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6)
    } else if (type === 'lose') {
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
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
  const [animating, setAnimating] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [needlePos, setNeedlePos] = useState(0)
  const [shattered, setShattered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [particles, setParticles] = useState([])
  const animFrameRef = useRef(null)
  const tickRef = useRef(null)

  const fetchData = () => {
    api.getInventory(user.id).then(setItems).catch(() => {})
    api.getUpgradeHistory(user.id).then(setHistory).catch(() => {})
  }
  useEffect(() => { fetchData() }, [])

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

  const toggleSkin = (inventoryId) => {
    if (animating) return
    setSelectedId(prev => prev === inventoryId ? null : inventoryId)
    setResult(null); setShowResult(false); setPhase('idle'); setNeedlePos(0); setShattered(false)
  }

  const spawnParticles = (count, x, y) => {
    const p = []
    for (let i = 0; i < count; i++) {
      p.push({
        id: Math.random(), x, y,
        vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 10 - 5,
        life: 1, color: Math.random() > 0.5 ? '#00e5ff' : '#ffd54f'
      })
    }
    setParticles(prev => [...prev, ...p])
    const interval = setInterval(() => {
      setParticles(prev => {
        const next = prev.map(p2 => ({ ...p2, x: p2.x + p2.vx, y: p2.y + p2.vy, vy: p2.vy + 0.3, life: p2.life - 0.02 })).filter(p2 => p2.life > 0)
        if (next.length === 0) clearInterval(interval)
        return next
      })
    }, 30)
  }

  const handleUpgrade = async () => {
    if (!selectedId || loading || animating) return
    setLoading(true); setResult(null); setShowResult(false); setShattered(false); setParticles([])

    try {
      const res = await api.upgrade(user.id, selectedId, mode, value)
      setResult(res)
      setAnimating(true)
      setPhase('shoot')

      // Phase 1: Needle shoots up past 100%
      playSound('whoosh')
      let startTime = Date.now()
      const shootDuration = 500
      const overshoot = 120

      const animateShoot = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / shootDuration, 1)
        const eased = 1 - Math.pow(1 - progress, 2)
        const pos = overshoot * eased
        setNeedlePos(pos)

        if (progress >= 1) {
          // Shatter effect
          setShattered(true)
          playSound('shatter')
          spawnParticles(30, 50, 10)
          setTimeout(() => {
            setShattered(false)
            setPhase('drop')
            // Phase 2: Drop back to 0
            startTime = Date.now()
            const dropDuration = 300
            const animateDrop = () => {
              const elapsed2 = Date.now() - startTime
              const progress2 = Math.min(elapsed2 / dropDuration, 1)
              const eased2 = 1 - Math.pow(1 - progress2, 3)
              setNeedlePos(overshoot * (1 - eased2))
              if (progress2 < 1) {
                animFrameRef.current = requestAnimationFrame(animateDrop)
              } else {
                setNeedlePos(0)
                setPhase('rise')
                // Phase 3: Rise to result
                const target = res.won ? chance + Math.random() * 3 : chance + 10 + Math.random() * (95 - chance - 10)
                const finalPos = Math.min(target, 100)
                startTime = Date.now()
                const riseDuration = 2000

                let tickCount = 0
                const tickInterval = setInterval(() => {
                  playSound('tick')
                  tickCount++
                  if (tickCount > 30) clearInterval(tickInterval)
                }, 80)
                tickRef.current = tickInterval

                const animateRise = () => {
                  const elapsed3 = Date.now() - startTime
                  const progress3 = Math.min(elapsed3 / riseDuration, 1)
                  const eased3 = 1 - Math.pow(1 - progress3, 3)
                  const pos3 = finalPos * eased3
                  setNeedlePos(pos3)
                  if (progress3 < 1) {
                    animFrameRef.current = requestAnimationFrame(animateRise)
                  } else {
                    setNeedlePos(finalPos)
                    setAnimating(false)
                    clearInterval(tickInterval)
                    setPhase('idle')
                    setTimeout(() => {
                      setShowResult(true)
                      if (res.won) playSound('win')
                      else playSound('lose')
                      if (!res.won) setSelectedId(null)
                      fetchData()
                      onBalanceUpdate()
                    }, 400)
                  }
                }
                animateRise()
              }
            }
            animateDrop()
          }, 200)
          return
        }
        animFrameRef.current = requestAnimationFrame(animateShoot)
      }
      animateShoot()
    } catch (err) { alert(err.message); setAnimating(false) }
    setLoading(false)
  }

  return (
    <div className="page upgrade-page">
      <h2 className="upgrade-title">Апгрейд скина</h2>

      <div className="upgrade-main">
        {selected ? (
          <div className="upgrade-selected-card">
            <div className="upgrade-selected-name">{selected.name}</div>
            <div className="upgrade-selected-meta">{selected.rarity} · {selected.quality}</div>
            <div className="upgrade-selected-price">{selected.price.toLocaleString()} ₽</div>
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
              [30, 50, 75].map(v => (
                <button key={v} className={`preset-btn ${value === v ? 'active' : ''}`} onClick={() => setValue(v)}>{v}%</button>
              ))
            ) : (
              [2, 4, 8].map(v => (
                <button key={v} className={`preset-btn ${value === v ? 'active' : ''}`} onClick={() => setValue(v)}>{v}x</button>
              ))
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

        {/* CARNIVAL GAUGE */}
        <div className="gauge-section">
          <div className="gauge-container">
            <div className="gauge-track">
              <div className="gauge-green" style={{ height: `${chance}%` }} />
              <div className="gauge-red" style={{ height: `${100 - chance}%` }} />
              <div className={`gauge-divider ${animating ? 'glow' : ''}`} style={{ bottom: `${chance}%` }} />
              <div className="gauge-glass" />
              {shattered && <div className="gauge-shards" />}
              {particles.map(p => (
                <div key={p.id} className="particle" style={{
                  left: `${p.x}%`, top: `${p.y}%`, background: p.color, opacity: p.life
                }} />
              ))}
            </div>
            <div className="gauge-needle-wrap" style={{ bottom: `${needlePos}%` }}>
              <div className={`gauge-needle ${animating ? 'active' : ''}`} />
              <div className="gauge-needle-tip" />
            </div>
            <div className="gauge-markers">
              {[0, 25, 50, 75, 100].map(m => (
                <div key={m} className="gauge-marker" style={{ bottom: `${m}%` }}>
                  <span>{m}%</span>
                </div>
              ))}
            </div>
          </div>

          {selected && (
            <button
              className={`btn btn-primary btn-lg spin-btn ${animating ? 'spinning' : ''}`}
              onClick={handleUpgrade}
              disabled={loading || animating}
            >
              {animating ? 'ПРОВЕРКА...' : loading ? '...' : 'КРУТИТЬ!'}
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
