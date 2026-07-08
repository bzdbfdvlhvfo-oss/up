import { Link } from 'react-router-dom'

export default function Home({ user, onLoginClick }) {
  return (
    <div className="page home-page">
      <div className="hero">
        <div className="hero-badge">CS2 SKIN SIMULATOR</div>
        <h1>
          <span className="hero-title-up">UP</span>
          <span className="hero-title-grade">GRADE</span>
          <span className="hero-arrow">↑</span>
        </h1>
        <p className="hero-sub">Покупай скины, продавай, рискуй в колесе фортуны</p>
        <div className="hero-actions">
          {!user && (
            <button className="btn btn-primary btn-lg hero-btn" onClick={onLoginClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Начать
            </button>
          )}
          <Link to="/marketplace" className="btn btn-lg hero-btn hero-btn-outline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            Маркет
          </Link>
          {user && <Link to="/upgrade" className="btn btn-lg btn-primary hero-btn">Апгрейд</Link>}
        </div>
      </div>
      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <h3>Маркет</h3>
          <p>Покупай скины CS2 за виртуальные рубли. Цены как на реальном рынке.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>
          </div>
          <h3>Продажа</h3>
          <p>Продавай скины из инвентаря за 85% цены. Мгновенно, без комиссии.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <h3>Апгрейд</h3>
          <p>Рискуй скинами. Выбирай шанс или множитель. Крути колесо и забирай выигрыш.</p>
        </div>
      </div>
    </div>
  )
}
