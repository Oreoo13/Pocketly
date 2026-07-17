import TransactionForm from '../components/TransactionForm'
import TransactionList from '../components/TransactionList'
import ExportButton from '../components/ExportButton'
import { useState } from 'react'

export default function Transactions({ transactions, categories, accounts, onRefresh, user }) {
  const [editTx, setEditTx] = useState(null)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaksi</h1>
          <p className="page-sub">Kelola semua pemasukan dan pengeluaranmu</p>
        </div>
        <ExportButton transactions={transactions} categories={categories} />
      </div>

      <div className="tx-page-grid">
        <div className="tx-form-col">
          <TransactionForm 
            categories={categories} 
            accounts={accounts}
            onSuccess={() => { onRefresh(); setEditTx(null); }} 
            editTx={editTx}
            onCancelEdit={() => setEditTx(null)}
            user={user}
          />
        </div>
        <div className="tx-list-col">
          <TransactionList
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            onRefresh={onRefresh}
            onEdit={(tx) => setEditTx(tx)}
          />
        </div>
      </div>
    </div>
  )
}
