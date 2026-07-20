import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './utils/supabase'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budget from './pages/Budget'
import Analytics from './pages/Analytics'
import Debts from './pages/Debts'
import Settings from './pages/Settings'
import LoginPage from './pages/LoginPage'
import './App.css'

// Inner component that has access to AuthContext
function AppInner() {
  const { session, user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [stockHoldings, setStockHoldings] = useState([])
  const [cashInvestments, setCashInvestments] = useState([])
  const [accounts, setAccounts] = useState([])
  const [budgets, setBudgets] = useState([])
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])

  // Fetch data whenever the user session changes
  useEffect(() => {
    if (session === undefined) return // still loading session
    if (session === null) {
      // Logged out — clear data
      setTransactions([])
      setCategories([])
      setStockHoldings([])
      setCashInvestments([])
      setAccounts([])
      setBudgets([])
      setDebts([])
      setLoading(false)
      return
    }
    fetchAll()
  }, [session]) // eslint-disable-line

  const fetchAll = async () => {
    setLoading(true)
    const [
      { data: txData },
      { data: catData },
      { data: stockData },
      { data: cashData },
      { data: accData },
      { data: budgetData },
      { data: debtData, error: debtError }
    ] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('stock_holdings').select('*').order('created_at'),
      supabase.from('cash_investments').select('*').order('created_at'),
      supabase.from('accounts').select('*').order('name'),
      supabase.from('budgets').select('*'),
      supabase.from('debts').select('*').order('created_at', { ascending: false })
    ])
    if (debtError) console.warn('Skipping debts load:', debtError.message)
    setTransactions(txData || [])
    setCategories(catData || [])
    setStockHoldings(stockData || [])
    setCashInvestments(cashData || [])
    setAccounts(accData || [])
    setBudgets(budgetData || [])
    setDebts(debtData || [])
    setLoading(false)
  }

  // Still checking session
  if (session === undefined) {
    return (
      <div className="loading-screen">
        <div className="loading-icon">💰</div>
        <p>Memuat...</p>
      </div>
    )
  }

  // Not logged in — show login page
  if (!session) {
    return <LoginPage />
  }

  // Loading data
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-icon">💰</div>
        <p>Memuat data...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} user={user} />
      <main className={`main-content ${sidebarOpen ? 'sidebar-is-open' : ''}`}>
        <Routes>
          <Route path="/" element={
            <Dashboard
              transactions={transactions}
              categories={categories}
              cashInvestments={cashInvestments}
              accounts={accounts}
              budgets={budgets}
              debts={debts}
            />
          } />
          <Route path="/transactions" element={
            <Transactions
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              onRefresh={fetchAll}
              user={user}
            />
          } />
          <Route path="/budget" element={<Budget categories={categories} transactions={transactions} accounts={accounts} user={user} />} />
          <Route path="/analytics" element={
            <Analytics 
              transactions={transactions} 
              categories={categories} 
              stockHoldings={stockHoldings} 
              cashInvestments={cashInvestments} 
              onRefresh={fetchAll} 
              user={user} 
            />
          } />
          <Route path="/debts" element={
            <Debts debts={debts} onRefresh={fetchAll} user={user} />
          } />
          <Route path="/settings" element={
            <Settings 
              categories={categories} 
              accounts={accounts} 
              onRefresh={fetchAll} 
              user={user} 
            />
          } />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
