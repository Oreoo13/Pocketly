import StockPortfolio from '../components/StockPortfolio'
import StockWatchlist from '../components/StockWatchlist'
import CashInvestments from '../components/CashInvestments'
import { useState } from 'react'

export default function Investments({ stockHoldings, cashInvestments, onRefresh, user }) {
  const [tab, setTab] = useState('stock')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Investasi</h1>
          <p className="page-sub">Pantau portofolio saham & investasi cash kamu</p>
        </div>
      </div>

      <div className="invest-tabs">
        <button
          className={`invest-tab ${tab === 'stock' ? 'active' : ''}`}
          onClick={() => setTab('stock')}
        >
          📈 Saham IDX
        </button>
        <button
          className={`invest-tab ${tab === 'cash' ? 'active' : ''}`}
          onClick={() => setTab('cash')}
        >
          💎 Investasi Cash
        </button>
      </div>

      {tab === 'stock' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Watchlist auto-fetch */}
          <StockWatchlist />

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 28 }}>
            <StockPortfolio holdings={stockHoldings} onRefresh={onRefresh} user={user} />
          </div>
        </div>
      ) : (
        <CashInvestments investments={cashInvestments} onRefresh={onRefresh} user={user} />
      )}
    </div>
  )
}
