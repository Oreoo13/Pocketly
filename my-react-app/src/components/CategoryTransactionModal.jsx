import { useEffect } from 'react'

const formatter = new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
})

export default function CategoryTransactionModal({ isOpen, onClose, category, transactions = [], accounts = [] }) {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen || !category) return null

  const getAccount = (id) => accounts.find(a => a.id === id)

  // Sort by date descending
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="modal-content glass animate-fade-up" onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-primary)', width: '100%', maxWidth: '500px',
        maxHeight: '85vh', borderRadius: 'var(--radius-xl)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: category.color + '20', color: category.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {category.icon || '📦'}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>{category.name}</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{sorted.length} Transaksi Bulan Ini</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {sorted.length === 0 ? (
            <div className="empty-state" style={{ height: 200 }}>
              <span style={{ fontSize: 40 }}>📭</span>
              <p>Tidak ada transaksi</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sorted.map((tx, i) => {
                const acc = getAccount(tx.account_id)
                return (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{tx.description || category.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {acc && ` · ${acc.name}`}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: tx.type === 'income' ? 'var(--income)' : 'var(--text-primary)' }}>
                      {tx.type === 'income' ? '+' : '-'}{formatter.format(tx.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
