import { useState, useEffect, useRef } from 'react'
import * as api from '../api'

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    if (type === 'spin') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.03, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12)
    } else if (type === 'win') {
      osc.frequency.setValueAtTime(523, ctx.currentTime)
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12)
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24)
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.36)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6)
    } else if (type === 'lose') {
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
    } else if (type === 'tick') {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2); gain2.connect(ctx.destination)
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(1500 + Math.random() * 500, ctx.currentTime)
      gain2.gain.setValueAtTime(0.02, ctx.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)
      osc2.start(ctx.currentTime); osc2.stop(ctx.currentTime + 0.03)
    } else if (type === 'applause') {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const osc3 = ctx.createOscillator()
          const gain3 = ctx.createGain()
          osc3.connect(gain3); gain3.connect(ctx.destination)
          osc3.type = 'sine'
          osc3.frequency.setValueAtTime(400 + Math.random() * 800, ctx.currentTime)
          gain3.gain.setValueAtTime(0.03, ctx.currentTime)
          gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
          osc3.start(ctx.currentTime); osc3.stop(ctx.currentTime + 0.1)
        }, i * 100)
      }
    }
  } catch {}
}

const SEGMENTS = 20

export default function Upgrade({ user, onBalanceUpdate }) {
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [mode, setMode] = useState('multiplier')
  const [value, setValue] = useState(2)
  const [spinning, setSpinning] = useState(false)
  const [wheelAngle, setWheelAngle] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [flashColor, setFlashColor] = useState(null)
  const animRef = useRef(null)
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

  const greenSegs = Math.round((chance / 100) * SEGMENTS)
  const redSegs = SEGMENTS - greenSegs
  const segAngle = 360 / SEGMENTS

  const toggleSkin = (inventoryId) => {
    if (spinning) return
    setSelectedId(prev => prev === inventoryId ? null : inventoryId)
    setResult(null); setShowResult(false); setWheelAngle(0); setFlashColor(null)
  }

  const handleUpgrade = async () => {
    if (!selectedId || loading || spinning) return
    setLoading(true); setResult(null); setShowResult(false); setFlashColor(null)

    try {
      const res = await api.upgrade(user.id, selectedId, mode, value)
      setResult(res)
      setSpinning(true)

      // Determine which segment to land on
      const segDeg = 360 / SEGMENTS
      // WIN segments are 0 to greenSegs-1, LOSE are greenSegs to SEGMENTS-1
      let targetSeg
      if (res.won) {
        targetSeg = Math.floor(Math.random() * greenSegs)
      } else {
        targetSeg = greenSegs + Math.floor(Math.random() * redSegs)
      }

      // The pointer is at the top (0 degrees).
      // For the wheel to stop with segment `targetSeg` at the pointer,
      // we need the wheel to rotate so that segment lands at 0.
      // Segment center angle = targetSeg * segDeg + segDeg/2
      // We want that to be at 0, so wheel angle = -segmentCenter
      // But we're spinning forward (increasing angle), so:
      const fullRotations = 5 + Math.floor(Math.random() * 4) // 5-8 full spins
      const landingAngle = 360 - (targetSeg * segDeg + segDeg / 2)
      const totalAngle = fullRotations * 360 + landingAngle + (Math.random() - 0.5) * segDeg * 0.6

      // Flash lights
      let flashTick = 0
      const flashInterval = setInterval(() => {
        flashTick++
        setFlashColor(flashTick % 2 === 0 ? '#ffd54f' : '#00e5ff')
      }, 120)

      const startTime = Date.now()
      const duration = 3000 + Math.random() * 1000

      let lastTickTime = 0

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Easing: cubic ease-out for realistic wheel deceleration
        const eased = 1 - Math.pow(1 - progress, 4)
        const currentAngle = totalAngle * eased
        setWheelAngle(currentAngle)

        // Tick sounds synced with segments passing the pointer
        const segsPassed = currentAngle / segDeg
        if (Math.floor(segsPassed) > Math.floor(lastTickTime / segDeg)) {
          playSound('tick')
          lastTickTime = currentAngle
        }

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate)
        } else {
          setWheelAngle(totalAngle)
          setSpinning(false)
          clearInterval(flashInterval)
          setFlashColor(null)
          setTimeout(() => {
            setShowResult(true)
            if (res.won) { playSound('win'); setTimeout(() => playSound('applause'), 300) }
            else playSound('lose')
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

  const cx = 180, cy = 180, r = 160

  // Build wheel segments
  const segments = []
  for (let i = 0; i < SEGMENTS; i++) {
    const isWin = i < greenSegs
    const startAngle = i * segAngle
    const endAngle = (i + 1) * segAngle
    const rad1 = ((startAngle - 90) * Math.PI) / 180
    const rad2 = ((endAngle - 90) * Math.PI) / 180
    const x1 = cx + r * Math.cos(rad1)
    const y1 = cy + r * Math.sin(rad1)
    const x2 = cx + r * Math.cos(rad2)
    const y2 = cy + r * Math.sin(rad2)
    const largeArc = segAngle > 180 ? 1 : 0
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2} Z`
    segments.push({
      d,
      color: isWin
        ? (i % 2 === 0 ? '#00e676' : '#00c853')
        : (i % 2 === 0 ? '#ff1744' : '#d50000'),
      label: i === Math.floor(greenSegs / 2) ? 'WIN' : (i === greenSegs + Math.floor(redSegs / 2) ? 'LOSE' : ''),
      isWin
    })
  }

  return (
    <div className="page upgrade-page">
      <h2 className="upgrade-title">Апгрейд скина</h2>

      <div className="upgrade-main">
        {selected ? (
          <div className="upgrade-selected-card">
            <div className="upgrade-selected-img">
              {selected.image_url ? (
                <img src={selected.image_url} alt={selected.name} className="skin-img" />
              ) : (
                <div className="skin-image-placeholder" />
              )}
            </div>
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

        {/* ROULETTE WHEEL */}
        <div className={`wheel-section ${flashColor ? 'flashing' : ''}`} style={flashColor ? { '--flash': flashColor } : {}}>
          <div className="wheel-container">
            {/* Outer glow ring */}
            <div className={`wheel-glow-ring ${spinning ? 'spinning' : ''}`} />

            {/* Pointer */}
            <div className="wheel-pointer">
              <svg width="30" height="40" viewBox="0 0 30 40">
                <polygon points="15,40 0,0 30,0" fill="#ffd54f" stroke="#fff" strokeWidth="1.5" filter="url(#pglow)"/>
              </svg>
            </div>

            {/* The wheel */}
            <svg className="wheel-svg" viewBox="0 0 360 360" style={{ transform: `rotate(${wheelAngle}deg)` }}>
              <defs>
                <filter id="pglow">
                  <feGaussianBlur stdDeviation="2" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <radialGradient id="hub-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1a1a3a"/>
                  <stop offset="100%" stopColor="#0d0d2b"/>
                </radialGradient>
              </defs>

              {/* Outer gold rim */}
              <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke="url(#rim-grad)" strokeWidth="8"/>
              <defs>
                <linearGradient id="rim-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffd700"/>
                  <stop offset="50%" stopColor="#b8860b"/>
                  <stop offset="100%" stopColor="#ffd700"/>
                </linearGradient>
              </defs>

              {/* Segments */}
              {segments.map((seg, i) => (
                <path key={i} d={seg.d} fill={seg.color} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5"/>
              ))}

              {/* Inner ring */}
              <circle cx={cx} cy={cy} r={r - 25} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2"/>

              {/* Center hub */}
              <circle cx={cx} cy={cy} r={30} fill="url(#hub-grad)" stroke="#ffd700" strokeWidth="2.5"/>
              <circle cx={cx} cy={cy} r={22} fill="none" stroke="rgba(255,215,0,0.3)" strokeWidth="1"/>
              <circle cx={cx} cy={cy} r={8} fill="#ffd700" filter="url(#pglow)"/>
              <circle cx={cx} cy={cy} r={3} fill="#fff"/>

              {/* Segment labels */}
              {segments.map((seg, i) => {
                if (!seg.label) return null
                const midAngle = (i + 0.5) * segAngle
                const rad = ((midAngle - 90) * Math.PI) / 180
                const lx = cx + (r - 50) * Math.cos(rad)
                const ly = cy + (r - 50) * Math.sin(rad)
                return (
                  <text
                    key={`lbl-${i}`}
                    x={lx} y={ly}
                    textAnchor="middle" dominantBaseline="central"
                    fill="#fff" fontSize="13" fontWeight="800"
                    filter="url(#pglow)"
                  >{seg.label}</text>
                )
              })}
            </svg>

            {/* Result overlay */}
            {showResult && result && (
              <div className={`wheel-result ${result.won ? 'win' : 'lose'}`}>
                <div className="result-title">{result.won ? 'ВЫИГРЫШ!' : 'ПРОИГРЫШ'}</div>
                {result.won ? (
                  <>
                    <div className="result-skin">{result.won_skin?.name}</div>
                    <div className="result-price">+{result.won_skin?.price.toLocaleString()} ₽</div>
                  </>
                ) : (
                  <div className="result-skin">Скин сгорел</div>
                )}
              </div>
            )}
          </div>

          {selected && (
            <button
              className={`btn btn-primary btn-lg spin-btn ${spinning ? 'spinning' : ''}`}
              onClick={handleUpgrade}
              disabled={loading || spinning}
            >
              {spinning ? 'КРУТИМ...' : loading ? '...' : 'КРУТИТЬ!'}
            </button>
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
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="skin-img" />
                  ) : (
                    <div className="skin-image-placeholder" />
                  )}
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
