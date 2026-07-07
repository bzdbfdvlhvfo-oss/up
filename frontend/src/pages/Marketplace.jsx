import { useState, useEffect } from 'react'
import * as api from '../api'
import SkinCard from '../components/SkinCard'

export default function Marketplace({ user, onBalanceUpdate }) {
  const [skins, setSkins] = useState([])
  const [rarity, setRarity] = useState('')
  const [quality, setQuality] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const fetchSkins = () => {
    setLoading(true)
    const filters = {}
    if (rarity) filters.rarity = rarity
    if (quality) filters.quality = quality
    if (category) filters.category = category
    if (search) filters.search = search
    api.getSkins(filters).then(d => { setSkins(d); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchSkins() }, [rarity, quality, category])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchSkins()
  }

  const handleBuy = async (skin) => {
    if (!user) return
    try {
      setError(null); setMessage(null)
      const result = await api.buySkin(user.id, skin.id)
      setMessage(`Куплен ${skin.name} за ${skin.price.toLocaleString()} ₽`)
      onBalanceUpdate()
    } catch (err) {
      setError(err.message)
    }
  }

  const rarities = ['', 'Covert', 'Classified', 'Restricted', 'Mil-Spec', 'Industrial', 'High Grade', 'Remarkable', 'Exotic', 'Extraordinary']
  const qualities = ['', 'Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred']
  const categories = ['', 'skin', 'sticker']
  const totalItems = skins.length
  const avgPrice = totalItems > 0 ? Math.round(skins.reduce((s, x) => s + x.price, 0) / totalItems) : 0

  return (
    <div className="page">
      <div className="marketplace-header">
        <h2>Маркет</h2>
        <div className="stats-bar">
          <span>Предметов: <strong>{totalItems}</strong></span>
          <span>Средняя цена: <strong>{avgPrice.toLocaleString()} ₽</strong></span>
        </div>
      </div>
      <div className="filters">
        <form onSubmit={handleSearch} className="search-form">
          <input className="input" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-primary">Поиск</button>
        </form>
        <select className="filter-select" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Все типы</option>
          <option value="skin">Скины</option>
          <option value="sticker">Стикеры</option>
          <option value="keychain">Брелки</option>
        </select>
        <select className="filter-select" value={rarity} onChange={e => setRarity(e.target.value)}>
          <option value="">Все редкости</option>
          {rarities.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="filter-select" value={quality} onChange={e => setQuality(e.target.value)}>
          <option value="">Все качества</option>
          {qualities.filter(Boolean).map(q => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>
      {!user && <div className="notice">Войди в аккаунт чтобы покупать</div>}
      {error && <div className="error-msg">{error}</div>}
      {message && <div className="success-msg">{message}</div>}
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <div className="skin-grid">
          {skins.map(s => (
            <SkinCard key={s.id} skin={s} onBuy={user ? handleBuy : null} />
          ))}
        </div>
      )}
    </div>
  )
}
