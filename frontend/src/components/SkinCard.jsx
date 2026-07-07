export default function SkinCard({ skin, onBuy, onSell, onWithdraw, inInventory, inventoryId, selected, onToggle }) {
  const isSticker = skin.category === 'sticker'
  const withdrawn = skin.withdrawn_at
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
        {withdrawn && <span className="skin-type-badge withdrawn">StatTrak™ ✓</span>}
      </div>
      <div className="skin-info">
        <div className="skin-name">{withdrawn ? `StatTrak™ ${skin.name}` : skin.name}</div>
        <div className="skin-ql">{skin.quality || skin.rarity}</div>
        <div className="skin-price">{skin.price.toLocaleString()} ₽</div>
      </div>
      <div className="skin-actions">
        {onBuy && <button className="btn btn-sm btn-green" onClick={e => { e.stopPropagation(); onBuy(skin) }}>Купить</button>}
        {onSell && !withdrawn && <button className="btn btn-sm btn-red" onClick={e => { e.stopPropagation(); onSell(inventoryId) }}>Продать</button>}
        {onWithdraw && !withdrawn && <button className="btn btn-sm btn-gold" onClick={e => { e.stopPropagation(); onWithdraw(inventoryId, skin) }}>Вывести</button>}
        {withdrawn && <span className="withdrawn-label">Выведен</span>}
      </div>
    </div>
  )
}
