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
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15)
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
    } else if (type === 'tick') {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2); gain2.connect(ctx.destination)
      osc2.type = 'square'
      osc2.frequency.setValueAtTime(1200 + Math.random() * 600, ctx.currentTime)
      gain2.gain.setValueAtTime(0.025, ctx.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)
      osc2.start(ctx.currentTime); osc2.stop(ctx.currentTime + 0.03)
    }
  } catch {}
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
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
  const [arrowAngle, setArrowAngle] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [leds, setLeds] = useState([])
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

  const toggleSkin = (inventoryId) => {
    if (spinning) return
    setSelectedId(prev => prev === inventoryId ? null : inventoryId)
    setResult(null); setShowResult(false); setArrowAngle(0)
  }

  const handleUpgrade = async () => {
    if (!selectedId || loading || spinning) return
    setLoading(true); setResult(null); setShowResult(false)

    try {
      const res = await api.upgrade(user.id, selectedId, mode, value)
      setResult(res)
      setSpinning(true)

      // WIN arc starts at 0° (top), goes clockwise for chance%
      // LOSE arc starts at chance%, goes for 100-chance%
      // WIN center angle = chance / 2
      // LOSE center angle = chance + (100 - chance) / 2
      const winCenter = chance / 2
      const loseCenter = chance + (100 - chance) / 2
      const targetAngle = res.won ? winCenter : loseCenter

      // Randomize within the sector
      const sectorSize = res.won ? chance : (100 - chance)
      const sectorStart = res.won ? 0 : chance
      const finalAngle = sectorStart + Math.random() * sectorSize

      // The arrow sweeps 1440 + random degrees (4 full spins + random)
      const fullSpins = 4 + Math.floor(Math.random() * 3)
      const totalDegrees = fullSpins * 360 + finalAngle

      // LED animation
      let ledTick = 0
      const ledInterval = setInterval(() => {
        ledTick++
        const lit = []
        for (let i = 0; i < 16; i++) {
          lit.push((i + ledTick) % 16 < 4)
        }
        setLeds([...lit])
      }, 80)

      const startTime = Date.now()
      const duration = 2500 + Math.random() * 500

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 4)
        const currentAngle = totalDegrees * eased
        setArrowAngle(currentAngle)

        if (progress < 1) {
          // Tick sounds - speed up then slow down
          const tickInterval_ = 60 + 140 * (1 - progress)
          if (!tickRef.current || Date.now() - tickRef.current > tickInterval_) {
            playSound('tick')
            tickRef.current = Date.now()
          }
          animRef.current = requestAnimationFrame(animate)
        } else {
          setArrowAngle(totalDegrees)
          setSpinning(false)
          clearInterval(ledInterval)
          setTimeout(() => {
            setShowResult(true)
            if (res.won) playSound('win')
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

  const winAngle = (chance / 100) * 360
  const cx = 150, cy = 150, r = 130

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

        {/* WHEEL OF FORTUNE */}
        <div className="wheel-section">
          <div className="wheel-container">
            {/* LED ring */}
            <div className="wheel-leds">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className={`wheel-led ${leds[i] ? 'lit' : ''}`}
                  style={{
                    transform: `rotate(${i * 22.5}deg) translateY(-142px)`,
                  }}
                />
              ))}
            </div>

            <svg className="wheel-svg" viewBox="0 0 300 300">
              <defs>
                <filter id="wglow">
                  <feGaussianBlur stdDeviation="3" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="wglow-arrow">
                  <feGaussianBlur stdDeviation="2" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <radialGradient id="wheel-bg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1a1a3a"/>
                  <stop offset="100%" stopColor="#0a0a1a"/>
                </radialGradient>
              </defs>

              {/* Wheel shadow */}
              <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="8" opacity="0.5"/>

              {/* WIN sector (green) */}
              <path
                d={describeArc(cx, cy, r, 0, winAngle)}
                fill={`url(#${spinning ? 'win-grad-active' : 'win-grad'})`}
                stroke="rgba(0,230,118,0.4)"
                strokeWidth="1"
              />
              <defs>
                <linearGradient id="win-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00e676"/>
                  <stop offset="100%" stopColor="#00c853"/>
                </linearGradient>
                <linearGradient id="win-grad-active" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#69f0ae"/>
                  <stop offset="100%" stopColor="#00e676"/>
                </linearGradient>
              </defs>

              {/* LOSE sector (red) */}
              <path
                d={describeArc(cx, cy, r, winAngle, 360)}
                fill={`url(#${spinning ? 'lose-grad-active' : 'lose-grad'})`}
                stroke="rgba(255,23,68,0.4)"
                strokeWidth="1"
              />
              <defs>
                <linearGradient id="lose-grad" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff1744"/>
                  <stop offset="100%" stopColor="#d50000"/>
                </linearGradient>
                <linearGradient id="lose-grad-active" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff5252"/>
                  <stop offset="100%" stopColor="#ff1744"/>
                </linearGradient>
              </defs>

              {/* Wheel border */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2"/>
              <circle cx={cx} cy={cy} r={r - 15} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>

              {/* WIN text */}
              <text
                x={cx + r * 0.55 * Math.cos(((winAngle / 4) - 90) * Math.PI / 180)}
                y={cy + r * 0.55 * Math.sin(((winAngle / 4) - 90) * Math.PI / 180)}
                textAnchor="middle" dominantBaseline="central"
                fill="#fff" fontSize="16" fontWeight="800"
                filter="url(#wglow)"
              >WIN</text>
              <text
                x={cx + r * 0.55 * Math.cos(((winAngle / 4) - 90) * Math.PI / 180)}
                y={cy + r * 0.55 * Math.sin(((winAngle / 4) - 90) * Math.PI / 180) + 18}
                textAnchor="middle" dominantBaseline="central"
                fill="#fff" fontSize="11" fontWeight="600"
              >{chance}%</text>

              {/* LOSE text */}
              <text
                x={cx + r * 0.6 * Math.cos(((winAngle + (360 - winAngle) / 4) - 90) * Math.PI / 180)}
                y={cy + r * 0.6 * Math.sin(((winAngle + (360 - winAngle) / 4) - 90) * Math.PI / 180)}
                textAnchor="middle" dominantBaseline="central"
                fill="#fff" fontSize="14" fontWeight="800"
                filter="url(#wglow)"
              >LOSE</text>
              <text
                x={cx + r * 0.6 * Math.cos(((winAngle + (360 - winAngle) / 4) - 90) * Math.PI / 180)}
                y={cy + r * 0.6 * Math.sin(((winAngle + (360 - winAngle) / 4) - 90) * Math.PI / 180) + 16}
                textAnchor="middle" dominantBaseline="central"
                fill="#fff" fontSize="10" fontWeight="600"
              >{100 - chance}%</text>

              {/* Center hub */}
              <circle cx={cx} cy={cy} r={22} fill="#0a0a2a" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
              <circle cx={cx} cy={cy} r={18} fill="none" stroke="rgba(255,213,79,0.3)" strokeWidth="1"/>

              {/* SPINNING ARROW */}
              <g transform={`rotate(${arrowAngle}, ${cx}, ${cy})`}>
                <polygon
                  points={`${cx},${cy - 22} ${cx - 8},${cy + 10} ${cx},${cy + 6} ${cx + 8},${cy + 10}`}
                  fill="#ffd54f"
                  stroke="#fff"
                  strokeWidth="1"
                  filter="url(#wglow-arrow)"
                />
                {/* Arrow shaft */}
                <rect x={cx - 2} y={cy - 22} width={4} height={32} rx={2} fill="#ffd54f" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                {/* Arrow tip */}
                <polygon
                  points={`${cx - 6},${cy - 22} ${cx},${cy - 32} ${cx + 6},${cy - 22}`}
                  fill="#ffd54f"
                  stroke="#fff"
                  strokeWidth="0.5"
                  filter="url(#wglow-arrow)"
                />
              </g>

              {/* Center dot */}
              <circle cx={cx} cy={cy} r={5} fill="#ffd54f" filter="url(#wglow)"/>
              <circle cx={cx} cy={cy} r={2} fill="#fff"/>

              {/* Fixed pointer at top */}
              <polygon
                points={`${cx},${cy - r - 12} ${cx - 8},${cy - r + 2} ${cx + 8},${cy - r + 2}`}
                fill="#ffd54f"
                stroke="#fff"
                strokeWidth="1"
                filter="url(#wglow)"
              />
            </svg>

            {/* Result overlay */}
            {showResult && result && (
              <div className={`wheel-result ${result.won ? 'win' : 'lose'}`}>
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

          {selected && (
            <button
              className={`btn btn-primary btn-lg spin-btn ${spinning ? 'spinning' : ''}`}
              onClick={handleUpgrade}
              disabled={loading || spinning}
            >
              {spinning ? 'КРУТИМ...' : loading ? '...' : 'КРУТИТЬ КОЛЕСО!'}
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
