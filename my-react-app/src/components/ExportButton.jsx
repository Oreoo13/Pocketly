export default function ExportButton({ transactions, categories }) {
  const handleExport = () => {
    const headers = ['Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Nominal']
    const rows = transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(t => {
        const cat = categories.find(c => c.id === t.category_id)
        return [
          t.date,
          t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
          cat?.name || '-',
          t.description || '-',
          t.amount,
        ]
      })

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transaksi_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button className="btn btn-ghost" onClick={handleExport}>
      📤 Export CSV
    </button>
  )
}
