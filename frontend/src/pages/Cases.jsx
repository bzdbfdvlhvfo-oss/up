import { useState, useEffect, useRef } from 'react'
import * as api from '../api'
import SkinImage from '../components/SkinImage'
import Confetti from '../components/Confetti'

const SECRET_PRICE = 20000

export default function Cases({ user, onBalanceUpdate }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(null)
  const [result, setResult] = useState(null)
  const [showAnim, setShowAnim] = useState(false)
  const [wsData, setWsData] = useState([])
  const wsAnim = useRef(null)

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

      // Build scroll list: all case drops shuffled, won skin inserted at random position
      const pool = [...c.drops.filter(d => d.skin)]
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]]
      }
      // Insert won skin somewhere in the middle
      const pos = 10 + Math.floor(Math.random() * 15)
      pool.splice(pos, 0, { skin: res.skin })
      setWsData(pool)

      onBalanceUpdate()
    } catch (err) { alert(err.message) }
    setOpening(null)
  }

  const closeAnim = () => {
    setShowAnim(false); setResult(null); setWsData([])
    if (wsAnim.current) { cancelAnimationFrame(wsAnim.current); wsAnim.current = null }
  }

  const isSecret = (skin) => skin && skin.price >= SECRET_PRICE

  // Slot-machine style scroll with ticking that slows down
  const scrollRef = useRef(null)
  const [caseGlow, setCaseGlow] = useState(false)
  const [caseShake, setCaseShake] = useState(false)
  const [caseZoom, setCaseZoom] = useState(false)
  useEffect(() => {
    if (!showAnim || wsData.length === 0) return
    if (!scrollRef.current) return
    let start = Date.now()
    const dur = 3800
    const totalPx = (wsData.length - 3) * 90
    let lastTickSegment = -1
    let tickCtx
    try { tickCtx = new (window.AudioContext || window.webkitAudioContext)() } catch {}
    const playCaseTick = (pitch) => {
      if (!tickCtx) return
      try {
        const o = tickCtx.createOscillator(); const g = tickCtx.createGain()
        o.type = 'square'
        o.frequency.setValueAtTime(60 + pitch, tickCtx.currentTime)
        g.gain.setValueAtTime(0.02, tickCtx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, tickCtx.currentTime + 0.05)
        o.connect(g); g.connect(tickCtx.destination)
        o.start(tickCtx.currentTime); o.stop(tickCtx.currentTime + 0.05)
      } catch {}
    }
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1)
      // Three-phase easing: fast launch → cruise → long deceleration with overshoot
      let eased
      if (p < 0.15) {
        // Launch: fast acceleration
        eased = 3.0 * p * p
      } else if (p < 0.45) {
        // Cruise: fast continuous scroll
        eased = 0.0675 + 1.35 * (p - 0.15)
      } else {
        // Deceleration: long smooth stop with slight overshoot bounce
        const t = (p - 0.45) / 0.55
        eased = 0.4725 + 0.54 * t - 0.03 * Math.sin(t * Math.PI * 2)
      }
      const px = Math.min(eased * totalPx, totalPx)
      if (scrollRef.current) scrollRef.current.style.transform = `translateX(-${px}px)`

      // Ticking sound — slows down as animation progresses
      const seg = Math.floor(eased * (wsData.length - 3))
      if (seg !== lastTickSegment) {
        lastTickSegment = seg
        const pitch = Math.max(20, 200 - eased * 180)
        playCaseTick(pitch)
      }

      if (p < 1) {
        wsAnim.current = requestAnimationFrame(tick)
      } else {
        // Final reveal: glow + shake + zoom on winning card
        setCaseGlow(true)
        setCaseShake(true)
        setTimeout(() => setCaseZoom(true), 100)
        setTimeout(() => { setCaseGlow(false); setCaseShake(false); setCaseZoom(false) }, 2500)
        if (tickCtx) tickCtx.close()
      }
    }
    wsAnim.current = requestAnimationFrame(tick)
    return () => { if (wsAnim.current) cancelAnimationFrame(wsAnim.current); if (tickCtx) tickCtx.close() }
  }, [showAnim, wsData.length])

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Кейсы</h2>
        <div className="page-subtitle">Купи кейс и открой — испытай удачу</div>
      </div>

      <div className="cases-grid">
        {loading ? (
          <>
            <div className="skeleton case-card-skel" /><div className="skeleton case-card-skel" />
            <div className="skeleton case-card-skel" /><div className="skeleton case-card-skel" />
          </>
        ) : cases.map(c => {
          const top = c.top_drop
          return (
            <div key={c.id} className="case-card">
              <div className="case-img-wrap">
                <SkinImage src={c.image_url} alt={c.name} className="case-img" />
                <div className="case-top-label">
                  {top && <span className="case-top-text">до {top.price.toLocaleString()} ₽</span>}
                </div>
              </div>
              <div className="case-info">
                <div className="case-name">{c.name}</div>
                <div className="case-price">{c.price.toLocaleString()} ₽</div>
              </div>
              <div className="case-drops-preview">
                {c.drops.slice(0, 8).map(d => {
                  const sec = isSecret(d.skin)
                  return d.skin ? (
                    <div key={d.skin_id} className={`case-drop-mini ${sec ? 'secret' : ''}`} title={d.skin.name}>
                      {sec ? <span className="cdm-q">?</span> : <SkinImage src={d.skin.image_url} alt={d.skin.name} />}
                    </div>
                  ) : null
                })}
                {c.drops.length > 8 && <div className="case-drop-more">+{c.drops.length - 8}</div>}
              </div>
              {user ? (
                <button className="btn btn-primary case-btn" onClick={() => openCase(c)} disabled={opening === c.id}>
                  {opening === c.id ? '...' : 'Открыть'}
                </button>
              ) : (
                <div className="case-nologin">Войди чтобы открыть</div>
              )}
            </div>
          )
        })}
      </div>

      {result?.skin?.price >= 1000 && <Confetti active={caseGlow} />}
      {showAnim && result && wsData.length > 0 && (
        <div className="case-open-overlay" onClick={closeAnim}>
          <div className="case-open-modal" onClick={e => e.stopPropagation()}>
            <div className="case-open-title">Открытие {result.case_name}</div>
            {caseShake && <div className="shake-overlay" />}
            <div className={`case-open-scroll-wrap${caseGlow ? ' flash-glow' : ''}`}>
              <div ref={scrollRef} className="case-open-scroll">
                {wsData.map((d, i) => {
                  const sec = isSecret(d.skin)
                  return (
                    <div key={i} className={`case-open-card ${d.skin?.id === result.skin?.id ? 'case-open-card-hit' : ''} ${d.skin?.id === result.skin?.id && caseZoom ? 'case-open-card-zoom' : ''}`}>
                      <div className="case-open-card-img">
                        {sec && d.skin?.id !== result.skin?.id ? (
                          <div className="cdm-q-big">?</div>
                        ) : (
                          d.skin && <SkinImage src={d.skin.image_url} alt={d.skin.name} />
                        )}
                      </div>
                      <div className="case-open-card-name">{d.skin?.name || '???'}</div>
                    </div>
                  )
                })}
              </div>
              <div className="case-open-indicator" />
            </div>
            <div className="case-open-reveal">
              <div className={`case-open-rarity rarity-${result.skin.rarity?.toLowerCase()}`}>{result.skin.rarity}</div>
              <div className="case-open-skin-name">{result.skin.name}</div>
              <div className="case-open-skin-price">{result.skin.price.toLocaleString()} ₽</div>
            </div>
            <button className="btn btn-primary" onClick={closeAnim}>Забрать</button>
          </div>
        </div>
      )}
    </div>
  )
}
