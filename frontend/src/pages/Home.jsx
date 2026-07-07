import { Link } from 'react-router-dom'

export default function Home({ user, onLoginClick }) {
  return (
    <div className="page home-page">
      <div className="hero">
        <h1>CS2 Upgrader</h1>
        <p className="hero-sub">Апгрейд скинов CS2. Покупай, продавай, рискуй и выигрывай.</p>
        <div className="hero-actions">
          {!user && (
            <button className="btn btn-primary btn-lg" onClick={onLoginClick}>
              Начать
            </button>
          )}
          <Link to="/marketplace" className="btn btn-lg">
            Маркет
          </Link>
          {user && <Link to="/upgrade" className="btn btn-lg btn-primary">Апгрейд</Link>}
        </div>
      </div>
      <div className="features">
        <div className="feature-card">
          <h3>Маркет</h3>
          <p>Покупай скины CS2 за виртуальные рубли. Все цены как на реальном рынке.</p>
        </div>
        <div className="feature-card">
          <h3>Продажа</h3>
          <p>Продавай скины из инвентаря за 85% от цены маркета. Мгновенно.</p>
        </div>
        <div className="feature-card">
          <h3>Апгрейд</h3>
          <p>Рискуй скинами ради шанса получить предметы выше рангом. FaK!</p>
        </div>
      </div>
    </div>
  )
}
