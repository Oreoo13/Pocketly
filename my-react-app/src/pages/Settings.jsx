import { useState } from 'react'
import { supabase } from '../utils/supabase'

export default function Settings({ categories = [], accounts = [], onRefresh, user }) {
  const [activeTab, setActiveTab] = useState('categories') // 'categories' | 'accounts'

  // Category State
  const [catForm, setCatForm] = useState({ id: null, name: '', type: 'expense', icon: '📝', color: '#6366f1' })
  const [loadingCat, setLoadingCat] = useState(false)

  // Account State
  const [accForm, setAccForm] = useState({ id: null, name: '', type: 'bank' })
  const [loadingAcc, setLoadingAcc] = useState(false)

  const PRESET_COLORS = ['#6366f1', '#f43f5e', '#22c55e', '#f59e0b', '#06b6d4', '#a855f7', '#ec4899', '#3b82f6', '#14b8a6', '#f97316']

  // --- Category Handlers ---
  const handleSaveCat = async (e) => {
    e.preventDefault()
    if (!catForm.name || !catForm.icon) return
    setLoadingCat(true)
    
    const payload = {
      name: catForm.name,
      type: catForm.type,
      icon: catForm.icon,
      color: catForm.color,
      user_id: user?.id
    }

    let error;
    if (catForm.id) {
      const res = await supabase.from('categories').update(payload).eq('id', catForm.id)
      error = res.error
    } else {
      const res = await supabase.from('categories').insert(payload)
      error = res.error
    }

    setLoadingCat(false)
    if (error) {
      alert("Gagal menyimpan kategori: " + error.message)
    } else {
      setCatForm({ id: null, name: '', type: 'expense', icon: '📝', color: '#6366f1' })
      onRefresh?.()
    }
  }

  const handleEditCat = (cat) => {
    setCatForm({ id: cat.id, name: cat.name, type: cat.type, icon: cat.icon, color: cat.color })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteCat = async (id) => {
    if (!confirm("Hapus kategori ini? Data transaksi yang menggunakan kategori ini mungkin akan bermasalah.")) return
    await supabase.from('categories').delete().eq('id', id)
    onRefresh?.()
  }

  // --- Account Handlers ---
  const handleSaveAcc = async (e) => {
    e.preventDefault()
    if (!accForm.name) return
    setLoadingAcc(true)

    const payload = {
      name: accForm.name,
      type: accForm.type,
      user_id: user?.id
    }

    let error;
    if (accForm.id) {
      const res = await supabase.from('accounts').update(payload).eq('id', accForm.id)
      error = res.error
    } else {
      const res = await supabase.from('accounts').insert(payload)
      error = res.error
    }

    setLoadingAcc(false)
    if (error) {
      alert("Gagal menyimpan sumber dana: " + error.message)
    } else {
      setAccForm({ id: null, name: '', type: 'bank' })
      onRefresh?.()
    }
  }

  const handleEditAcc = (acc) => {
    setAccForm({ id: acc.id, name: acc.name, type: acc.type })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteAcc = async (id) => {
    if (!confirm("Hapus sumber dana ini? Data transaksi yang menggunakannya mungkin akan terpengaruh.")) return
    await supabase.from('accounts').delete().eq('id', id)
    onRefresh?.()
  }

  return (
    <div className="page animate-fade-up">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="page-title">⚙️ Pengaturan</h1>
        <p className="page-sub">Kelola Data Master Anda</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button 
          style={{ flex: 1, padding: 16, borderRadius: 'var(--radius-lg)', background: activeTab === 'categories' ? 'var(--accent-light)' : 'var(--bg-card)', color: activeTab === 'categories' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: activeTab !== 'categories' ? '1px solid var(--border)' : 'none' }}
          onClick={() => setActiveTab('categories')}
        >
          Kategori Transaksi
        </button>
        <button 
          style={{ flex: 1, padding: 16, borderRadius: 'var(--radius-lg)', background: activeTab === 'accounts' ? 'var(--accent-light)' : 'var(--bg-card)', color: activeTab === 'accounts' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: activeTab !== 'accounts' ? '1px solid var(--border)' : 'none' }}
          onClick={() => setActiveTab('accounts')}
        >
          Sumber Dana
        </button>
      </div>

      {/* Categories Content */}
      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Form */}
          <form className="glass" onSubmit={handleSaveCat} style={{ padding: 24, borderRadius: 'var(--radius-xl)' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{catForm.id ? '✏️ Edit Kategori' : '➕ Tambah Kategori'}</h3>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <button
                type="button"
                style={{ flex: 1, padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--expense-border)', background: catForm.type === 'expense' ? 'var(--expense-bg)' : 'transparent', color: catForm.type === 'expense' ? 'var(--expense)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setCatForm({...catForm, type: 'expense'})}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                style={{ flex: 1, padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--income-border)', background: catForm.type === 'income' ? 'var(--income-bg)' : 'transparent', color: catForm.type === 'income' ? 'var(--income)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setCatForm({...catForm, type: 'income'})}
              >
                Pemasukan
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>ICON</label>
                <input type="text" value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} required style={{ width: '100%', padding: '12px', fontSize: 20, textAlign: 'center', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>NAMA KATEGORI</label>
                <input type="text" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="Misal: Makan, Gaji..." required style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>WARNA</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <button type="button" key={c} onClick={() => setCatForm({...catForm, color: c})} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: catForm.color === c ? '3px solid #fff' : 'none', cursor: 'pointer', outline: catForm.color === c ? `2px solid ${c}` : 'none' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {catForm.id && (
                <button type="button" className="btn btn-ghost" onClick={() => setCatForm({ id: null, name: '', type: 'expense', icon: '📝', color: '#6366f1' })}>Batal</button>
              )}
              <button type="submit" className="btn btn-primary" disabled={loadingCat} style={{ flex: 1 }}>
                {loadingCat ? 'Menyimpan...' : 'Simpan Kategori'}
              </button>
            </div>
          </form>

          {/* List */}
          <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Daftar Kategori</h3>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 13, color: 'var(--expense)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--expense)' }}></span> 
                PENGELUARAN
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                {categories.filter(c => c.type === 'expense').map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${c.color || 'var(--border)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{c.icon}</span>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={() => handleEditCat(c)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                      <button type="button" onClick={() => handleDeleteCat(c.id)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                    </div>
                  </div>
                ))}
                {categories.filter(c => c.type === 'expense').length === 0 && <div className="empty-state" style={{ padding: 12, fontSize: 13 }}>Belum ada kategori pengeluaran</div>}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 13, color: 'var(--income)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--income)' }}></span> 
                PEMASUKAN
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                {categories.filter(c => c.type === 'income').map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${c.color || 'var(--border)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{c.icon}</span>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={() => handleEditCat(c)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                      <button type="button" onClick={() => handleDeleteCat(c.id)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                    </div>
                  </div>
                ))}
                {categories.filter(c => c.type === 'income').length === 0 && <div className="empty-state" style={{ padding: 12, fontSize: 13 }}>Belum ada kategori pemasukan</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Content */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Form */}
          <form className="glass" onSubmit={handleSaveAcc} style={{ padding: 24, borderRadius: 'var(--radius-xl)' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{accForm.id ? '✏️ Edit Sumber Dana' : '➕ Tambah Sumber Dana'}</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>NAMA SUMBER DANA</label>
              <input type="text" value={accForm.name} onChange={e => setAccForm({...accForm, name: e.target.value})} placeholder="Misal: BCA, Gopay, Cash..." required style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>TIPE</label>
              <select value={accForm.type} onChange={e => setAccForm({...accForm, type: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <option value="bank">🏦 Bank / Kartu Debit</option>
                <option value="ewallet">📱 E-Wallet (OVO, Gopay, dll)</option>
                <option value="cash">💵 Uang Tunai / Cash</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {accForm.id && (
                <button type="button" className="btn btn-ghost" onClick={() => setAccForm({ id: null, name: '', type: 'bank' })}>Batal</button>
              )}
              <button type="submit" className="btn btn-primary" disabled={loadingAcc} style={{ flex: 1 }}>
                {loadingAcc ? 'Menyimpan...' : 'Simpan Sumber Dana'}
              </button>
            </div>
          </form>

          {/* List */}
          <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-xl)' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Daftar Sumber Dana</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
              {accounts.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{a.type === 'bank' ? '🏦' : a.type === 'ewallet' ? '📱' : '💵'}</span>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => handleEditAcc(a)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                    <button onClick={() => handleDeleteAcc(a.id)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
            {accounts.length === 0 && <div className="empty-state">Belum ada sumber dana</div>}
          </div>
        </div>
      )}
    </div>
  )
}
