import { useState, useCallback, useRef } from 'react'

const CACHE_MS = 5 * 60 * 1000 // 5 menit cache

export function useStockPrices() {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState('')
  const cacheRef = useRef({ data: {}, timestamp: 0, tickers: '' })

  const fetchPrices = useCallback(async (tickers, force = false) => {
    if (!tickers || tickers.length === 0) return

    const tickerKey = [...tickers].sort().join(',')
    if (
      !force &&
      cacheRef.current.tickers === tickerKey &&
      Date.now() - cacheRef.current.timestamp < CACHE_MS
    ) {
      setPrices(cacheRef.current.data)
      setLastUpdated(new Date(cacheRef.current.timestamp))
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = {}
      
      // Fetch concurrent via Vite local proxy ke Yahoo Finance v8 API
      await Promise.all(tickers.map(async (ticker) => {
        const symbol = ticker.endsWith('.JK') ? ticker : `${ticker}.JK`
        try {
          const res = await fetch(`/api/yf/v8/finance/chart/${symbol}?interval=1d&range=1d`)
          if (!res.ok) return
          
          const data = await res.json()
          const meta = data?.chart?.result?.[0]?.meta
          
          if (meta) {
            result[ticker.replace('.JK', '')] = {
              price: meta.regularMarketPrice ?? 0,
              prevClose: meta.previousClose ?? 0,
              change: (meta.regularMarketPrice ?? 0) - (meta.previousClose ?? 0),
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch ${ticker}`, e)
        }
      }))

      if (Object.keys(result).length === 0) {
        throw new Error('Gagal mengambil data harga otomatis dari proxy. Pastikan koneksi internet aktif.')
      }

      cacheRef.current = { data: result, timestamp: Date.now(), tickers: tickerKey }
      setPrices(result)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Stock fetch error:', e)
      setError(e.message)
    }

    setLoading(false)
  }, [])

  return { prices, loading, lastUpdated, error, fetchPrices }
}
