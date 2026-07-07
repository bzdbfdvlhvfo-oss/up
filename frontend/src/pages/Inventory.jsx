import { useState, useEffect } from 'react'
import * as api from '../api'
import SkinCard from '../components/SkinCard'

export default function Inventory({ user, onBalanceUpdate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchInventory = () => {
    setLoading(true)
    api.getInventory(user.id).then(d => { setItems(d); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchInventory() }, [])

  const handleSell = async (inventoryId) => {
    try {
      await api.sellSkin(user.id, inventoryId)
      fetchInventory()
      onBalanceUpdate()
    } catch (err) {
      alert(err.message)
    }
  }

  const totalValue = items.reduce((sum, i) => sum + i.price, 0)

  return (
    <div className="page">
      <div className="inventory-header">
        <h2>Инвентарь</h2>
        <span className="inventory-total">{totalValue.toLocaleString()} ₽</span>
      </div>
      {loading ? (
        <div className="loading">Загрузка инвентаря...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>Инвентарь пуст</p>
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
              onSell={handleSell}
            />
          ))}
        </div>
      )}
    </div>
  )
}
