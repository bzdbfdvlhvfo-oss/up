import { useState, useEffect, useRef } from 'react'
import * as api from '../api'

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    if (type === 'tick') {
      osc.type = 'square'; osc.frequency.setValueAtTime(1200 + Math.random() * 600, ctx.currentTime)
      gain.gain.setValueAtTime(0.012, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.02)
    } else if (type === 'win') {
      [523, 659, 784, 1047].forEach((f, i) => { setTimeout(() => {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain()
        o2.connect(g2); g2.connect(ctx.destination)
        o2.frequency.setValueAtTime(f, ctx.currentTime); g2.gain.setValueAtTime(0.06, ctx.currentTime); g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.3)
      }, i * 120) })
    } else if (type === 'lose') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(250, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.5)
      gain.gain.setValueAtTime(0.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
    }
  } catch {}
}

export default function Upgrade({ user, onBalanceUpdate }) {
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('multiplier')
  const [value, setValue] = useState(2)
  const [spinning, setSpinning] = useState(false)
  const [arrowAngle, setArrowAngle] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [targetImg, setTargetImg] = useState('')
  const [targetName, setTargetName] = useState('')
  const [targetPrice, setTargetPrice] = useState(0)
  const [flash, setFlash] = useState(false)
  const animRef = useRef(null)
  const tickTimers = useRef([])

  const fetchData = () => {
    api.getInventory(user.id).then(setItems).catch(() => {})
  }
  useEffect(() => { fetchData() }, [])
  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); tickTimers.current.forEach(clearTimeout) }, [])

  const selected = items.find(i => i.inventory_id === selectedId)

  const calcChance = () => {
    if (!selected) return 0
    if (mode === 'chance') return Math.min(95, Math.max(1, value))
    return Math.round((1 / Math.min(10, Math.max(1.01, value))) * 98 * 100) / 100
  }
  const chance = calcChance()
  const multiplier = mode === 'multiplier' ? value : Math.round((100 / Math.min(95, Math.max(1, value))) * 100) / 100
  const potWin = selected ? Math.round(selected.price * multiplier) : 0

  useEffect(() => {
    if (!selected || !multiplier) { setTargetName(''); setTargetPrice(0); setTargetImg(''); return }
    const targetMin = Math.round(selected.price * multiplier * 0.9)
    const targetMax = Math.round(selected.price * multiplier * 1.4)
    api.getSkins({ min: targetMin, max: targetMax }).then(skins => {
      if (skins.length > 0) {
        const pick = skins[Math.floor(Math.random() * Math.min(skins.length, 5))]
        setTargetName(pick.name); setTargetPrice(pick.price); setTargetImg(pick.image_url || '')
      } else {
        setTargetName(`~${(selected.price * multiplier).toLocaleString()} ₽`);
        setTargetPrice(selected.price * multiplier); setTargetImg('')
      }
    }).catch(() => {})
  }, [selectedId, multiplier])

  const toggleSkin = (invId) => {
    if (spinning) return
    setSelectedId(prev => prev === invId ? null : invId)
    setResult(null); setShowResult(false); setArrowAngle(0)
  }

  const handleUpgrade = async () => {
    if (!selectedId || loading || spinning) return
    setLoading(true); setResult(null); setShowResult(false); setFlash(false)
    try {
      const res = await api.upgrade(user.id, selectedId, mode, value)
      setResult(res)

      const winStart = 0
      const winEnd = chance
      const loseEnd = 100
      const targetAngle = res.won
        ? winStart + Math.random() * (winEnd - winStart - 5)
        : (winEnd + 5) + Math.random() * (loseEnd - winEnd - 10)

      const fullSpins = 5 + Math.floor(Math.random() * 3)
      const totalDegrees = fullSpins * 360 + (targetAngle / 100) * 360

      setSpinning(true)
      const startTime = Date.now()
      const duration = 2500 + Math.random() * 600

      setFlash(true)

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3.5)
        const currentAngle = totalDegrees * eased
        setArrowAngle(currentAngle)

        // Ticks
        const segDeg = currentAngle % 18
        if (segDeg < 2) {
          if (!tickTimers.current.some(t => Date.now() - t < 200)) {
            playSound('tick')
            tickTimers.current = [Date.now(), ...tickTimers.current].slice(0, 3)
          }
        }

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate)
        } else {
          setArrowAngle(totalDegrees)
          setSpinning(false)
          setFlash(false)
          setTimeout(() => {
            setShowResult(true)
            if (res.won) playSound('win')
            else playSound('lose')
            if (!res.won) setSelectedId(null)
            fetchData(); onBalanceUpdate()
          }, 500)
        }
      }
      animate()
    } catch (err) { alert(err.message); setSpinning(false); setFlash(false) }
    setLoading(false)
  }

  const cx = 200, cy = 200, r = 185
  const SEG = 20
  const greenSegs = Math.max(1, Math.round((chance / 100) * SEG))
  const segAngle = 360 / SEG
  const segs = []
  for (let i = 0; i < SEG; i++) {
    const isWin = i < greenSegs
    const a1 = ((i * segAngle - 90) * Math.PI) / 180
    const a2 = (((i + 1) * segAngle - 90) * Math.PI) / 180
    const d = `M ${cx} ${cy} L ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 0 0 ${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)} Z`
    segs.push({ d, color: isWin ? '#4a2800' : '#1a1a1a', stroke: isWin ? 'var(--accent)' : '#333', label: isWin ? 'WIN' : 'LOSE', isWin })
  }

  return (
    <div className="page upgrade-page">
      <div className="upgrade-header">
        <h2 className="upgrade-title">Апгрейд</h2>
        <div className="upgrade-subtitle">Выбери скин и крути колесо</div>
      </div>

      <div className="upgrade-content">
        <div className="upgrade-left">
          {selected ? (
            <div className="upgrade-selected-card">
              <div className="us-img">{selected.image_url ? <img src={selected.image_url} alt=""/> : <div className="skin-ph"/>}</div>
              <div className="us-name">{selected.name}</div>
              <div className="us-meta">{selected.rarity} · {selected.quality}</div>
              <div className="us-price">{selected.price.toLocaleString()} ₽</div>
            </div>
          ) : (
            <div className="upgrade-selected-empty">Выбери скин из инвентаря справа</div>
          )}

          <div className="upgrade-controls">
            <div className="mode-tabs">
              <button className={`mtab ${mode === 'chance' ? 'active' : ''}`} onClick={() => setMode('chance')}>Шанс</button>
              <button className={`mtab ${mode === 'multiplier' ? 'active' : ''}`} onClick={() => setMode('multiplier')}>Множитель</button>
            </div>
            <div className="preset-row">
              {(mode === 'chance' ? [30, 50, 75] : [2, 4, 8]).map(v => (
                <button key={v} className={`pbtn ${value === v ? 'active' : ''}`} onClick={() => setValue(v)}>
                  {v}{mode === 'chance' ? '%' : 'x'}
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="upgrade-stats">
              <div className="us-item"><span className="us-lbl">Шанс</span><span className="us-val chance-clr">{chance}%</span></div>
              <div className="us-item"><span className="us-lbl">Множитель</span><span className="us-val">{multiplier}x</span></div>
              <div className="us-item"><span className="us-lbl">Выигрыш</span><span className="us-val pot-clr">{potWin.toLocaleString()} ₽</span></div>
            </div>
          )}

          {selected && (
            <button className={`spin-btn ${spinning ? 'spinning' : ''}`} onClick={handleUpgrade} disabled={loading || spinning}>
              {spinning ? 'ВРАЩЕНИЕ...' : loading ? '...' : 'КРУТИТЬ'}
            </button>
          )}
        </div>

        <div className="upgrade-center">
          <div className={`wheel-wrap ${flash ? 'flashing' : ''}`}>
            <svg className="wheel-svg" viewBox="0 0 400 400">
              <defs>
                <radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1a1a1a"/><stop offset="100%" stopColor="#0d0d0d"/>
                </radialGradient>
                <filter id="wShad"><feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#000" floodOpacity="0.6"/></filter>
                <filter id="wGlow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="#333" strokeWidth="5"/>
              <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.3"/>
              {segs.map((s, i) => {
                const glow = s.isWin ? { filter: 'url(#wGlow)' } : {}
                return <path key={i} d={s.d} fill={s.color} stroke={s.stroke} strokeWidth="1.5" {...glow}/>
              })}
              <circle cx={cx} cy={cy} r={32} fill="#1a1a1a" stroke="#444" strokeWidth="2"/>
              <circle cx={cx} cy={cy} r={24} fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.5"/>
              <circle cx={cx} cy={cy} r={9} fill="var(--accent)"/>
              <circle cx={cx} cy={cy} r={4} fill="#fff"/>
              {/* Spinning Knife/Arrow */}
              <g transform={`rotate(${arrowAngle}, ${cx}, ${cy})`} filter="url(#wShad)">
                <polygon points={`${cx - 6},${cy - 32} ${cx},${cy - 170} ${cx + 6},${cy - 32}`}
                  fill="var(--accent)" stroke="#fff" strokeWidth="0.5"/>
                <polygon points={`${cx - 4},${cy - 170} ${cx},${cy - 178} ${cx + 4},${cy - 170}`}
                  fill="#fff"/>
              </g>
            </svg>
          </div>

          <div className="target-scale-wrap">
            <div className="target-scale">
              <div className="ts-fill" style={{ width: `${Math.min(chance, 95)}%` }}>
                <div className="ts-glow" />
              </div>
              {targetName && (
                <div className="ts-target">
                  <div className="ts-target-img">
                    {targetImg ? <img src={targetImg} alt=""/> : <div className="skin-ph sm"/>}
                  </div>
                  <div className="ts-target-info">
                    <div className="ts-target-name">{targetName}</div>
                    <div className="ts-target-price">{targetPrice.toLocaleString()} ₽</div>
                  </div>
                </div>
              )}
            </div>
            <div className="ts-labels">
              <span>0%</span>
              <span className="ts-chance-label" style={{ left: `${chance}%` }}>{chance}%</span>
              <span>100%</span>
            </div>
          </div>

          {showResult && result && (
            <div className={`wheel-result ${result.won ? 'win' : 'lose'}`}>
              <div className="ur-title">{result.won ? 'ВЫИГРЫШ' : 'ПРОИГРЫШ'}</div>
              {result.won ? (
                <div className="ur-detail">
                  <div className="ur-skin">{result.won_skin?.name}</div>
                  <div className="ur-price">+{result.won_skin?.price.toLocaleString()} ₽</div>
                </div>
              ) : (
                <div className="ur-detail">Скин сгорел</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="upgrade-inventory">
        <h3>Инвентарь</h3>
        {items.length === 0 ? (
          <div className="empty-state"><p>Нет скинов для апгрейда</p><a href="/marketplace" className="btn btn-primary btn-sm">Маркет</a></div>
        ) : (
          <div className="skin-grid">
            {items.map(item => (
              <div key={item.inventory_id} className={`skin-card${selectedId === item.inventory_id ? ' selected' : ''}`}
                onClick={() => toggleSkin(item.inventory_id)}>
                <div className="skin-img-wrap">
                  {item.image_url ? <img src={item.image_url} alt=""/> : <div className="skin-ph"/>}
                </div>
                <div className="skin-info">
                  <div className="skin-name">{item.name}</div>
                  <div className="skin-ql">{item.quality}</div>
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
