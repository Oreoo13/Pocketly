import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import CategoryTransactionModal from './CategoryTransactionModal'

const formatNumber = (val) => {
  const raw = val.replace(/\D/g, '')
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const parseNumber = (val) => parseFloat(String(val).replace(/\./g, '')) || 0

const formatter = new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
})

export default function BudgetManager({ categories, transactions, accounts = [], user }) {
  const [budgets, setBudgets] = useState([])
  const [form, setForm] = useState({ category_id: '', monthly_limit: '' })
  const [loading, setLoading] = useState(false)
  
  // Modal state
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [modalTx, setModalTx] = useState([])

  const now = new Date()

  const expenseCategories = categories.filter(c => c.type === 'expense')

  useEffect(() => { fetchBudgets() }, [])

  const fetchBudgets = async () => {
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
    setBudgets(data || [])
  }

  const getCategoryTransactions = (categoryId) => {
    const targetCat = categories.find(c => c.id === categoryId)
    if (!targetCat) return []

    return transactions
      .filter(t => {
        const d = new Date(t.date)
        const tCat = categories.find(c => c.id === t.category_id)
        if (!tCat) return false
        const tName = tCat.name.toLowerCase()
        const targetName = targetCat.name.toLowerCase()
        const isMatch = tName === targetName || (tName.includes('investasi') && targetName.includes('investasi'))
        return isMatch &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
      })
  }

  const getSpent = (categoryId) => {
    return getCategoryTransactions(categoryId).reduce((s, t) => {
      if (t.type === 'expense') return s + Number(t.amount)
      if (t.type === 'income') return s - Number(t.amount)
      return s
    }, 0)
  }

  const handleBudgetClick = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId)
    if (!cat) return
    const tx = getCategoryTransactions(categoryId)
    setModalTx(tx)
    setSelectedCategory(cat)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.category_id || !form.monthly_limit) return
    setLoading(true)

    const existing = budgets.find(b => b.category_id === form.category_id)
    if (existing) {
      await supabase.from('budgets').update({ monthly_limit: parseNumber(form.monthly_limit) }).eq('id', existing.id)
    } else {
      await supabase.from('budgets').insert({
        category_id: form.category_id,
        monthly_limit: parseNumber(form.monthly_limit),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        user_id: user?.id,
      })
    }

    setForm({ category_id: '', monthly_limit: '' })
    await fetchBudgets()
    setLoading(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('budgets').delete().eq('id', id)
    fetchBudgets()
  }

  return (
    <div className="budget-manager">
      <div className="budget-header">
        <h2>🎯 Budget Bulan Ini</h2>
        <span className="budget-month">
          {now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Form set budget */}
      <form className="budget-form glass" onSubmit={handleSave}>
        <h3>Set Budget Kategori</h3>
        <div className="budget-form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Kategori</label>
            <select
              value={form.category_id}
              onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
              required
            >
              <option value="">Pilih...</option>
              {expenseCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Limit (Rp)</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none'
              }}>Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="500.000"
                value={form.monthly_limit}
                onChange={e => setForm(p => ({ ...p, monthly_limit: formatNumber(e.target.value) }))}
                style={{ paddingLeft: 34 }}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 22 }}>
            {loading ? '...' : 'Simpan'}
          </button>
        </div>
      </form>

      {/* Budget list */}
      <div className="budget-list">
        {budgets.length === 0 ? (
          <div className="empty-state glass">
            <span>🎯</span>
            <p>Belum ada budget yang diset</p>
          </div>
        ) : (
          budgets.map(b => {
            const cat = categories.find(c => c.id === b.category_id)
            const spent = getSpent(b.category_id)
            const pct = Math.min((spent / b.monthly_limit) * 100, 100)
            const over = spent > b.monthly_limit
            return (
              <div 
                key={b.id} 
                className="budget-item glass animate-fade-up"
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onClick={() => handleBudgetClick(b.category_id)}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)' }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div className="budget-item-header">
                  <div className="budget-cat">
                    <span className="budget-cat-icon" style={{ background: cat?.color + '20' }}>
                      {cat?.icon || '📦'}
                    </span>
                    <span className="budget-cat-name">{cat?.name}</span>
                    {over && <span className="badge" style={{ background: 'var(--expense-bg)', color: 'var(--expense)', border: '1px solid var(--expense-border)', fontSize: '11px' }}>Melebihi!</span>}
                  </div>
                  <div className="budget-amounts">
                    <span style={{ color: over ? 'var(--expense)' : 'var(--text-secondary)', fontWeight: 600 }}>
                      {formatter.format(spent)}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}> / {formatter.format(b.monthly_limit)}</span>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '3px 8px', fontSize: '11px', marginLeft: 8 }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}
                    >🗑️</button>
                  </div>
                </div>
                <div className="budget-progress-bar">
                  <div
                    className="budget-progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: over
                        ? 'linear-gradient(90deg, var(--expense), #ff6b6b)'
                        : pct > 75
                          ? 'linear-gradient(90deg, var(--warning), #fbbf24)'
                          : 'linear-gradient(90deg, var(--income), #4ade80)',
                    }}
                  />
                </div>
                <span className="budget-pct" style={{ color: over ? 'var(--expense)' : 'var(--text-muted)' }}>
                  {pct.toFixed(0)}% terpakai
                </span>
              </div>
            )
          })
        )}
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
