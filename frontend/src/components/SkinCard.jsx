const RARITY_COLORS = {
  'Covert': '#eb4b4b',
  'Classified': '#d32ce6',
  'Restricted': '#8847ff',
  'Mil-Spec': '#4b69ff',
  'Industrial': '#5e98d9',
}

export default function SkinCard({ skin, onBuy, onSell, inInventory, inventoryId, selected, onToggle }) {
  const color = RARITY_COLORS[skin.rarity] || '#888'

  return (
    <div
      className={`skin-card${selected ? ' skin-card-selected' : ''}`}
      style={{ '--rarity-color': color }}
      onClick={onToggle}
    >
      <div className="skin-rarity-bar" style={{ background: color }} />
      <div className="skin-image-wrap">
        <div className="skin-image-placeholder" />
      </div>
      <div className="skin-info">
        <div className="skin-name">{skin.name}</div>
        <div className="skin-meta">
          <span className="skin-rarity" style={{ color }}>{skin.rarity}</span>
          <span className="skin-quality">{skin.quality}</span>
        </div>
        <div className="skin-price">{skin.price.toLocaleString()} ₽</div>
      </div>
      <div className="skin-actions">
        {onBuy && <button className="btn btn-small btn-green" onClick={e => { e.stopPropagation(); onBuy(skin) }}>Купить</button>}
        {onSell && <button className="btn btn-small btn-red" onClick={e => { e.stopPropagation(); onSell(inventoryId) }}>Продать</button>}
      </div>
    </div>
  )
}
