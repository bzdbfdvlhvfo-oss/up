import { useState, useEffect, useRef } from 'react'
import * as api from '../api'
import SkinImage from '../components/SkinImage'

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (type === 'spin') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(80, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2)
    } else if (type === 'tick') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(120 + Math.random() * 80, ctx.currentTime)
      gain.gain.setValueAtTime(0.03, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.04)
    } else if (type === 'win') {
      [60, 40, 30].forEach((f, i) => { setTimeout(() => {
        const o = ctx.createOscillator(); const g = ctx.createGain()
        o.type = 'sawtooth'; o.frequency.setValueAtTime(150 - i * 30, ctx.currentTime)
        o.frequency.exponentialRampToValueAtTime(300 - i * 60, ctx.currentTime + 0.5)
        g.gain.setValueAtTime(0.07 - i * 0.02, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        o.connect(g); g.connect(ctx.destination)
        o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.5)
      }, i * 180) })
    } else if (type === 'lose') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5)
      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.connect(gain); gain.connect(ctx.destination)
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
  const [showResult, setShowResult] = useState(false)
  const [targetImg, setTargetImg] = useState('')
  const [targetName, setTargetName] = useState('')
  const [targetPrice, setTargetPrice] = useState(0)
  const [flash, setFlash] = useState(false)
  const [winGlow, setWinGlow] = useState(false)
  const [winSkins, setWinSkins] = useState([])
  const [skinFilter, setSkinFilter] = useState('all')
  const [spinSpeed, setSpinSpeed] = useState('fast')
  const [targetSkins, setTargetSkins] = useState([])
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [shake, setShake] = useState(false)
  const arrowEl = useRef(null)
  const animRef = useRef(null)
  const tickTimers = useRef([])
  const shakeRef = useRef(null)

  const fetchData = () => {
    api.getInventory(user.id).then(setItems).catch(() => {})
  }
  useEffect(() => { fetchData() }, [])
  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); tickTimers.current.forEach(clearTimeout) }, [])

  const filteredItems = items.filter(i => {
    if (skinFilter === 'all') return true
    if (skinFilter === 'skin') return !i.category || i.category === 'skin' || i.category === ''
    if (skinFilter === 'sticker') return i.category === 'sticker'
    if (skinFilter === 'keychain') return i.category === 'keychain'
    return true
  })

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
    if (!selected || !multiplier) { setTargetName(''); setTargetPrice(0); setTargetImg(''); setTargetSkins([]); setSelectedTarget(null); return }
    const targetMin = Math.round(selected.price * multiplier * 0.9)
    const targetMax = Math.round(selected.price * multiplier * 1.4)
    api.getSkins({ min: targetMin, max: targetMax }).then(skins => {
      setTargetSkins(skins)
      if (skins.length > 0) {
        // Pre-select first target or keep existing selection if still valid
        const keep = selectedTarget && skins.find(s => s.id === selectedTarget.id)
        if (keep) {
          setTargetName(keep.name); setTargetPrice(keep.price); setTargetImg(keep.image_url || '')
        } else {
          const pick = skins[Math.floor(Math.random() * Math.min(skins.length, 5))]
          setSelectedTarget(null)
          setTargetName(pick.name); setTargetPrice(pick.price); setTargetImg(pick.image_url || '')
        }
      } else {
        setTargetName(`~${(selected.price * multiplier).toLocaleString()} ₽`);
        setTargetPrice(selected.price * multiplier); setTargetImg('')
      }
    }).catch(() => {})
  }, [selectedId, multiplier])

  const toggleSkin = (invId) => {
    if (spinning) return
    setSelectedId(prev => prev === invId ? null : invId)
    setResult(null); setShowResult(false)
  }

  const handleUpgrade = async () => {
    if (!selectedId || loading || spinning) return
    setLoading(true); setResult(null); setShowResult(false); setFlash(false); setWinGlow(false); setWinSkins([])
    setShake(false)

    // Fetch some random skins for the win scatter effect
    let scatterSkins = []
    try {
      const allSkins = await api.getSkins({})
      scatterSkins = allSkins.sort(() => Math.random() - 0.5).slice(0, 8)
    } catch {}

    try {
      const targetSkinId = selectedTarget ? selectedTarget.id : undefined
      const res = await api.upgrade(user.id, selectedId, mode, value, targetSkinId)
      setResult(res)

      const winStart = 0
      const winEnd = chance
      const loseEnd = 100
      const targetAngle = res.won
        ? winStart + Math.random() * (winEnd - winStart - 5)
        : (winEnd + 5) + Math.random() * (loseEnd - winEnd - 10)

      const fullSpins = spinSpeed === 'slow' ? 3 + Math.floor(Math.random() * 2) : 5 + Math.floor(Math.random() * 3)
      const totalDegrees = fullSpins * 360 + (targetAngle / 100) * 360

      setSpinning(true)
      setShake(true)
      playSound('spin')
      const startTime = Date.now()
      const duration = spinSpeed === 'slow' ? 3500 + Math.random() * 500 : 2000 + Math.random() * 400

      setFlash(true)

      let lastTickAngle = -1
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Multi-stage: fast start → cruise → long deceleration with slight bounce
        let eased
        if (progress < 0.15) {
          eased = 2.5 * progress * progress
        } else if (progress < 0.45) {
          eased = 0.056 + 1.3 * (progress - 0.15)
        } else {
          const t = (progress - 0.45) / 0.55
          eased = 0.446 + 0.56 * t - 0.02 * Math.sin(t * Math.PI * 2.5)
        }
        const currentAngle = totalDegrees * eased
        if (arrowEl.current) {
          arrowEl.current.style.transform = `rotate(${currentAngle}deg)`
        }

        // Tick sound that gradually slows down
        const tickAngle = Math.floor(currentAngle / 18)
        if (tickAngle !== lastTickAngle) {
          lastTickAngle = tickAngle
          const tickGap = Date.now() - (tickTimers.current[0] || 0)
          if (tickGap > 50) {
            playSound('tick')
            tickTimers.current = [Date.now(), ...tickTimers.current].slice(0, 3)
          }
        }

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate)
        } else {
          if (arrowEl.current) {
            arrowEl.current.style.transform = `rotate(${totalDegrees}deg)`
          }
          // Flash stop + brief continued shake
          setSpinning(false)
          setFlash(false)
          setTimeout(() => setShake(false), 300)
          setTimeout(() => {
            setShowResult(true)
            if (res.won) {
              playSound('win')
              setWinGlow(true)
              if (scatterSkins.length) {
                setWinSkins(scatterSkins.map((s, i) => ({
                  id: i, left: 5 + Math.random() * 90, delay: Math.random() * 0.5,
                  img: s.image_url, dur: 2 + Math.random() * 2, name: s.name,
                })))
              }
              setTimeout(() => { setWinGlow(false); setWinSkins([]) }, 4500)
            } else {
              playSound('lose')
            }
            setSelectedId(null)
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
              <div className="us-img"><SkinImage src={selected.image_url} alt={selected.name} /></div>
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
              {(mode === 'chance' ? [20, 30, 50, 70, 85] : [1.5, 2, 3, 5, 8]).map(v => (
                <button key={v} className={`pbtn ${value === v ? 'active' : ''}`} onClick={() => setValue(v)}>
                  {v}{mode === 'chance' ? '%' : 'x'}
                </button>
              ))}
            </div>
          </div>

          <div className="spin-options">
            <div className="preset-row">
              <button className={`pbtn sm ${spinSpeed === 'slow' ? 'active' : ''}`} onClick={() => setSpinSpeed('slow')}>Медленно</button>
              <button className={`pbtn sm ${spinSpeed === 'fast' ? 'active' : ''}`} onClick={() => setSpinSpeed('fast')}>Быстро</button>
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
          <div className={`wheel-wrap ${flash ? 'flashing' : ''} ${winGlow ? 'win-glow' : ''}`}>
            <svg className="wheel-svg" viewBox="0 0 400 400">
              <defs>
                <radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1a1a1a"/><stop offset="100%" stopColor="#0d0d0d"/>
                </radialGradient>
                <radialGradient id="hubGrad" cx="40%" cy="35%" r="60%">
                  <stop offset="0%" stopColor="#555"/><stop offset="100%" stopColor="#111"/>
                </radialGradient>
                <filter id="wShad"><feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#000" floodOpacity="0.6"/></filter>
                <filter id="wGlow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <linearGradient id="winGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4a2800"/><stop offset="100%" stopColor="#2a1500"/>
                </linearGradient>
                <linearGradient id="loseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a1a1a"/><stop offset="100%" stopColor="#0d0d0d"/>
                </linearGradient>
              </defs>
              <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="#2a2a2a" strokeWidth="6"/>
              <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.25"/>
              {segs.map((s, i) => {
                const glow = s.isWin ? { filter: 'url(#wGlow)' } : {}
                return <path key={i} d={s.d} fill={s.color} stroke={s.stroke} strokeWidth="1" {...glow}/>
              })}
              {/* Outer ring dots */}
              {Array.from({length: 20}).map((_, i) => {
                const angle = ((i * segAngle - 90) * Math.PI) / 180
                return <circle key={i} cx={cx + (r - 3) * Math.cos(angle)} cy={cy + (r - 3) * Math.sin(angle)} r="2" fill="#555"/>
              })}
              {/* Center hub */}
              <circle cx={cx} cy={cy} r={36} fill="url(#hubGrad)" stroke="#555" strokeWidth="2"/>
              <circle cx={cx} cy={cy} r={28} fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.4"/>
              <circle cx={cx} cy={cy} r={18} fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.6"/>
              <circle cx={cx} cy={cy} r={8} fill="var(--accent)"/>
              <circle cx={cx} cy={cy} r={20} fill="none" stroke="rgba(255,143,0,0.08)" strokeWidth="12"/>
              {/* Bolt holes */}
              {[0, 60, 120, 180, 240, 300].map((a, i) => {
                const rad = (a * Math.PI) / 180
                return (
                  <g key={i}>
                    <circle cx={cx + 22 * Math.cos(rad)} cy={cy + 22 * Math.sin(rad)} r="3.5" fill="#333" stroke="#555" strokeWidth="0.5"/>
                    <circle cx={cx + 22 * Math.cos(rad)} cy={cy + 22 * Math.sin(rad)} r="1.5" fill="#666"/>
                  </g>
                )
              })}
            </svg>
            <div ref={arrowEl} className="wheel-arrow" />
          </div>

          {targetSkins.length > 1 && !spinning && !showResult && (
            <div className="target-picker">
              <h4>Выбери целевой скин (нажми чтобы выбрать)</h4>
              <div className="target-grid">
                {targetSkins.slice(0, 20).map(s => (
                  <div key={s.id}
                    className={`target-option${selectedTarget?.id === s.id ? ' selected' : ''}`}
                    onClick={() => {
                      setSelectedTarget(s)
                      setTargetName(s.name)
                      setTargetPrice(s.price)
                      setTargetImg(s.image_url || '')
                    }}
                  >
                    <div className="target-option-img">
                      <SkinImage src={s.image_url} alt={s.name} />
                    </div>
                    <div className="target-option-name">{s.name}</div>
                    <div className="target-option-price">{s.price.toLocaleString()} ₽</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="target-scale-wrap">
            <div className="target-scale">
              <div className="ts-fill" style={{ width: `${Math.min(chance, 95)}%` }}>
                <div className="ts-glow" />
              </div>
              {targetName && (
                <div className="ts-target">
                  <div className="ts-target-img">
                    <SkinImage src={targetImg} alt="" />
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
              <span className="ts-chance-label" style={{ left: `${Math.min(chance, 95)}%` }}>{chance}%</span>
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
        <div className="inv-filter-row">
          <h3>Инвентарь</h3>
          <div className="filter-chips">
            {['all', 'skin', 'sticker', 'keychain'].map(f => (
              <button key={f} className={`chip ${skinFilter === f ? 'active' : ''}`} onClick={() => setSkinFilter(f)}>
                {f === 'all' ? 'Все' : f === 'skin' ? 'Скины' : f === 'sticker' ? 'Стикеры' : 'Брелки'}
              </button>
            ))}
          </div>
        </div>
        {filteredItems.length === 0 ? (
          <div className="empty-state"><p>Нет скинов для апгрейда</p><a href="/marketplace" className="btn btn-primary btn-sm">Маркет</a></div>
        ) : (
          <div className="skin-grid">
            {filteredItems.map(item => (
              <div key={item.inventory_id} className={`skin-card${selectedId === item.inventory_id ? ' selected' : ''}`}
                onClick={() => toggleSkin(item.inventory_id)}>
                <div className="skin-img-wrap">
                  <SkinImage src={item.image_url} alt={item.name} />
                </div>
                <div className="skin-info">
                  <div className="skin-name">{item.name}</div>
                  <div className="skin-ql">{item.category === 'sticker' ? 'Стикер' : item.quality}</div>
                  <div className="skin-price">{item.price.toLocaleString()} ₽</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {shake && <div className="shake-overlay" />}

      {winSkins.length > 0 && (
        <div className="winskins-container">
          {winSkins.map(s => (
            <div key={s.id} className="winskin-piece"
              style={{
                left: `${s.left}%`,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.dur}s`,
              }}
            >
              <SkinImage src={s.img} alt={s.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
