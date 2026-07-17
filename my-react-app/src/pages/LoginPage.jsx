import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!email || !password) {
      setError('Email dan password wajib diisi')
      return
    }

    if (tab === 'register') {
      if (password !== confirmPassword) {
        setError('Password tidak cocok')
        return
      }
      if (password.length < 6) {
        setError('Password minimal 6 karakter')
        return
      }
    }

    setLoading(true)

    if (tab === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        if (error.message.includes('Invalid login')) {
          setError('Email atau password salah')
        } else {
          setError(error.message)
        }
      }
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        if (error.message.includes('already registered')) {
          setError('Email sudah terdaftar, silakan login')
        } else {
          setError(error.message)
        }
      } else {
        setSuccessMsg('Akun berhasil dibuat! Silakan cek email untuk konfirmasi (atau langsung login jika konfirmasi dimatikan).')
        setTab('login')
        setPassword('')
        setConfirmPassword('')
      }
    }

    setLoading(false)
  }

  return (
    <div className="login-page">
      {/* Ambient background blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />

      <div className="login-card glass">
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="login-logo">💰</div>
          <h1 className="login-title">Pocketly</h1>
          <p className="login-subtitle">Pantau keuanganmu dengan lebih cerdas</p>
        </div>

        {/* Tab switch */}
        <div className="login-tabs">
          <button
            className={`login-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); setSuccessMsg('') }}
            type="button"
          >
            Masuk
          </button>
          <button
            className={`login-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); setSuccessMsg('') }}
            type="button"
          >
            Daftar
          </button>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">✉️</span>
              <input
                id="email"
                type="email"
                placeholder="kamu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">🔒</span>
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
              />
              <button
                type="button"
                className="pwd-toggle"
                onClick={() => setShowPwd(v => !v)}
                tabIndex={-1}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {tab === 'register' && (
            <div className="login-field">
              <label htmlFor="confirm-password">Konfirmasi Password</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">🔒</span>
                <input
                  id="confirm-password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          {error && (
            <div className="login-error">
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div className="login-success">
              ✅ {successMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading}
          >
            {loading
              ? 'Memproses...'
              : tab === 'login' ? '🚀 Masuk' : '✨ Buat Akun'}
          </button>
        </form>

        <p className="login-footer-note">
          {tab === 'login'
            ? <>Belum punya akun? <button type="button" className="link-btn" onClick={() => { setTab('register'); setError('') }}>Daftar gratis</button></>
            : <>Sudah punya akun? <button type="button" className="link-btn" onClick={() => { setTab('login'); setError('') }}>Masuk</button></>
          }
        </p>
      </div>
    </div>
  )
}
