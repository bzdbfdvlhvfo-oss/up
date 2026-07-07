import { useState } from 'react'

export default function SkinImage({ src, alt, className }) {
  const [state, setState] = useState('loading')

  if (!src || state === 'error') {
    const letter = alt ? alt[0].toUpperCase() : '?'
    return (
      <div className={`skin-img-fallback ${className || ''}`}>
        <span>{letter}</span>
      </div>
    )
  }

  return (
    <>
      {state === 'loading' && <div className="skin-img-fallback skin-img-loading"><span /></div>}
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        style={state === 'loading' ? { display: 'none' } : {}}
        onLoad={() => setState('loaded')}
        onError={() => setState('error')}
      />
    </>
  )
}
