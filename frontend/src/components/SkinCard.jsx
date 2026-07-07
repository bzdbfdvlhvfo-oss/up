export default function SkinCard({ skin, onBuy, onSell, inInventory, inventoryId, selected, onToggle }) {
  const isSticker = skin.category === 'sticker'
  return (
    <div
      className={`skin-card${selected ? ' selected' : ''}`}
      onClick={onToggle}
    >
      <div className="skin-img-wrap">
        {skin.image_url ? (
          <img src={skin.image_url} alt={skin.name} />
        ) : (
          <div className="skin-ph" />
        )}
        {isSticker && <span className="skin-type-badge sticker">Стикер</span>}
      </div>
      <div className="skin-info">
        <div className="skin-name">{skin.name}</div>
        <div className="skin-ql">{skin.quality || skin.rarity}</div>
        <div className="skin-price">{skin.price.toLocaleString()} ₽</div>
      </div>
      <div className="skin-actions">
        {onBuy && <button className="btn btn-sm btn-green" onClick={e => { e.stopPropagation(); onBuy(skin) }}>Купить</button>}
        {onSell && <button className="btn btn-sm btn-red" onClick={e => { e.stopPropagation(); onSell(inventoryId) }}>Продать</button>}
      </div>
    </div>
  )
}
