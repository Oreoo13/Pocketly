import BudgetManager from '../components/BudgetManager'

export default function Budget({ categories, transactions, accounts, user }) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budget</h1>
          <p className="page-sub">Atur batas pengeluaran per kategori</p>
        </div>
      </div>
      <BudgetManager categories={categories} transactions={transactions} accounts={accounts} user={user} />
    </div>
  )
}
