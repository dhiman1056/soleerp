import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'
import toast from 'react-hot-toast'

// ── Stock Summary ─────────────────────────────────────────────────
export const useStock = (params = {}) =>
  useQuery({
    queryKey: ['stock', params],
    queryFn: async () => {
      const res = await api.get('/inventory/stock', { params })
      return res.data?.data ?? { items: [], total: 0 }
    },
  })

export const useLowStock = () =>
  useQuery({
    queryKey: ['lowStockAlerts'],
    queryFn: async () => {
      const res = await api.get('/inventory/alerts/low-stock')
      return res.data?.data ?? []
    },
  })

export const useStockLedger = (params = {}) =>
  useQuery({
    queryKey: ['stockLedger', params],
    queryFn: async () => {
      const res = await api.get('/inventory/ledger', { params })
      return res.data?.data ?? []
    },
  })

// ── Opening Stock ──────────────────────────────────────────────────
export const useAddOpeningStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/inventory/opening-stock', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['stockLedger'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
      toast.success('Opening stock added!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Purchases (legacy simple flow) ────────────────────────────────
export const usePurchases = (params = {}) =>
  useQuery({
    queryKey: ['purchases', params],
    queryFn: async () => {
      const res = await api.get('/inventory/purchases', { params })
      return res.data?.data ?? []
    },
  })

export const useCreatePurchase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/inventory/purchases', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['stockSummary'] })
      qc.invalidateQueries({ queryKey: ['stockLedger'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
      toast.success('Purchase recorded!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const useDeletePurchase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/inventory/purchases/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['stockSummary'] })
      qc.invalidateQueries({ queryKey: ['stockLedger'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
      toast.success('Purchase deleted.')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Adjustments ───────────────────────────────────────────────────
export const useCreateAdjustment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/inventory/adjustment', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockSummary'] })
      qc.invalidateQueries({ queryKey: ['stockLedger'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
      toast.success('Adjustment recorded!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Reorder Level ─────────────────────────────────────────────────
export const useUpdateReorderLevel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sku_code, reorder_level }) =>
      api.put(`/inventory/stock/${sku_code}/reorder-level`, { reorder_level }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Aliases ───────────────────────────────────────────────────────
export const useStockSummaryQuery   = useStock
export const usePurchasesQuery      = usePurchases
export const useStockLedgerQuery    = useStockLedger
export const useLowStockAlertsQuery = useLowStock
