import { useMemo } from 'react'
const COLORS = ['#ff8f00', '#ffd700', '#ff4444', '#44ff44', '#4488ff', '#ff44ff', '#ffffff']
export default function Confetti({ active }) {
  const particles = useMemo(() => {
    if (!active) return []
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: -10 - Math.random() * 30,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 6,
      dur: 1.5 + Math.random() * 2,
      delay: Math.random() * 0.3,
      wobble: Math.random() * 100,
      drift: -30 + Math.random() * 60,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    }))
  }, [active])
  if (!active || particles.length === 0) return null
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.shape === 'circle' ? p.size : p.size * 0.4,
          height: p.shape === 'rect' ? p.size : p.size,
          background: p.color,
          borderRadius: p.shape === 'circle' ? '50%' : '2px',
          opacity: 0,
          animation: `confettiFall ${p.dur}s cubic-bezier(0.25,0.1,0.25,1) ${p.delay}s forwards`,
          '--drift': `${p.drift}px`,
          '--wobble': `${p.wobble}px`,
        }}/>
      ))}
    </div>
  )
}
