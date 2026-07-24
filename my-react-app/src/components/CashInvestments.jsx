import { useState } from 'react'
import { supabase } from '../utils/supabase'

const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
const fmtNumber = (val) => val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const parseNum = (val) => parseFloat(String(val).replace(/\./g, '')) || 0

const TYPE_LABELS = {
  rdn: { label: 'RDN Wallet', color: '#10b981', icon: '💼' },
  rdpu: { label: 'RDPU', color: '#06b6d4', icon: '🏦' },
  deposito: { label: 'Deposito', color: '#a855f7', icon: '💎' },
  bank_digital: { label: 'Bank Digital', color: '#f59e0b', icon: '📱' },
  obligasi: { label: 'Obligasi', color: '#22c55e', icon: '📜' },
}

const FREQ_LABELS = {
  monthly: 'Bulanan',
  quarterly: '3 Bulanan',
  yearly: 'Tahunan',
}

function getNextCouponDate(couponDay, frequency) {
  const today = new Date()
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (!couponDay) return null

  let next = new Date(now.getFullYear(), now.getMonth(), couponDay)
  if (next <= now) {
    if (frequency === 'monthly') {
      next = new Date(now.getFullYear(), now.getMonth() + 1, couponDay)
    } else if (frequency === 'quarterly') {
      next = new Date(now.getFullYear(), now.getMonth() + 3, couponDay)
    } else {
      next = new Date(now.getFullYear() + 1, now.getMonth(), couponDay)
    }
  }
  return next
}

