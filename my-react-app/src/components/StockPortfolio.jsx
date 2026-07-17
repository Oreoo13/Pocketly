import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useStockPrices } from '../hooks/useStockPrices'

const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
const fmtNum = (val) => String(val).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const parseNum = (val) => parseFloat(String(val).replace(/\./g, '')) || 0

const PRICES_KEY = 'mt_stock_prices'
const loadPrices = () => { try { return JSON.parse(localStorage.getItem(PRICES_KEY) || '{}') } catch { return {} } }
const savePrices = (p) => localStorage.setItem(PRICES_KEY, JSON.stringify(p))

const TICKER_COLORS = {
  BBRI: '#ef4444', BMRI: '#3b82f6', BBCA: '#22c55e', BBNI: '#f59e0b',
  TLKM: '#8b5cf6', GOTO: '#06b6d4', ASII: '#f97316', UNVR: '#ec4899',
  DEFAULT: '#6366f1',
}

export default function StockPortfolio({ holdings, onRefresh, user }) {
  const [manualPrices, setManualPrices] = useState(loadPrices)
  const [editingTicker, setEditingTicker] = useState(null)
  const [priceInput, setPriceInput] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ ticker: '', name: '', lots: '', avg_price: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const { prices: autoPrices, loading: autoLoading, error: autoError, fetchPrices } = useStockPrices()
  const tickers = holdings.map(h => h.ticker)

  useEffect(() => {
    if (tickers.length > 0) fetchPrices(tickers)
  }, [tickers.join(',')]) // eslint-disable-line

  const handleSetPrice = (ticker) => {
    const price = parseNum(priceInput)
    if (!price) return
    const updated = { ...manualPrices, [ticker]: price }
    setManualPrices(updated)
    savePrices(updated)
    setEditingTicker(null)
    setPriceInput('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.ticker || !form.lots || !form.avg_price) { setFormError('Ticker, Lots, & Avg Price wajib diisi'); return }
    setSaving(true)
    
    const payload = {
      ticker: form.ticker.toUpperCase(),
      name: form.name || form.ticker.toUpperCase(),
      lots: parseInt(form.lots),
      avg_price: parseNum(form.avg_price),
      user_id: user?.id,
    }

    let error;
    if (editId) {
      const res = await supabase.from('stock_holdings').update(payload).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('stock_holdings').insert(payload)
      error = res.error
    }

    setSaving(false)
    if (error) { setFormError(error.message); return }
    setForm({ ticker: '', name: '', lots: '', avg_price: '' })
    setShowForm(false)
    setEditId(null)
    onRefresh?.()
  }

  const handleEdit = (item) => {
    setForm({
      ticker: item.ticker,
      name: item.name,
      lots: item.lots.toString(),
      avg_price: fmtNum(item.avg_price.toString())
    })
    setEditId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus saham ini?')) return
    await supabase.from('stock_holdings').delete().eq('id', id)
    onRefresh?.()
  }

  const totalModal = holdings.reduce((s, h) => s + h.avg_price * h.lots * 100, 0)
  const totalNilai = holdings.reduce((s, h) => {
    const p = autoPrices[h.ticker]?.price || manualPrices[h.ticker]
    return s + (p ? p * h.lots * 100 : h.avg_price * h.lots * 100)
  }, 0)
  const totalPnL = totalNilai - totalModal
  const totalPnLPct = totalModal > 0 ? (totalPnL / totalModal) * 100 : 0
  const hasAnyPrice = holdings.some(h => autoPrices[h.ticker] || manualPrices[h.ticker])

  return (
    <div className="stock-portfolio">
      {/* Header */}
      <div className="invest-section-header">
        <div>
          <h3>Portofolio Saham IDX</h3>
          <span className="update-time">
            {autoLoading ? '⏳ Mengambil harga live...' : 
             autoError ? `⚠️ ${autoError}` : 
             hasAnyPrice ? '✅ Harga sinkron otomatis (bisa override manual klik ✏️)' : 
             'Belum ada harga'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => fetchPrices(tickers, true)} disabled={autoLoading || tickers.length === 0}>
            {autoLoading ? '⏳' : '🔄'} Refresh Live
          </button>
          <button className="btn btn-primary" onClick={() => {
            if (showForm) {
              setShowForm(false)
              setEditId(null)
              setForm({ ticker: '', name: '', lots: '', avg_price: '' })
            } else {
              setShowForm(true)
            }
          }}>
            {showForm ? '✕ Batal' : '+ Tambah Saham'}
          </button>
        </div>
      </div>

      {/* Form Tambah/Edit */}
      {showForm && (
        <form className="stock-form glass animate-fade-up" onSubmit={handleSave}>
          <div className="stock-form-grid">
            <div className="form-group">
              <label>Ticker IDX</label>
              <input type="text" placeholder="BBRI" value={form.ticker}
                onChange={e => setForm(p => ({ ...p, ticker: e.target.value.toUpperCase() }))} />
            </div>
            <div className="form-group">
              <label>Nama Perusahaan</label>
              <input type="text" placeholder="Bank Rakyat Indonesia" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Jumlah Lot</label>
              <input type="number" placeholder="10" min="1" value={form.lots}
                onChange={e => setForm(p => ({ ...p, lots: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Avg Price (Rp/lembar)</label>
              <input type="text" inputMode="numeric" placeholder="4.200" value={form.avg_price}
                onChange={e => setForm(p => ({ ...p, avg_price: fmtNum(e.target.value) }))} />
            </div>
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : '+ Simpan')}
          </button>
        </form>
      )}

      {holdings.length === 0 ? (
        <div className="empty-state glass"><span>📈</span><p>Belum ada saham di portofolio</p></div>
      ) : (
        <>
          {/* Summary */}
          <div className="portfolio-summary glass">
            <div className="portfolio-summary-item">
              <span className="summary-label">Total Modal</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{fmt.format(totalModal)}</span>
            </div>
            <div className="portfolio-summary-item">
              <span className="summary-label">Nilai Saat Ini</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-light)' }}>{fmt.format(totalNilai)}</span>
            </div>
            <div className="portfolio-summary-item">
              <span className="summary-label">Total P&L</span>
              <div>
                <span style={{ fontWeight: 800, fontSize: 18, color: totalPnL >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                  {totalPnL >= 0 ? '+' : ''}{fmt.format(totalPnL)}
                </span>
                <span style={{ fontSize: 13, color: totalPnLPct >= 0 ? 'var(--income)' : 'var(--expense)', marginLeft: 6 }}>
                  ({totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Holdings table */}
          <div className="stock-table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Saham</th>
                  <th>Lot</th>
                  <th>Avg Price</th>
                  <th>Harga Kini</th>
                  <th>Modal</th>
                  <th>Nilai Kini</th>
                  <th>P&L</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => {
                  const color = TICKER_COLORS[h.ticker] || TICKER_COLORS.DEFAULT
                  const auto = autoPrices[h.ticker]
                  const manual = manualPrices[h.ticker]
                  const isAuto = !!auto && !manual
                  const currentPrice = manual || auto?.price
                  
                  const modal = h.avg_price * h.lots * 100
                  const nilaiKini = currentPrice ? currentPrice * h.lots * 100 : null
                  const pnl = nilaiKini !== null ? nilaiKini - modal : null
                  const pnlPct = pnl !== null && modal > 0 ? (pnl / modal) * 100 : null
                  const isProfit = pnl !== null && pnl >= 0

                  return (
                    <tr key={h.id}>
                      {/* Ticker chip + name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="porto-ticker-chip" style={{ background: color + '20', color, borderColor: color + '40' }}>
                            {h.ticker}
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{h.name}</span>
                        </div>
                      </td>
                      <td>{h.lots} lot<br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(h.lots * 100).toLocaleString('id-ID')} lbr</span></td>
                      <td style={{ fontWeight: 600 }}>{fmt.format(h.avg_price)}</td>

                      {/* Clickable price input */}
                      <td>
                        {editingTicker === h.ticker ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input
                              type="text" inputMode="numeric" autoFocus
                              placeholder="Ketik harga"
                              value={priceInput}
                              onChange={e => setPriceInput(fmtNum(e.target.value))}
                              onKeyDown={e => { if (e.key === 'Enter') handleSetPrice(h.ticker); if (e.key === 'Escape') setEditingTicker(null) }}
                              style={{ width: 90, padding: '5px 8px', fontSize: 13, borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--accent-light)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                            <button onClick={() => handleSetPrice(h.ticker)} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 12 }}>✓</button>
                            <button onClick={() => setEditingTicker(null)} className="btn btn-ghost" style={{ padding: '4px 6px', fontSize: 12 }}>✕</button>
                          </div>
                        ) : (
                          <button className="price-input-btn" onClick={() => {
                            setEditingTicker(h.ticker)
                            setPriceInput(currentPrice ? fmtNum(String(currentPrice)) : '')
                          }} title="Klik untuk override harga manual">
                            {currentPrice ? (
                              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                                {fmt.format(currentPrice)} 
                                {isAuto && <span style={{ fontSize: 10, color: 'var(--income)', marginLeft: 4 }}>⚡ live</span>}
                                {manual && <span style={{ fontSize: 10, color: 'var(--warning)', marginLeft: 4 }}>✏️ manual</span>}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>✏️ input manual</span>
                            )}
                          </button>
                        )}
                      </td>

                      <td>{fmt.format(modal)}</td>
                      <td style={{ fontWeight: 600 }}>{nilaiKini !== null ? fmt.format(nilaiKini) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>

                      {/* P&L */}
                      <td>
                        {pnl !== null ? (
                          <div>
                            <div style={{ fontWeight: 700, color: isProfit ? 'var(--income)' : 'var(--expense)' }}>
                              {isProfit ? '+' : ''}{fmt.format(pnl)}
                            </div>
                            <div style={{ fontSize: 11, color: isProfit ? 'var(--income)' : 'var(--expense)' }}>
                              {isProfit ? '▲' : '▼'} {Math.abs(pnlPct ?? 0).toFixed(2)}%
                            </div>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => handleEdit(h)}>✏️</button>
                          <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleDelete(h.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
