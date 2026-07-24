import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

const formatNumber = (val) => {
  const raw = String(val).replace(/\D/g, '')
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const parseNumber = (val) => parseFloat(String(val).replace(/\./g, '')) || 0

export default function TransactionForm({ categories, accounts = [], cashInvestments = [], onSuccess, editTx, onCancelEdit, user }) {
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category_id: '',
    account_id: accounts.length > 0 ? accounts[0].id : '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false) // collapsed by default on mobile

  useEffect(() => {
    if (editTx) {
      setForm({
        type: editTx.type,
        amount: formatNumber(String(editTx.amount)),
        category_id: editTx.category_id,
        account_id: editTx.account_id || (accounts.length > 0 ? accounts[0].id : ''),
        description: editTx.description || '',
        date: new Date(editTx.date).toISOString().split('T')[0],
      })
    } else {
      setForm({
        type: 'expense',
        amount: '',
        category_id: '',
        account_id: accounts.length > 0 ? accounts[0].id : '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      })
    }
  }, [editTx, accounts])

  const filtered = categories.filter(c => c.type === form.type)

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'amount') {
      setForm(prev => ({ ...prev, amount: formatNumber(value) }))
      return
    }
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'type' ? { category_id: '' } : {}),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || !form.category_id) {
      setError('Nominal dan kategori wajib diisi')
      return
    }
    setLoading(true)
    setError('')

    let err
    if (editTx) {
      const res = await supabase.from('transactions').update({
        type: form.type,
        amount: parseNumber(form.amount),
        category_id: form.category_id,
        account_id: form.account_id,
        description: form.description,
        date: form.date,
      }).eq('id', editTx.id)
      err = res.error
    } else {
      const res = await supabase.from('transactions').insert({
        type: form.type,
        amount: parseNumber(form.amount),
        category_id: form.category_id,
        account_id: form.account_id,
        description: form.description,
        date: form.date,
        user_id: user?.id,
      })
      err = res.error
    }

    setLoading(false)
    if (err) {
      setError('Gagal menyimpan transaksi. Periksa koneksi internet Anda.')
      return
    }

    // Auto-sync investment principal if category is linked
    if (form.category_id) {
      const cat = categories.find(c => c.id === form.category_id)
      if (cat?.linked_investment_id) {
        const inv = cashInvestments.find(i => i.id === cat.linked_investment_id)
        if (inv) {
          const newAmount = parseNumber(form.amount)
          // Expense adds to investment, Income subtracts from investment
          const newDelta = form.type === 'expense' ? newAmount : -newAmount
          let totalDelta = newDelta

          // If editing, reverse the old amount first
          if (editTx) {
            const oldCat = categories.find(c => c.id === editTx.category_id)
            const oldAmountNum = Number(editTx.amount)
            const oldDelta = editTx.type === 'expense' ? oldAmountNum : -oldAmountNum
            
            if (oldCat?.linked_investment_id === cat.linked_investment_id) {
              totalDelta = newDelta - oldDelta
            } else {
              // Old category was linked to a different investment — reverse old
              if (oldCat?.linked_investment_id) {
                const oldInv = cashInvestments.find(i => i.id === oldCat.linked_investment_id)
                if (oldInv) {
                  await supabase.from('cash_investments')
                    .update({ principal: Math.max(0, Number(oldInv.principal) - oldDelta) })
                    .eq('id', oldInv.id)
                }
              }
            }
          }
          const updatedPrincipal = Math.max(0, Number(inv.principal) + totalDelta)
          await supabase.from('cash_investments')
            .update({ principal: updatedPrincipal })
            .eq('id', inv.id)
        }
      } else if (editTx) {
        // New category has no link, but old one might — reverse old
        const oldCat = categories.find(c => c.id === editTx.category_id)
        if (oldCat?.linked_investment_id) {
          const oldInv = cashInvestments.find(i => i.id === oldCat.linked_investment_id)
          if (oldInv) {
            const oldAmountNum = Number(editTx.amount)
            const oldDelta = editTx.type === 'expense' ? oldAmountNum : -oldAmountNum
            await supabase.from('cash_investments')
              .update({ principal: Math.max(0, Number(oldInv.principal) - oldDelta) })
              .eq('id', oldInv.id)
          }
        }
      }
    }

    setForm({
      type: 'expense',
      amount: '',
      category_id: '',
      account_id: accounts.length > 0 ? accounts[0].id : '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    })
    onSuccess?.()
  }

  return (
    <div className="transaction-form-wrapper">
      {/* Mobile toggle button (only visible on mobile via CSS) */}
      <button
        type="button"
        className="form-mobile-toggle"
        onClick={() => setFormOpen(v => !v)}
      >
        <span>{formOpen ? '✕' : '+'}</span>
        <span>{formOpen ? 'Tutup Form' : 'Tambah Transaksi'}</span>
      </button>

    <form className={`transaction-form glass form-collapsible ${formOpen ? 'form-expanded' : ''}`} onSubmit={handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="form-title" style={{ margin: 0 }}>{editTx ? '✏️ Edit Transaksi' : 'Tambah Transaksi'}</h3>
        {editTx && (
          <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 13 }} onClick={onCancelEdit}>Batal</button>
        )}
      </div>

      {/* Type toggle */}
      <div className="type-toggle">
        <button
          type="button"
          className={`type-btn ${form.type === 'expense' ? 'active-expense' : ''}`}
          onClick={() => setForm(p => ({ ...p, type: 'expense', category_id: '' }))}
        >
          📉 Pengeluaran
        </button>
        <button
          type="button"
          className={`type-btn ${form.type === 'income' ? 'active-income' : ''}`}
          onClick={() => setForm(p => ({ ...p, type: 'income', category_id: '' }))}
        >
          📈 Pemasukan
        </button>
      </div>

      <div className="form-group">
        <label>Nominal (Rp)</label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none'
          }}>Rp</span>
          <input
            type="text"
            inputMode="numeric"
            name="amount"
            placeholder="0"
            value={form.amount}
            onChange={handleChange}
            style={{ paddingLeft: 34 }}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Kategori</label>
        <select name="category_id" value={form.category_id} onChange={handleChange} required>
          <option value="">Pilih kategori...</option>
          {filtered.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        {/* Investment link indicator */}
        {(() => {
          const cat = categories.find(c => c.id === form.category_id)
          const inv = cat?.linked_investment_id ? cashInvestments.find(i => i.id === cat.linked_investment_id) : null
          if (!inv) return null
          
          if (form.type === 'expense') {
            return (
              <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, fontSize: 13, color: '#6ee7b7', lineHeight: 1.4 }}>
                💼 Pengeluaran ini akan otomatis <strong>menambah</strong> saldo <strong style={{ color: '#10b981' }}>{inv.name}</strong>
              </div>
            )
          } else {
            return (
              <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 8, fontSize: 13, color: '#fda4af', lineHeight: 1.4 }}>
                💸 Pemasukan ini akan otomatis <strong>mengurangi</strong> saldo <strong style={{ color: '#f43f5e' }}>{inv.name}</strong> (Refund/Withdraw)
              </div>
            )
          }
        })()}
      </div>

      <div className="form-group">
        <label>Sumber Dana (Rekening)</label>
        <select name="account_id" value={form.account_id} onChange={handleChange} required>
          <option value="">Pilih rekening...</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.type === 'bank' ? '🏦' : acc.type === 'ewallet' ? '📱' : '💵'} {acc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Deskripsi (opsional)</label>
        <input
          type="text"
          name="description"
          placeholder="Catatan..."
          value={form.description}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>Tanggal</label>
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          required
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
        {loading ? 'Menyimpan...' : editTx ? 'Update Transaksi' : '+ Simpan Transaksi'}
      </button>
    </form>
    </div>
  )
}
