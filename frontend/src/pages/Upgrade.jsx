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
    } else if (type === 'tick') {
      osc.type = 'square'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      gain.gain.setValueAtTime(0.03, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.05)
    }
  } catch {}
}

export default function Upgrade({ user, onBalanceUpdate }) {
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [spinning, setSpinning] = useState(false)
  const [needleAngle, setNeedleAngle] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const spinRef = useRef(null)
  const tickRef = useRef(null)

  const fetchData = () => {
    api.getInventory(user.id).then(setItems).catch(() => {})
    api.getUpgradeHistory(user.id).then(setHistory).catch(() => {})
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (!spinning && spinRef.current) {
      clearInterval(spinRef.current)
      clearInterval(tickRef.current)
    }
  }, [spinning])

  const toggleSkin = (inventoryId) => {
    if (spinning) return
    setSelectedId(prev => prev === inventoryId ? null : inventoryId)
    setResult(null)
    setShowResult(false)
  }

  const selected = items.find(i => i.inventory_id === selectedId)
  const tiers = ['Industrial', 'Mil-Spec', 'Restricted', 'Classified', 'Covert']
  const targetTier = selected ? tiers[Math.min(tiers.indexOf(selected.rarity) + 1, tiers.length - 1)] : null

  const calcChance = () => {
    if (!selected) return 0
    const base = Math.min(30, Math.round((selected.price / 18000) * 30))
    return Math.max(5, base)
  }

  const handleUpgrade = async () => {
    if (!selectedId || loading || spinning) return
    setLoading(true)
    setShowResult(false)
    setResult(null)
    const chance = calcChance()
    try {
      const res = await api.upgrade(user.id, [selectedId])
      setResult(res)

      const winAngle = 90 + (Math.random() * (chance / 100) * 360 * 0.8)
      const loseAngle = 90 + (chance / 100) * 360 + (Math.random() * ((100 - chance) / 100) * 360 * 0.8)
      const targetAngle = res.won ? winAngle : loseAngle
      const fullSpins = 5 + Math.floor(Math.random() * 3)
      const totalAngle = fullSpins * 360 + targetAngle

      setSpinning(true)

      let tickCount = 0
      const tickInterval = setInterval(() => {
        playTone('tick')
        tickCount++
        if (tickCount > 30) clearInterval(tickInterval)
      }, 80)

      tickRef.current = tickInterval

      const startTime = Date.now()
      const duration = 2500
      const startAngle = needleAngle % 360

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = startAngle + (totalAngle - startAngle) * eased
        setNeedleAngle(current)
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setNeedleAngle(totalAngle)
          setSpinning(false)
          clearInterval(tickInterval)
          setTimeout(() => {
            setShowResult(true)
            if (res.won) playTone('win')
            else playTone('lose')
            if (!res.won) setSelectedId(null)
            fetchData()
            onBalanceUpdate()
          }, 300)
        }
      }
      animate()
    } catch (err) {
      alert(err.message)
      setSpinning(false)
    }
    setLoading(false)
  }

  const chance = calcChance()

  return (
    <div className="page upgrade-page">
      <h2>Апгрейд</h2>
      <p className="upgrade-hint">Выбери скин и крути колесо!</p>

      <div className="wheel-section">
        <div className="wheel-container">
          <svg className="wheel-svg" viewBox="0 0 200 200">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <g transform={`rotate(${-90 + (chance / 100) * 180}, 100, 100)`}>
              <path
                d="M100,100 L100,5 A95,95 0 0,1 195,100 Z"
                fill={spinning || (showResult && result?.won) ? '#00e676' : '#1a3a2a'}
                stroke="#00e676"
                strokeWidth="0.5"
                opacity="0.9"
              />
            </g>
            <g transform={`rotate(${90 + (chance / 100) * 180}, 100, 100)`}>
              <path
                d="M100,100 L100,5 A95,95 0 0,1 195,100 Z"
                fill={spinning || (showResult && !result?.won) ? '#ff1744' : '#3a1a1a'}
                stroke="#ff1744"
                strokeWidth="0.5"
                opacity="0.9"
              />
            </g>
            <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
            <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <g>
              {Array.from({ length: 20 }).map((_, i) => (
                <line
                  key={i}
                  x1={100 + 82 * Math.cos((i * 18 * Math.PI) / 180)}
                  y1={100 + 82 * Math.sin((i * 18 * Math.PI) / 180)}
                  x2={100 + 95 * Math.cos((i * 18 * Math.PI) / 180)}
                  y2={100 + 95 * Math.sin((i * 18 * Math.PI) / 180)}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                  transform={`rotate(${(chance / 100) * 180}, 100, 100)`}
                />
              ))}
            </g>
            <text x="48" y="30" fontSize="9" fill="#00e676" fontWeight="700" filter="url(#glow)">
              WIN {chance}%
            </text>
            <text x={140} y={90} fontSize="9" fill="#ff1744" fontWeight="700" filter="url(#glow)">
              LOSE {100 - chance}%
            </text>
            {/* NEEDLE */}
            <g transform={`rotate(${needleAngle}, 100, 100)`}>
              <polygon points="100,12 95,40 105,40" fill="#ffd54f" stroke="#fff" strokeWidth="1" filter="url(#glow)"/>
              <circle cx="100" cy="100" r="6" fill="#ffd54f" stroke="#fff" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="2.5" fill="#1a1a3a"/>
            </g>
          </svg>

          {showResult && result && (
            <div className={`wheel-result ${result.won ? 'win' : 'lose'}`}>
              {result.won ? (
                <>ВЫИГРЫШ!<br/>{result.won_skin?.name}<br/><span className="wheel-price">{result.won_skin?.price.toLocaleString()} ₽</span></>
              ) : (
                <>ПРОИГРЫШ</>
              )}
            </div>
          )}
        </div>

        <div className="wheel-info">
          {selected ? (
            <>
              <div>Скин: <strong>{selected.name}</strong> ({selected.quality})</div>
              <div>Цена: <strong>{selected.price.toLocaleString()} ₽</strong></div>
              <div>Цель: <strong style={{ color: 'var(--accent2)' }}>{targetTier}</strong></div>
              <div>Шанс: <strong style={{ color: 'var(--gold)' }}>{chance}%</strong></div>
              <button
                className="btn btn-primary btn-lg wheel-spin-btn"
                onClick={handleUpgrade}
                disabled={loading || spinning}
              >
                {spinning ? '...' : loading ? 'КРУТИМ...' : 'КРУТИТЬ!'}
              </button>
            </>
          ) : (
            <div className="wheel-select-hint">Выбери скин в инвентаре ниже</div>
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
              selected={selectedId === item.inventory_id}
              onToggle={() => toggleSkin(item.inventory_id)}
            />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="history-section">
          <h3>История</h3>
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
