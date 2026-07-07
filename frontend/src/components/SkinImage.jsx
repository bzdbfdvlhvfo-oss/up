import { useState } from 'react'

export default function SkinImage({ src, alt, className }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    const letter = alt ? alt[0].toUpperCase() : '?'
    return <div className={`skin-img-fallback ${className || ''}`}><span>{letter}</span></div>
  }

  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
}
