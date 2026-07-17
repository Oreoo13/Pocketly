import { useState } from 'react'
import { supabase } from '../utils/supabase'

const formatter = new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
})

export default function TransactionList({ transactions, categories, accounts = [], onRefresh, onEdit }) {
  const [deleting, setDeleting] = useState(null)
  const [filter, setFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('')

  const handleDelete = async (id) => {
    if (!confirm('Hapus transaksi ini?')) return
    setDeleting(id)
    await supabase.from('transactions').delete().eq('id', id)
    setDeleting(null)
    onRefresh?.()
  }

  const getCategory = (id) => categories.find(c => c.id === id)
  const getAccount = (id) => accounts.find(a => a.id === id)

  let filtered = [...transactions]
  if (filter !== 'all') filtered = filtered.filter(t => t.type === filter)
  if (monthFilter) {
    const [year, month] = monthFilter.split('-')
    filtered = filtered.filter(t => {
      const d = new Date(t.date)
      return d.getFullYear() === parseInt(year) && d.getMonth() + 1 === parseInt(month)
    })
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="transaction-list">
      <div className="list-header">
        <h3>Riwayat Transaksi</h3>
        <div className="list-filters">
          <input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
          />
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Semua</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span>🗂️</span>
          <p>Belum ada transaksi</p>
        </div>
      ) : (
        <div className="tx-items">
          {filtered.map((tx, i) => {
            const cat = getCategory(tx.category_id)
            return (
              <div key={tx.id} className="tx-item animate-fade-up" style={{ animationDelay: `${i * 0.03}s` }}>
                <div className="tx-icon" style={{ background: cat?.color + '20', color: cat?.color }}>
                  {cat?.icon || '📦'}
                </div>
                <div className="tx-info">
                  <span className="tx-desc">{tx.description || cat?.name || 'Transaksi'}</span>
                  <span className="tx-meta">
                    {cat?.name} · {getAccount(tx.account_id)?.name || 'BBCA'} · {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="tx-right">
                  <span className={`tx-amount ${tx.type}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatter.format(tx.amount)}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--bg-input)' }}
                      onClick={() => onEdit?.(tx)}
                      disabled={deleting === tx.id}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => handleDelete(tx.id)}
                      disabled={deleting === tx.id}
                      title="Hapus"
                    >
                      {deleting === tx.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
