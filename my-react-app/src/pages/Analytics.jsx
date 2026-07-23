import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import StockPortfolio from '../components/StockPortfolio'
import StockWatchlist from '../components/StockWatchlist'
import CashInvestments from '../components/CashInvestments'

const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
const COLORS = ['#4f46e5', '#e11d48', '#16a34a', '#d97706', '#06b6d4', '#8b5cf6', '#db2777', '#2563eb']
const ALLOC_COLORS = [
  '#6366f1', '#06b6d4', '#f59e0b', '#22c55e', '#a855f7',
  '#e11d48', '#3b82f6', '#f97316', '#ec4899', '#14b8a6',
  '#84cc16', '#8b5cf6', '#ef4444', '#0ea5e9', '#d97706',
]

export default function Analytics({ transactions = [], categories = [], stockHoldings = [], cashInvestments = [], onRefresh, user }) {
  const [mainTab, setMainTab] = useState('reports') // 'reports' | 'investments'
  const [investTab, setInvestTab] = useState('stock') // 'stock' | 'cash'

  // --- Reports Logic ---
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12

  const years = useMemo(() => {
    const y = new Set(transactions.map(t => new Date(t.date).getFullYear()))
    y.add(now.getFullYear())
    return Array.from(y).sort((a,b) => b - a)
  }, [transactions])

  const months = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
    { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
  ]

  // Filter tx for selected month/year
  const periodTx = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date)
      return d.getFullYear() === year && (d.getMonth() + 1) === month
    })
  }, [transactions, year, month])

  const totalIncome = periodTx.filter(t => t.type === 'income').reduce((s,t) => s + Number(t.amount), 0)
  const totalExpense = periodTx.filter(t => t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0)
  const net = totalIncome - totalExpense

  // Pie Data - Expense
  const expenseData = useMemo(() => {
    const expenses = periodTx.filter(t => t.type === 'expense')
    const grouped = expenses.reduce((acc, t) => {
      const cat = categories.find(c => c.id === t.category_id)
      const name = cat?.name || 'Lainnya'
      if (!acc[name]) acc[name] = { name, value: 0, icon: cat?.icon || '📦' }
      acc[name].value += Number(t.amount)
      return acc
    }, {})
    return Object.values(grouped).sort((a,b) => b.value - a.value)
  }, [periodTx, categories])

  // Pie Data - Income
  const incomeData = useMemo(() => {
    const incomes = periodTx.filter(t => t.type === 'income')
    const grouped = incomes.reduce((acc, t) => {
      const cat = categories.find(c => c.id === t.category_id)
      const name = cat?.name || 'Lainnya'
      if (!acc[name]) acc[name] = { name, value: 0, icon: cat?.icon || '💰' }
      acc[name].value += Number(t.amount)
      return acc
    }, {})
    return Object.values(grouped).sort((a,b) => b.value - a.value)
  }, [periodTx, categories])

  return (
    <div className="page animate-fade-up">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">💡 Analitik</h1>
          <p className="page-sub">Pantau laporan keuangan dan portofolio investasi Anda</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        <button 
          style={{ flex: '1 0 auto', minWidth: '48%', padding: 16, borderRadius: 'var(--radius-lg)', background: mainTab === 'reports' ? 'var(--accent-light)' : 'var(--bg-card)', color: mainTab === 'reports' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: mainTab !== 'reports' ? '1px solid var(--border)' : 'none' }}
          onClick={() => setMainTab('reports')}
        >
          Laporan Transaksi
        </button>
        <button 
          style={{ flex: '1 0 auto', minWidth: '48%', padding: 16, borderRadius: 'var(--radius-lg)', background: mainTab === 'investments' ? 'var(--accent-light)' : 'var(--bg-card)', color: mainTab === 'investments' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: mainTab !== 'investments' ? '1px solid var(--border)' : 'none' }}
          onClick={() => setMainTab('investments')}
        >
          Portofolio Investasi
        </button>
      </div>

      {/* --- REPORTS VIEW --- */}
      {mainTab === 'reports' && (
        <div className="animate-fade-in">
          <div className="glass reports-filter-bar" style={{ padding: '20px 24px', borderRadius: 'var(--radius-xl)', marginBottom: 24 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>TAHUN</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '12px 16px', background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius-md)', width: '100%', color: 'var(--text-primary)' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>BULAN</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ padding: '12px 16px', background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius-md)', width: '100%', color: 'var(--text-primary)' }}>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="summary-grid">
            <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-xl)', textAlign: 'center', border: '1px solid var(--income-border)', background: 'var(--bg-card)' }}>
              <div style={{ color: 'var(--income)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Total Pemasukan</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{fmt.format(totalIncome)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>vs Rp0</div>
            </div>
            
            <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-xl)', textAlign: 'center', border: '1px solid var(--expense-border)', background: 'var(--bg-card)' }}>
              <div style={{ color: 'var(--expense)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Total Pengeluaran</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{fmt.format(totalExpense)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>vs Rp0</div>
            </div>

            <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-xl)', textAlign: 'center', border: '1px solid var(--accent-border)', background: 'var(--bg-card)' }}>
              <div style={{ color: 'var(--accent-light)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Perubahan Saldo</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{fmt.format(net)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Selisih Pemasukan - Pengeluaran</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="glass chart-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="chart-title" style={{ margin: 0 }}>Pengeluaran per Kategori</h3>
              </div>
              {expenseData.length === 0 ? (
                <div className="empty-state" style={{ height: 260 }}><span>🥧</span><p>Tidak ada data pengeluaran</p></div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={expenseData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                        {expenseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt.format(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend reports-pie-legend">
                    {expenseData.map((d, i) => (
                      <div key={i} className="legend-item" style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                        <span className="legend-dot" style={{ background: COLORS[i % COLORS.length], width: 12, height: 12, flexShrink: 0 }} />
                        <span className="legend-name" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.icon} {d.name}</span>
                        <span className="legend-value" style={{ fontSize: 13 }}>{fmt.format(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="glass chart-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="chart-title" style={{ margin: 0 }}>Pemasukan per Kategori</h3>
              </div>
              {incomeData.length === 0 ? (
                <div className="empty-state" style={{ height: 260 }}><span>🥧</span><p>Tidak ada data pemasukan</p></div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={incomeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                        {incomeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt.format(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend reports-pie-legend">
                    {incomeData.map((d, i) => (
                      <div key={i} className="legend-item" style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                        <span className="legend-dot" style={{ background: COLORS[i % COLORS.length], width: 12, height: 12, flexShrink: 0 }} />
                        <span className="legend-name" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.icon} {d.name}</span>
                        <span className="legend-value" style={{ fontSize: 13 }}>{fmt.format(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- INVESTMENTS VIEW --- */}
      {mainTab === 'investments' && (
        <div className="animate-fade-in">

          {/* Portfolio Allocation Pie Chart */}
          {(() => {
            // No need to pre-group anymore — we go per-item

            const allocData = [
              // Individual stocks
              ...stockHoldings.map(h => ({
                name: h.ticker,
                label: h.name || h.ticker,
                value: h.avg_price * h.lots * 100,
                icon: '📈',
                sub: `${h.lots} lot · avg ${fmt.format(h.avg_price)}`
              })),
              // Individual cash products by name
              ...cashInvestments.map(inv => {
                const icon = inv.type === 'rdpu' ? '🏦'
                  : inv.type === 'deposito' ? '💎'
                  : inv.type === 'bank_digital' ? '📱'
                  : inv.type === 'obligasi' ? '📜' : '💰'
                const typeLabel = inv.type === 'rdpu' ? 'RDPU'
                  : inv.type === 'deposito' ? 'Deposito'
                  : inv.type === 'bank_digital' ? 'Bank Digital'
                  : inv.type === 'obligasi' ? 'Obligasi' : 'Cash'
                return {
                  name: inv.name,
                  label: inv.name,
                  value: Number(inv.principal),
                  icon,
                  sub: typeLabel
                }
              })
            ].sort((a, b) => b.value - a.value)

            const totalPortfolio = allocData.reduce((s, d) => s + d.value, 0)

            if (totalPortfolio === 0) return null

            const CustomAllocTooltip = ({ active, payload }) => {
              if (active && payload?.length) {
                const d = payload[0].payload
                const i = allocData.findIndex(x => x.name === d.name)
                const color = ALLOC_COLORS[i] || ALLOC_COLORS[0]
                const pct = totalPortfolio > 0 ? ((d.value / totalPortfolio) * 100).toFixed(1) : 0
                return (
                  <div style={{ background: '#1e2740', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 2, fontSize: 13 }}>{d.icon} {d.name}</div>
                    {d.sub && <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>{d.sub}</div>}
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{fmt.format(d.value)}</div>
                    <div style={{ color, fontSize: 13, fontWeight: 700, marginTop: 2 }}>{pct}% dari total</div>
                  </div>
                )
              }
              return null
            }

            return (
              <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-xl)', marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🥧 Alokasi Portofolio</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Total: {fmt.format(totalPortfolio)}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                  {/* Pie */}
                  <div style={{ flex: '0 0 180px', height: 180 }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={allocData}
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {allocData.map((d, i) => (
                            <Cell key={i} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomAllocTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                    {allocData.map((d, i) => {
                      const color = ALLOC_COLORS[i % ALLOC_COLORS.length]
                      const pct = ((d.value / totalPortfolio) * 100).toFixed(1)
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{d.icon} {d.name}</span>
                              {d.sub && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.sub}</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                              {/* Progress bar */}
                              <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{pct}%</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmt.format(d.value)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}

          <div className="invest-tabs" style={{ marginBottom: 24 }}>
            <button
              className={`invest-tab ${investTab === 'stock' ? 'active' : ''}`}
              onClick={() => setInvestTab('stock')}
            >
              📈 Saham IDX
            </button>
            <button
              className={`invest-tab ${investTab === 'cash' ? 'active' : ''}`}
              onClick={() => setInvestTab('cash')}
            >
              💎 Investasi Cash
            </button>
          </div>

          {investTab === 'stock' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <StockWatchlist />
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 28 }}>
                <StockPortfolio holdings={stockHoldings} onRefresh={onRefresh} user={user} />
              </div>
            </div>
          ) : (
            <CashInvestments investments={cashInvestments} onRefresh={onRefresh} user={user} />
          )}
        </div>
      )}
    </div>
  )
}
