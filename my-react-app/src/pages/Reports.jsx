import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
const COLORS = ['#4f46e5', '#e11d48', '#16a34a', '#d97706', '#06b6d4', '#8b5cf6', '#db2777', '#2563eb']

export default function Reports({ transactions, categories }) {
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
        <h1 className="page-title">Laporan & Analisis</h1>
      </div>

      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-primary" style={{ borderRadius: 99, padding: '8px 20px' }}>
          <span style={{ fontSize: 16 }}>⏱️</span> Laporan Kategori
        </button>
      </div>

      <div className="glass reports-filter-bar" style={{ padding: '20px 24px', borderRadius: 'var(--radius-xl)', marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>TAHUN</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '12px 16px', background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius-md)' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>BULAN</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ padding: '12px 16px', background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius-md)' }}>
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
            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12, borderRadius: 99 }}>Rincian</button>
          </div>
          {expenseData.length === 0 ? (
            <div className="empty-state" style={{ height: 260 }}><span>🥧</span><p>Tidak ada data</p></div>
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
            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12, borderRadius: 99 }}>Rincian</button>
          </div>
          {incomeData.length === 0 ? (
            <div className="empty-state" style={{ height: 260 }}><span>🥧</span><p>Tidak ada data</p></div>
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
  )
}
