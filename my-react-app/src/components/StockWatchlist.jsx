import { useState, useEffect } from 'react'
import { useStockPrices } from '../hooks/useStockPrices'

const DEFAULT_WATCHLIST = ['BBRI', 'BMRI', 'BBCA']
const WATCHLIST_KEY = 'mt_watchlist'

const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })

const IDX_NAMES = {
  BBRI: 'Bank Rakyat Indonesia',
  BMRI: 'Bank Mandiri',
  BBCA: 'Bank Central Asia',
  BBNI: 'Bank Negara Indonesia',
  TLKM: 'Telkom Indonesia',
  GOTO: 'GoTo Group',
  ASII: 'Astra International',
  UNVR: 'Unilever Indonesia',
  ICBP: 'Indofood CBP',
  HMSP: 'HM Sampoerna',
  ANTM: 'Aneka Tambang',
  KLBF: 'Kalbe Farma',
  EXCL: 'XL Axiata',
  INDF: 'Indofood',
  PGAS: 'PGN Gas',
}

function loadWatchlist() {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY)
    return stored ? JSON.parse(stored) : DEFAULT_WATCHLIST
  } catch { return DEFAULT_WATCHLIST }
}

function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list))
}

function CustomTickerCard({ ticker, data, onRemove }) {
  const isUp = data?.change >= 0
  const changePct = data?.prevClose ? (data.change / data.prevClose) * 100 : 0
  const color = isUp ? 'var(--income)' : 'var(--expense)'
  
  return (
    <div className="custom-ticker-card glass" style={{ position: 'relative', overflow: 'hidden' }}>
      <button
        className="tv-remove-btn"
        onClick={() => onRemove(ticker)}
        title={`Hapus ${ticker}`}
        style={{ zIndex: 2, top: 12, right: 12 }}
      >
        ×
      </button>
      
      {/* Background glow based on price direction */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '100%', height: '100%',
        background: `radial-gradient(circle at top right, ${color}15, transparent 60%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '85%' }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>{ticker}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {IDX_NAMES[ticker] || 'Saham IDX'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', marginTop: 4 }}>
        {data ? (
          <>
            <span style={{ fontWeight: 800, fontSize: 24, color: 'var(--text-primary)' }}>
              {fmt.format(data.price)}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color }}>
              <span style={{ fontWeight: 700 }}>{isUp ? '▲' : '▼'} {fmt.format(Math.abs(data.change))}</span>
              <span style={{ fontWeight: 600 }}>({Math.abs(changePct).toFixed(2)}%)</span>
            </div>
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13, paddingBottom: 10 }}>⏳ Mengambil harga live...</span>
        )}
      </div>
    </div>
  )
}

export default function StockWatchlist() {
  const [watchlist, setWatchlist] = useState(loadWatchlist)
  const [addInput, setAddInput] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const { prices, loading, fetchPrices } = useStockPrices()

  useEffect(() => {
    if (watchlist.length > 0) {
      fetchPrices(watchlist)
    }
  }, [watchlist.join(',')]) // eslint-disable-line

  const handleAdd = (e) => {
    e.preventDefault()
    const ticker = addInput.trim().toUpperCase().replace(/^IDX:/, '').replace('.JK', '')
    if (!ticker || watchlist.includes(ticker)) return
    const newList = [...watchlist, ticker]
    setWatchlist(newList)
    saveWatchlist(newList)
    setAddInput('')
    setShowAdd(false)
  }

  const handleRemove = (ticker) => {
    const newList = watchlist.filter(t => t !== ticker)
    setWatchlist(newList)
    saveWatchlist(newList)
  }

  return (
    <div className="stock-watchlist">
      <div className="watchlist-header">
        <div>
          <h3>📡 Watchlist Saham IDX</h3>
          <span className="update-time">
            Live via Yahoo Finance (v8 API) · {loading ? '⏳ Updating...' : '✅ Real-time sync'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => fetchPrices(watchlist, true)} disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(v => !v)}>
            {showAdd ? '✕ Batal' : '+ Tambah'}
          </button>
        </div>
      </div>

      {showAdd && (
        <form className="watchlist-add-form glass" onSubmit={handleAdd}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Kode saham IDX, misal: TLKM"
              value={addInput}
              onChange={e => setAddInput(e.target.value.toUpperCase())}
              list="idx-suggestions"
              autoFocus
            />
            <datalist id="idx-suggestions">
              {Object.keys(IDX_NAMES).filter(t => !watchlist.includes(t)).map(t => (
                <option key={t} value={t}>{IDX_NAMES[t]}</option>
              ))}
            </datalist>
          </div>
          <button type="submit" className="btn btn-primary">Tambah ke Watchlist</button>
        </form>
      )}

      {watchlist.length === 0 ? (
        <div className="empty-state glass">
          <span>📡</span>
          <p>Watchlist kosong, klik "+ Tambah" untuk monitor saham</p>
        </div>
      ) : (
        <div className="tv-cards-grid">
          {watchlist.map(ticker => (
            <CustomTickerCard 
              key={ticker} 
              ticker={ticker} 
              data={prices[ticker]} 
              onRemove={handleRemove} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
