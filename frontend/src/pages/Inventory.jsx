import { useState, useEffect } from 'react'
import * as api from '../api'
import SkinCard from '../components/SkinCard'

export default function Inventory({ user, onBalanceUpdate }) {
  const [items, setItems] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('items')

  const fetchInventory = () => {
    setLoading(true)
    api.getInventory(user.id).then(d => { setItems(d); setLoading(false) }).catch(() => setLoading(false))
  }

  const fetchHistory = () => {
    api.getUpgradeHistory(user.id).then(setHistory).catch(() => {})
  }

  useEffect(() => { fetchInventory(); fetchHistory() }, [])

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
    <div className="page inventory-page">
      <div className="inventory-layout">
        <div className="inventory-main">
          <div className="inventory-header">
            <h2>Инвентарь</h2>
            <span className="inventory-total">{totalValue.toLocaleString()} ₽</span>
          </div>
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <p>Инвентарь пуст</p>
              <a href="/marketplace" className="btn btn-primary btn-sm">В Маркет</a>
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

        <div className="inventory-sidebar">
          <h3>История</h3>
          {history.length === 0 ? (
            <p className="sidebar-empty">Пока пусто</p>
          ) : (
            <div className="sidebar-list">
              {history.map(h => (
                <div key={h.id} className={`sidebar-item ${h.result}`}>
                  <span className="si-res">{h.result === 'win' ? 'ВЫИГРЫШ' : 'ПРОИГРЫШ'}</span>
                  <span className="si-skin">{h.staked_name}</span>
                  <span className="si-mult">x{h.multiplier}</span>
                  <span className="si-date">{new Date(h.created_at).toLocaleString('ru')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
