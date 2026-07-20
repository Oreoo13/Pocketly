import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import CategoryTransactionModal from '../components/CategoryTransactionModal'

const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
const COLORS = ['#6366f1', '#f43f5e', '#22c55e', '#f59e0b', '#06b6d4', '#a855f7', '#ec4899', '#3b82f6']

export default function Dashboard({ transactions, categories, cashInvestments, accounts = [], budgets = [], debts = [] }) {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [modalTx, setModalTx] = useState([])
  const now = new Date()

  // Helper untuk mengecek apakah sebuah kategori adalah investasi
  const isInvest = (catId) => {
    const cat = categories.find(c => c.id === catId)
    return cat?.name.toLowerCase().includes('investasi') || false
  }

  // Cash balance (semua waktu - termasuk uang yg digunakan untuk investasi)
  const allIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const allExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const cashBalance = allIncome - allExpense

  // This month
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  
  // Pemasukan & Pengeluaran KONSUMTIF (tanpa investasi)
  const monthIncome = thisMonth.filter(t => t.type === 'income' && !isInvest(t.category_id)).reduce((s, t) => s + Number(t.amount), 0)
  const monthExpense = thisMonth.filter(t => t.type === 'expense' && !isInvest(t.category_id)).reduce((s, t) => s + Number(t.amount), 0)
  const monthNet = monthIncome - monthExpense
  
  // Upcoming coupons (within 7 days)
  const upcomingCoupons = cashInvestments?.filter(inv => {
    if (!inv.coupon_day) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let next = new Date(today.getFullYear(), today.getMonth(), inv.coupon_day)
    if (next <= today) next = new Date(today.getFullYear(), today.getMonth() + 1, inv.coupon_day)
    const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
    return diff <= 7
  }) || []

  // Debts
  const activeReceivables = debts.filter(d => d.type === 'receivable' && d.status === 'active').reduce((s,d) => s + (Number(d.amount) - Number(d.amount_paid)), 0)
  const activeDebts = debts.filter(d => d.type === 'debt' && d.status === 'active').reduce((s,d) => s + (Number(d.amount) - Number(d.amount_paid)), 0)

  // Upcoming Debts (selalu tampilkan jika ada due_date, diurutkan dari yang terdekat)
  const upcomingDebts = debts.filter(d => {
    if (d.status !== 'active' || !d.due_date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let next = new Date(today.getFullYear(), today.getMonth(), d.due_date)
    
    // Jika tanggal jatuh tempo bulan ini sudah lewat, maka tagihan berikutnya adalah bulan depan
    if (next < today) next = new Date(today.getFullYear(), today.getMonth() + 1, d.due_date)
    
    const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
    d.daysLeft = diff
    d.nextDate = next
    return true
  }).sort((a, b) => a.daysLeft - b.daysLeft)

  // Area chart – 6 bulan (hanya arus kas konsumtif)
  const areaData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const m = d.getMonth(), y = d.getFullYear()
    const monthTx = transactions.filter(t => {
      const td = new Date(t.date)
      return td.getMonth() === m && td.getFullYear() === y && !isInvest(t.category_id)
    })
    return {
      name: d.toLocaleDateString('id-ID', { month: 'short' }),
      Income: monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      Expense: monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    }
  })

  // Pie chart (hanya pengeluaran konsumtif)
  const thisMonthExpenses = thisMonth.filter(t => t.type === 'expense' && !isInvest(t.category_id))
  const pieData = Object.values(
    thisMonthExpenses.reduce((acc, t) => {
      const cat = categories.find(c => c.id === t.category_id)
      const name = cat?.name || 'Lainnya'
      if (!acc[name]) acc[name] = { name, value: 0, icon: cat?.icon || '📦' }
      acc[name].value += Number(t.amount)
      return acc
    }, {})
  ).sort((a, b) => b.value - a.value)

  const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  // Budget Progress
  const thisMonthBudgets = budgets.filter(b => b.month === now.getMonth() + 1 && b.year === now.getFullYear())
  const budgetProgress = thisMonthBudgets.map(b => {
    const targetCat = categories.find(c => c.id === b.category_id)
    if (!targetCat) return { ...b, cat: null, spent: 0, pct: 0 }

    const spent = thisMonth.filter(t => {
      const tCat = categories.find(c => c.id === t.category_id)
      if (!tCat) return false
      const tName = tCat.name.toLowerCase()
      const targetName = targetCat.name.toLowerCase()
      return tName === targetName || (tName.includes('investasi') && targetName.includes('investasi'))
    }).reduce((s,t) => {
      if (t.type === 'expense') return s + Number(t.amount)
      if (t.type === 'income') return s - Number(t.amount)
      return s
    }, 0)
    const pct = Math.max(0, Math.min((spent / b.monthly_limit) * 100, 100))
    return { ...b, cat: targetCat, spent, pct }
  }).sort((a,b) => b.pct - a.pct)

  const handleCategoryClick = (categoryName) => {
    const cat = categories.find(c => c.name === categoryName)
    if (!cat) return

    const tx = thisMonth.filter(t => {
      const tCat = categories.find(c => c.id === t.category_id)
      if (!tCat) return false
      const tName = tCat.name.toLowerCase()
      const targetName = cat.name.toLowerCase()
      return tName === targetName || (tName.includes('investasi') && targetName.includes('investasi'))
    })
    
    setModalTx(tx)
    setSelectedCategory(cat)
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) return (
      <div style={{ background: '#1e2740', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: 13, margin: '2px 0' }}>
            {entry.name}: {fmt.format(entry.value)}
          </p>
        ))}
      </div>
    )
    return null
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {upcomingCoupons.length > 0 && (
        <div className="alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 20 }}>🎫</span>
          <div>
            <strong>Kupon Segera: </strong>
            Ada {upcomingCoupons.length} produk investasi cash yang akan membagikan kupon dalam 7 hari ke depan.
          </div>
        </div>
      )}

      {/* Total Saldo Utama */}
      <div className="total-assets-card glass">
        <div className="total-assets-main">
          <span className="total-assets-label">TOTAL SALDO UTAMA</span>
          <span className="total-assets-value">{fmt.format(cashBalance)}</span>
          <div className="total-assets-breakdown" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {accounts.map(acc => {
              const accIncome = transactions.filter(t => t.account_id === acc.id && t.type === 'income').reduce((s,t) => s + Number(t.amount), 0)
              const accExpense = transactions.filter(t => t.account_id === acc.id && t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0)
              return (
                <div key={acc.id} className="breakdown-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{acc.name}:</span>
                  <span style={{ color: 'var(--text-primary)', marginLeft: 6, fontWeight: 600 }}>{fmt.format(accIncome - accExpense)}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="total-assets-sub-cards">
          <div className="sub-card">
            <span className="sub-card-icon" style={{ background: 'var(--income-bg)', color: 'var(--income)' }}>📈</span>
            <div>
              <span className="sub-card-label">Income (Bulan Ini)</span>
              <span className="sub-card-value" style={{ color: 'var(--income)' }}>{fmt.format(monthIncome)}</span>
            </div>
          </div>
          <div className="sub-card">
            <span className="sub-card-icon" style={{ background: 'var(--expense-bg)', color: 'var(--expense)' }}>📉</span>
            <div>
              <span className="sub-card-label">Expense (Bulan Ini)</span>
              <span className="sub-card-value" style={{ color: 'var(--expense)' }}>
                {fmt.format(monthExpense)}
              </span>
            </div>
          </div>
          <div className="sub-card">
            <span className="sub-card-icon" style={{ background: monthNet >= 0 ? 'var(--income-bg)' : 'var(--expense-bg)', color: monthNet >= 0 ? 'var(--income)' : 'var(--expense)' }}>⚖️</span>
            <div>
              <span className="sub-card-label">Net Income (Bulan Ini)</span>
              <span className="sub-card-value" style={{ color: monthNet >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {monthNet > 0 ? '+' : ''}{fmt.format(monthNet)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Debts/Receivables Summary */}
      {(activeDebts > 0 || activeReceivables > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
          {activeReceivables > 0 && (
            <div className="glass" style={{ padding: 16, borderRadius: 'var(--radius-xl)', border: '1px solid var(--income-border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', opacity: 0.8, marginBottom: 4 }}>TOTAL PIUTANG (UANG SAYA DI LUAR)</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--income)' }}>{fmt.format(activeReceivables)}</div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--income-bg)', color: 'var(--income)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✓</div>
              </div>
              
              {upcomingDebts.filter(d => d.type === 'receivable').length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', opacity: 0.8 }}>JATUH TEMPO PIUTANG</div>
                  {upcomingDebts.filter(d => d.type === 'receivable').map(d => {
                    const isCicilan = d.installments > 0
                    const cicilanPerBulan = isCicilan ? Number(d.amount) / d.installments : Number(d.amount) - Number(d.amount_paid)
                    const cicilanLunas = isCicilan ? Math.round(Number(d.amount_paid) / cicilanPerBulan) : 0
                    const sisaCicilan = isCicilan ? d.installments - cicilanLunas : 0
                    return (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{d.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Tagihan: <strong style={{ color: 'var(--income)' }}>{fmt.format(cicilanPerBulan)}</strong>
                            {isCicilan && ` • Sisa ${sisaCicilan}x`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 6, lineHeight: '1.4' }}>
                            <span style={{ fontSize: 11, opacity: 0.8 }}>Tagihan berikutnya:</span><br/>
                            <strong style={{ color: '#fff' }}>{d.nextDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                          </div>
                          <strong style={{ color: 'var(--income)', background: 'var(--income-bg)', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>H-{d.daysLeft}</strong>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          
          {activeDebts > 0 && (
            <div className="glass" style={{ padding: 16, borderRadius: 'var(--radius-xl)', border: '1px solid var(--expense-border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', opacity: 0.8, marginBottom: 4 }}>TOTAL UTANG (SAYA PINJAM UANG)</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--expense)' }}>{fmt.format(activeDebts)}</div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--expense-bg)', color: 'var(--expense)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>↗</div>
              </div>

              {upcomingDebts.filter(d => d.type === 'debt').length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', opacity: 0.8 }}>JATUH TEMPO UTANG & CICILAN</div>
                  {upcomingDebts.filter(d => d.type === 'debt').map(d => {
                    const isCicilan = d.installments > 0
                    const cicilanPerBulan = isCicilan ? Number(d.amount) / d.installments : Number(d.amount) - Number(d.amount_paid)
                    const cicilanLunas = isCicilan ? Math.round(Number(d.amount_paid) / cicilanPerBulan) : 0
                    const sisaCicilan = isCicilan ? d.installments - cicilanLunas : 0
                    return (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{d.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Wajib bayar: <strong style={{ color: 'var(--expense)' }}>{fmt.format(cicilanPerBulan)}</strong>
                            {isCicilan && ` • Sisa ${sisaCicilan}x`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 6, lineHeight: '1.4' }}>
                            <span style={{ fontSize: 11, opacity: 0.8 }}>Tagihan berikutnya:</span><br/>
                            <strong style={{ color: '#fff' }}>{d.nextDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                          </div>
                          <strong style={{ color: 'var(--expense)', background: 'var(--expense-bg)', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>H-{d.daysLeft}</strong>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card glass">
          <h3 className="chart-title">Income & Expense (6 Bulan)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={v => {
                  if (v >= 1000000) return `${(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1).replace('.0', '')}jt`
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}rb`
                  return v
                }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2} fill="url(#income)" />
              <Area type="monotone" dataKey="Expense" stroke="#f43f5e" strokeWidth={2} fill="url(#expense)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card glass">
          <h3 className="chart-title">Expense (Bulan Ini)</h3>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ height: 220 }}><span>📊</span><p>Belum ada pengeluaran</p></div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt.format(v)} contentStyle={{ background: '#1e2740', border: '1px solid var(--border)', borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.slice(0, 4).map((d, i) => (
                  <div 
                    key={i} 
                    className="legend-item" 
                    onClick={() => handleCategoryClick(d.name)}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: '4px', borderRadius: '6px' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="legend-name">{d.icon} {d.name}</span>
                    <span className="legend-value">{fmt.format(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid Bawah: Recent & Budget */}
      <div className="charts-grid" style={{ marginTop: 24 }}>
        <div className="glass recent-card">
          <h3 className="chart-title">Transaksi Terakhir</h3>
          {recent.length === 0 ? (
            <div className="empty-state"><span>💳</span><p>Belum ada transaksi</p></div>
          ) : (
            <div className="tx-items">
              {recent.map(tx => {
                const cat = categories.find(c => c.id === tx.category_id)
                const acc = accounts.find(a => a.id === tx.account_id)
                return (
                  <div key={tx.id} className="tx-item">
                    <div className="tx-icon" style={{ background: (cat?.color || '#6366f1') + '20', color: cat?.color || '#6366f1' }}>{cat?.icon || '📦'}</div>
                    <div className="tx-info">
                      <span className="tx-desc">{tx.description || cat?.name || 'Transaksi'}</span>
                      <span className="tx-meta">{acc?.name || 'BBCA'} · {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <span className={`tx-amount ${tx.type}`}>{tx.type === 'income' ? '+' : '-'}{fmt.format(tx.amount)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="chart-card glass">
          <h3 className="chart-title">Progres Anggaran</h3>
          {budgetProgress.length === 0 ? (
            <div className="empty-state" style={{ height: 220 }}><span>🐷</span><p>Belum ada anggaran bulan ini</p></div>
          ) : (
            <div className="budget-progress-list" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              {budgetProgress.slice(0, 5).map(bp => (
                <div 
                  key={bp.id} 
                  className="budget-progress-item"
                  onClick={() => bp.cat && handleCategoryClick(bp.cat.name)}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: '6px', borderRadius: '8px' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>{bp.cat?.icon} {bp.cat?.name}</span>
                    <span style={{ color: bp.pct >= 100 ? 'var(--expense)' : 'var(--text-primary)' }}>
                      {fmt.format(bp.spent)} / {fmt.format(bp.monthly_limit)}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${bp.pct}%`, background: bp.pct >= 100 ? 'var(--expense)' : bp.pct > 75 ? '#f59e0b' : 'var(--income)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <CategoryTransactionModal
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        category={selectedCategory}
        transactions={modalTx}
        accounts={accounts}
      />
    </div>
  )
}
