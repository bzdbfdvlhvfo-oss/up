export default function SkinCard({ skin, onBuy, onSell, inInventory, inventoryId, selected, onToggle }) {
  return (
    <div
      className={`skin-card${selected ? ' skin-card-selected' : ''}`}
      style={{ '--rarity-color': 'var(--accent2)' }}
      onClick={onToggle}
    >
      <div className="skin-image-wrap">
        {skin.image_url ? (
          <img src={skin.image_url} alt={skin.name} className="skin-img" />
        ) : (
          <div className="skin-image-placeholder" />
        )}
      </div>
      <div className="skin-info">
        <div className="skin-name">{skin.name}</div>
        <div className="skin-quality-label">{skin.quality}</div>
        <div className="skin-price">{skin.price.toLocaleString()} ₽</div>
      </div>
      <div className="skin-actions">
        {onBuy && <button className="btn btn-small btn-green" onClick={e => { e.stopPropagation(); onBuy(skin) }}>Купить</button>}
        {onSell && <button className="btn btn-small btn-red" onClick={e => { e.stopPropagation(); onSell(inventoryId) }}>Продать</button>}
      </div>
    </div>
  )
}