function daysUntil(date) {
  if (!date) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = date - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function calcMonthlyInterest(principal, returnPct) {
  return principal * (returnPct / 100) / 12
}

function calcAccumulatedInterest(principal, returnPct, startDate) {
  const start = new Date(startDate)
  const now = new Date()
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  return months > 0 ? months * calcMonthlyInterest(principal, returnPct) : 0
}

export default function CashInvestments({ investments, onRefresh, user }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({
    name: '', type: 'rdpu', principal: '', return_pct: '',
    coupon_day: '', coupon_frequency: 'monthly', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Quick-edit principal (inline, number-only)
  const [quickEditId, setQuickEditId] = useState(null)
  const [quickEditValue, setQuickEditValue] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)

  const totalPrincipal = investments.reduce((s, i) => s + Number(i.principal), 0)
  const totalMonthlyReturn = investments.reduce((s, i) => s + calcMonthlyInterest(Number(i.principal), Number(i.return_pct)), 0)

  const handleSave = async (e) => {
    e.preventDefault()
    const isRdn = form.type === 'rdn'
    if (!form.name || !form.principal) { setFormError('Nama dan saldo wajib diisi'); return }
    if (!isRdn && !form.return_pct) { setFormError('Nama, principal, dan return wajib diisi'); return }
    setSaving(true)
    
    const payload = {
      name: form.name,
      type: form.type,
      principal: parseNum(form.principal),
      return_pct: form.type === 'rdn' ? 0 : parseFloat(form.return_pct),
      coupon_day: form.type === 'rdn' ? null : (form.coupon_day ? parseInt(form.coupon_day) : null),
      coupon_frequency: form.coupon_frequency,
      start_date: form.start_date,
      end_date: form.end_date || null,
      notes: form.notes || null,
      user_id: user?.id,
    }

    let error;
    if (editId) {
      const res = await supabase.from('cash_investments').update(payload).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('cash_investments').insert(payload)
      error = res.error
    }

    setSaving(false)
    if (error) {
      // Translate technical DB errors into friendly messages
      const msg = error.message || ''
      let friendlyError = 'Terjadi kesalahan saat menyimpan. Coba lagi.'
      if (msg.includes('type_check') || msg.includes('violates check constraint')) {
        friendlyError = '⚠️ Tipe investasi ini belum didukung oleh database. Hubungi admin untuk menambahkan tipe baru.'
      } else if (msg.includes('not-null') || msg.includes('null value')) {
        friendlyError = '⚠️ Ada kolom wajib yang belum diisi. Pastikan semua field terisi.'
      } else if (msg.includes('duplicate') || msg.includes('unique')) {
        friendlyError = '⚠️ Data ini sudah ada sebelumnya. Gunakan tombol Edit jika ingin mengubahnya.'
      } else if (msg.includes('network') || msg.includes('fetch')) {
        friendlyError = '⚠️ Koneksi internet bermasalah. Periksa koneksi Anda dan coba lagi.'
      } else if (msg.includes('JWT') || msg.includes('auth') || msg.includes('unauthorized')) {
        friendlyError = '⚠️ Sesi Anda telah habis. Silakan refresh halaman dan login kembali.'
      }
      setFormError(friendlyError)
      return
    }
    setForm({ name: '', type: 'rdpu', principal: '', return_pct: '', coupon_day: '', coupon_frequency: 'monthly', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' })
    setShowForm(false)
    setEditId(null)
    onRefresh?.()
  }

  const handleEdit = (item) => {
    setForm({
      name: item.name,
      type: item.type,
      principal: fmtNumber(item.principal.toString()),
      return_pct: item.return_pct.toString(),
      coupon_day: item.coupon_day ? item.coupon_day.toString() : '',
      coupon_frequency: item.coupon_frequency || 'monthly',
      start_date: item.start_date || new Date().toISOString().split('T')[0],
      end_date: item.end_date || '',
      notes: item.notes || ''
    })
    setEditId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus investasi ini?')) return
    await supabase.from('cash_investments').delete().eq('id', id)
    onRefresh?.()
  }

  const handleQuickEdit = (inv) => {
    setQuickEditId(inv.id)
    setQuickEditValue(inv.principal.toString())
  }

  const handleQuickSave = async (id) => {
    const val = parseNum(quickEditValue)
    if (!val || val <= 0) return
    setQuickSaving(true)
    await supabase.from('cash_investments').update({ principal: val }).eq('id', id)
    setQuickSaving(false)
    setQuickEditId(null)
    setQuickEditValue('')
    onRefresh?.()
  }

  return (
    <div className="cash-investments">
      <div className="invest-section-header">
        <div>
          <h3>Investasi Cash</h3>
          <span className="update-time">RDN · RDPU · Deposito · Bank Digital · Obligasi</span>
        </div>
          <button className="btn btn-primary" onClick={() => {
          if (showForm) {
              setShowForm(false)
              setEditId(null)
              setForm({ name: '', type: 'rdpu', principal: '', return_pct: '', coupon_day: '', coupon_frequency: 'monthly', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' })
            } else {
              setShowForm(true)
            }
          }}>
            {showForm ? '✕ Batal' : '+ Tambah'}
          </button>
        </div>

      {/* Summary */}
      {investments.length > 0 && (
        <div className="portfolio-summary glass">
          <div className="portfolio-summary-item">
            <span className="summary-label">Total Principal</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt.format(totalPrincipal)}</span>
          </div>
          <div className="portfolio-summary-item">
            <span className="summary-label">Estimasi / Bulan</span>
            <span style={{ fontWeight: 700, color: 'var(--income)' }}>+{fmt.format(totalMonthlyReturn)}</span>
          </div>
          <div className="portfolio-summary-item">
            <span className="summary-label">Estimasi / Tahun</span>
            <span style={{ fontWeight: 700, color: 'var(--income)' }}>+{fmt.format(totalMonthlyReturn * 12)}</span>
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <form className="invest-form glass animate-fade-up" onSubmit={handleSave}>
          <div className="stock-form-grid">
            <div className="form-group">
              <label>Nama Produk</label>
              <input type="text" placeholder="Bibit Pasar Uang" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Tipe</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value="rdn">💼 RDN Wallet</option>
                <option value="rdpu">🏦 RDPU</option>
                <option value="deposito">💎 Deposito</option>
                <option value="bank_digital">📱 Bank Digital</option>
                <option value="obligasi">📜 Obligasi</option>
              </select>
            </div>
            <div className="form-group">
              <label>Principal (Rp)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>Rp</span>
                <input
                  type="text" inputMode="numeric" placeholder="10.000.000"
                  value={form.principal}
                  onChange={e => setForm(p => ({ ...p, principal: fmtNumber(e.target.value) }))}
                  style={{ paddingLeft: 34 }}
                />
              </div>
            </div>
            {form.type !== 'rdn' && (
              <>
                <div className="form-group">
                  <label>Return % / p.a</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" step="0.01" placeholder="6.5"
                      value={form.return_pct}
                      onChange={e => setForm(p => ({ ...p, return_pct: e.target.value }))}
                      style={{ paddingRight: 34 }}
                    />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>%</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Tanggal Kupon (tgl)</label>
                  <input
                    type="number" min="1" max="31" placeholder="15"
                    value={form.coupon_day}
                    onChange={e => setForm(p => ({ ...p, coupon_day: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Frekuensi Kupon</label>
                  <select value={form.coupon_frequency} onChange={e => setForm(p => ({ ...p, coupon_frequency: e.target.value }))}>
                    <option value="monthly">Bulanan</option>
                    <option value="quarterly">3 Bulanan</option>
                    <option value="yearly">Tahunan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tanggal Mulai</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Jatuh Tempo (opsional)</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
                </div>
              </>
            )}
          </div>
          {form.type === 'rdn' && (
            <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, marginTop: 4, fontSize: 12, color: '#6ee7b7' }}>
              💼 RDN Wallet adalah rekening dana nasabah untuk investasi saham. Tidak menghasilkan bunga secara langsung dan terpisah dari saldo utama Anda.
            </div>
          )}
          <div className="form-group" style={{ marginTop: 4 }}>
            <label>Catatan (opsional)</label>
            <input type="text" placeholder="Catatan tambahan..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : 'Tambah Investasi')}
            </button>
          </div>
        </form>
      )}

      {/* RDN Wallet(s) – pinned at top, separate from main grid */}
      {investments.filter(i => i.type === 'rdn').map(inv => (
        <div key={inv.id} className="glass animate-fade-up" style={{ padding: 20, borderRadius: 'var(--radius-xl)', marginBottom: 16, border: '1px solid rgba(16,185,129,0.3)', background: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(5,150,105,0.04))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💼</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: '0.08em', marginBottom: 2 }}>RDN WALLET</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{inv.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Dana alokasi saham — di luar saldo utama</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{fmt.format(inv.principal)}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => handleEdit(inv)} title="Edit">✏️</button>
                <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 12, background: 'rgba(16,185,129,0.15)', color: '#10b981' }} onClick={() => handleQuickEdit(inv)} title="Update saldo">💰</button>
                <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleDelete(inv.id)}>🗑️</button>
              </div>
            </div>
          </div>
          {quickEditId === inv.id && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none' }}>Rp</span>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  placeholder="Saldo baru"
                  value={fmtNumber(quickEditValue)}
                  onChange={e => setQuickEditValue(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => { if (e.key === 'Enter') handleQuickSave(inv.id); if (e.key === 'Escape') setQuickEditId(null) }}
                  autoFocus
                  style={{ paddingLeft: 34, width: '100%', fontSize: 16, fontWeight: 700, background: 'rgba(16,185,129,0.1)', border: '1.5px solid #10b981', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>
              <button className="btn btn-primary" style={{ padding: '10px 14px', fontSize: 13, background: '#10b981', border: 'none' }} onClick={() => handleQuickSave(inv.id)} disabled={quickSaving}>{quickSaving ? '...' : '✓ Simpan'}</button>
              <button className="btn btn-ghost" style={{ padding: '10px 10px', fontSize: 13 }} onClick={() => setQuickEditId(null)}>✕</button>
            </div>
          )}
          {inv.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, fontStyle: 'italic' }}>📝 {inv.notes}</p>}
        </div>
      ))}

      {investments.filter(i => i.type !== 'rdn').length === 0 && investments.filter(i => i.type === 'rdn').length === 0 ? (
        <div className="empty-state glass"><span>💎</span><p>Belum ada investasi cash</p></div>
      ) : investments.filter(i => i.type !== 'rdn').length > 0 ? (
        <div className="cash-invest-grid">
          {investments.filter(inv => inv.type !== 'rdn').map(inv => {
            const typeInfo = TYPE_LABELS[inv.type] || { label: inv.type, color: '#6366f1', icon: '💰' }
            const nextCoupon = getNextCouponDate(inv.coupon_day, inv.coupon_frequency)
            const daysLeft = daysUntil(nextCoupon)
            const monthlyInterest = calcMonthlyInterest(Number(inv.principal), Number(inv.return_pct))
            const accumulated = calcAccumulatedInterest(Number(inv.principal), Number(inv.return_pct), inv.start_date)

            // Tenor progress
            const start = new Date(inv.start_date)
            const end = inv.end_date ? new Date(inv.end_date) : null
            const now = new Date()
            const tenorPct = end ? Math.min(((now - start) / (end - start)) * 100, 100) : null

            return (
              <div key={inv.id} className="cash-invest-card glass animate-fade-up">
                <div className="cash-invest-header">
                  <div className="cash-invest-type" style={{ background: typeInfo.color + '20', color: typeInfo.color }}>
                    {typeInfo.icon} {typeInfo.label}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => handleEdit(inv)} title="Edit lengkap">✏️</button>
                    <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 12, background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }} onClick={() => handleQuickEdit(inv)} title="Update nominal">💰</button>
                    <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleDelete(inv.id)}>🗑️</button>
                  </div>
                </div>

                <h4 className="cash-invest-name">{inv.name}</h4>

                {/* Quick-edit principal inline */}
                {quickEditId === inv.id && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none' }}>Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Masukkan nominal baru"
                        value={fmtNumber(quickEditValue)}
                        onChange={e => setQuickEditValue(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={e => { if (e.key === 'Enter') handleQuickSave(inv.id); if (e.key === 'Escape') setQuickEditId(null) }}
                        autoFocus
                        style={{
                          paddingLeft: 34, width: '100%', fontSize: 16,
                          fontWeight: 700, letterSpacing: '0.05em',
                          background: 'rgba(99,102,241,0.1)',
                          border: '1.5px solid var(--accent)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '10px 14px', fontSize: 13, whiteSpace: 'nowrap' }}
                      onClick={() => handleQuickSave(inv.id)}
                      disabled={quickSaving}
                    >
                      {quickSaving ? '...' : '✓ Simpan'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '10px 10px', fontSize: 13 }}
                      onClick={() => setQuickEditId(null)}
                    >✕</button>
                  </div>
                )}

                <div className="cash-invest-stats">
                  <div className="cash-stat">
                    <span className="cash-stat-label">Principal</span>
                    <span className="cash-stat-value">{fmt.format(inv.principal)}</span>
                  </div>
                  <div className="cash-stat">
                    <span className="cash-stat-label">Return p.a</span>
                    <span className="cash-stat-value" style={{ color: 'var(--income)' }}>{inv.return_pct}%</span>
                  </div>
                  <div className="cash-stat">
                    <span className="cash-stat-label">Per Bulan</span>
                    <span className="cash-stat-value" style={{ color: 'var(--income)' }}>+{fmt.format(monthlyInterest)}</span>
                  </div>
                  <div className="cash-stat">
                    <span className="cash-stat-label">Akumulasi</span>
                    <span className="cash-stat-value" style={{ color: 'var(--income)' }}>+{fmt.format(accumulated)}</span>
                  </div>
                </div>

                {/* Kupon countdown */}
                {nextCoupon && (
                  <div className={`coupon-badge ${daysLeft <= 7 ? 'urgent' : ''}`}>
                    <span>🎫</span>
                    <span>Kupon {FREQ_LABELS[inv.coupon_frequency]} — tgl {inv.coupon_day}</span>
                    <span className="coupon-days">{daysLeft === 0 ? '🎉 Hari ini!' : `${daysLeft} hari lagi`}</span>
                  </div>
                )}

                {/* Tenor bar */}
                {tenorPct !== null && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>{new Date(inv.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>{new Date(inv.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="budget-progress-bar">
                      <div className="budget-progress-fill" style={{ width: `${tenorPct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-light))' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>{tenorPct.toFixed(0)}% tenor</div>
                  </div>
                )}

                {inv.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, fontStyle: 'italic' }}>📝 {inv.notes}</p>}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
