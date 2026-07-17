const formatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

export default function SummaryCards({ transactions }) {
  const now = new Date()
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  // Total keseluruhan (semua waktu) untuk saldo
  const allIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const allExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = allIncome - allExpense

  // Bulan ini untuk pemasukan & pengeluaran
  const monthIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const monthExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  const monthName = now.toLocaleDateString('id-ID', { month: 'long' })

  const cards = [
    {
      label: 'Total Saldo',
      sublabel: 'Semua waktu',
      value: formatter.format(balance),
      icon: '💰',
      color: balance >= 0 ? 'var(--income)' : 'var(--expense)',
      bg: balance >= 0 ? 'var(--income-bg)' : 'var(--expense-bg)',
      border: balance >= 0 ? 'var(--income-border)' : 'var(--expense-border)',
    },
    {
      label: 'Pemasukan',
      sublabel: monthName,
      value: formatter.format(monthIncome),
      icon: '📈',
      color: 'var(--income)',
      bg: 'var(--income-bg)',
      border: 'var(--income-border)',
    },
    {
      label: 'Pengeluaran',
      sublabel: monthName,
      value: formatter.format(monthExpense),
      icon: '📉',
      color: 'var(--expense)',
      bg: 'var(--expense-bg)',
      border: 'var(--expense-border)',
    },
  ]

  return (
    <div className="summary-grid">
      {cards.map((card, i) => (
        <div
          key={i}
          className="summary-card glass animate-fade-up"
          style={{ animationDelay: `${i * 0.08}s`, borderColor: card.border }}
        >
          <div className="summary-icon" style={{ background: card.bg, color: card.color }}>
            {card.icon}
          </div>
          <div className="summary-info">
            <span className="summary-label">{card.label}</span>
            <span className="summary-value" style={{ color: card.color }}>{card.value}</span>
            <span className="summary-sublabel">{card.sublabel}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
