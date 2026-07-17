import { useState } from 'react'
import { supabase } from '../utils/supabase'

const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
const formatNumber = (val) => String(val).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const parseNumber = (val) => parseFloat(String(val).replace(/\./g, '')) || 0

export default function Debts({ debts = [], onRefresh, user }) {
  const [activeTab, setActiveTab] = useState('receivable') // 'receivable' | 'debt'
  const [statusFilter, setStatusFilter] = useState('active') // 'active' | 'paid'
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [isPaying, setIsPaying] = useState(null) // ID of debt being paid
  const [form, setForm] = useState({ name: '', amount: '', installments: '', due_date: '' })
  const [payAmount, setPayAmount] = useState('')

  const activeReceivables = debts.filter(d => d.type === 'receivable' && d.status === 'active').reduce((s,d) => s + (Number(d.amount) - Number(d.amount_paid)), 0)
  const activeDebts = debts.filter(d => d.type === 'debt' && d.status === 'active').reduce((s,d) => s + (Number(d.amount) - Number(d.amount_paid)), 0)

  const filteredList = debts.filter(d => d.type === activeTab && d.status === statusFilter)

  const openEditModal = (item) => {
    setForm({
      name: item.name,
      amount: formatNumber(item.amount),
      installments: item.installments || '',
      due_date: item.due_date || '',
    })
    setEditId(item.id)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setForm({ name: '', amount: '', installments: '', due_date: '' })
    setIsModalOpen(false)
    setEditId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.amount) return
    
    if (editId) {
      const { error } = await supabase.from('debts').update({
        name: form.name,
        amount: parseNumber(form.amount),
        installments: parseInt(form.installments) || 0,
        due_date: parseInt(form.due_date) || null,
      }).eq('id', editId)
      
      if (error) alert(error.message)
      else { closeModal(); onRefresh?.() }
    } else {
      const { error } = await supabase.from('debts').insert({
        type: activeTab,
        name: form.name,
        amount: parseNumber(form.amount),
        amount_paid: 0,
        installments: parseInt(form.installments) || 0,
        due_date: parseInt(form.due_date) || null,
        status: 'active',
        user_id: user?.id,
      })
      if (error) alert("Pastikan Anda sudah me-run SQL untuk tabel debts di Supabase!\n\n" + error.message)
      else { closeModal(); onRefresh?.() }
    }
  }

  const handlePay = async (e, debt) => {
    e.preventDefault()
    if (!payAmount) return
    const newPaid = Number(debt.amount_paid) + parseNumber(payAmount)
    const newStatus = newPaid >= Number(debt.amount) ? 'paid' : 'active'
    
    await supabase.from('debts').update({
      amount_paid: newPaid,
      status: newStatus
    }).eq('id', debt.id)
    
    setIsPaying(null)
    setPayAmount('')
    onRefresh?.()
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus catatan ini?')) return
    await supabase.from('debts').delete().eq('id', id)
    onRefresh?.()
  }

  return (
    <div className="page animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Utang Piutang</h1>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setIsModalOpen(true); }}>
          + Tambah Catatan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="debts-summary-grid">
        <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-xl)', border: '1px solid var(--income-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--income-bg)', color: 'var(--income)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Total Piutang Aktif</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--income)', marginBottom: 4 }}>{fmt.format(activeReceivables)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uang yang dipinjamkan ke orang lain (Sisa Belum Dibayar)</div>
        </div>

        <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-xl)', border: '1px solid var(--expense-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--expense-bg)', color: 'var(--expense)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↗</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Total Utang Aktif</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--expense)', marginBottom: 4 }}>{fmt.format(activeDebts)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uang yang dipinjam dari orang lain (Sisa Belum Dibayar)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="debts-filter-row">
        <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <button 
            style={{ padding: '8px 24px', border: 'none', background: statusFilter === 'active' ? 'var(--accent-light)' : 'transparent', color: statusFilter === 'active' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setStatusFilter('active')}
          >
            Aktif
          </button>
          <button 
            style={{ padding: '8px 24px', border: 'none', background: statusFilter === 'paid' ? 'var(--accent-light)' : 'transparent', color: statusFilter === 'paid' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setStatusFilter('paid')}
          >
            Lunas
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="debts-tabs">
        <button 
          style={{ flex: 1, padding: 16, borderRadius: 'var(--radius-lg)', background: activeTab === 'receivable' ? 'var(--income)' : 'var(--bg-card)', color: activeTab === 'receivable' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: activeTab !== 'receivable' ? '1px solid var(--border)' : 'none' }}
          onClick={() => setActiveTab('receivable')}
        >
          ✓ Saya Meminjamkan (Piutang)
        </button>
        <button 
          style={{ flex: 1, padding: 16, borderRadius: 'var(--radius-lg)', background: activeTab === 'debt' ? 'var(--expense)' : 'var(--bg-card)', color: activeTab === 'debt' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: activeTab !== 'debt' ? '1px solid var(--border)' : 'none' }}
          onClick={() => setActiveTab('debt')}
        >
          ↗ Saya Meminjam (Utang)
        </button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredList.length === 0 ? (
          <div className="empty-state">
            <span>🗂️</span>
            <p>Tidak ada data untuk filter ini.</p>
          </div>
        ) : (
          filteredList.map(item => {
            const pct = Math.min((Number(item.amount_paid) / Number(item.amount)) * 100, 100)
            const sisa = Number(item.amount) - Number(item.amount_paid)
            
            const isCicilan = item.installments > 0
            const cicilanPerBulan = isCicilan ? Number(item.amount) / item.installments : 0
            const cicilanLunas = isCicilan ? Math.round(Number(item.amount_paid) / cicilanPerBulan) : 0
            
            return (
              <div key={item.id} className="glass debts-item" style={{ padding: 20, borderRadius: 'var(--radius-lg)' }}>
                <div className="debts-item-header">
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{item.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Total: {fmt.format(item.amount)} · Dibayar: {fmt.format(item.amount_paid)}
                      {isCicilan && ` (${cicilanLunas}/${item.installments} cicilan)`}
                    </p>
                    {item.due_date && (
                      <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>
                        🗓️ Jatuh tempo: Setiap Tgl {item.due_date}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: activeTab === 'receivable' ? 'var(--income)' : 'var(--expense)' }}>
                      Sisa: {fmt.format(sisa)}
                    </div>
                  </div>
                </div>

                <div style={{ width: '100%', height: 8, background: 'rgba(0,0,0,0.05)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? 'var(--income)' : 'var(--accent-light)', transition: 'width 0.3s' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => openEditModal(item)}>✏️ Edit</button>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => handleDelete(item.id)}>🗑️ Hapus</button>
                  {statusFilter === 'active' && (
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => {
                      setIsPaying(item.id)
                      if (isCicilan) setPayAmount(formatNumber(String(Math.ceil(cicilanPerBulan))))
                      else setPayAmount('')
                    }}>Bayar Cicilan</button>
                  )}
                </div>

                {/* Inline Pay Form */}
                {isPaying === item.id && (
                  <form onSubmit={(e) => handlePay(e, item)} style={{ marginTop: 16, padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      placeholder="Nominal Pembayaran" 
                      value={payAmount}
                      onChange={e => setPayAmount(formatNumber(e.target.value))}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                      autoFocus
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px' }}>Simpan</button>
                    <button type="button" className="btn btn-ghost" style={{ padding: '10px 16px' }} onClick={() => setIsPaying(null)}>Batal</button>
                  </form>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="glass animate-fade-up" style={{ width: '100%', maxWidth: 400, padding: 24, borderRadius: 'var(--radius-xl)', background: 'var(--bg-secondary)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
              {editId ? 'Edit' : 'Tambah'} {activeTab === 'receivable' ? 'Piutang' : 'Utang'} {editId ? '' : 'Baru'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>NAMA / KETERANGAN</label>
                <input 
                  type="text" 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Cth: Pinjaman ke Budi, Cicilan iPhone..."
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>TOTAL NOMINAL (RP)</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={form.amount}
                  onChange={e => setForm({...form, amount: formatNumber(e.target.value)})}
                  placeholder="0"
                  required
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>JUMLAH CICILAN (KALI)</label>
                <input 
                  type="number" 
                  min="1"
                  value={form.installments}
                  onChange={e => setForm({...form, installments: e.target.value})}
                  placeholder="Kosongkan jika bukan cicilan"
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>TANGGAL JATUH TEMPO (1-31)</label>
                <input 
                  type="number" 
                  min="1"
                  max="31"
                  value={form.due_date}
                  onChange={e => setForm({...form, due_date: e.target.value})}
                  placeholder="Contoh: 15 (Kosongkan jika tidak ada)"
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={closeModal}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
