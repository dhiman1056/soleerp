import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ── Primary exports (new naming convention) ──────────────────────────────────

export const useStock = (params = {}) => {
  return useQuery({
    queryKey: ['stockSummary', params],
    queryFn: async () => {
      const res = await api.get('/inventory/stock', { params })
      return res.data?.data ?? []
    },
  })
}

export const useLowStock = () => {
  return useQuery({
    queryKey: ['lowStockAlerts'],
    queryFn: async () => {
      const res = await api.get('/inventory/alerts/low-stock')
      return res.data?.data ?? []
    },
  })
}

export const useStockLedger = (params = {}) => {
  return useQuery({
    queryKey: ['stockLedger', params],
    queryFn: async () => {
      const res = await api.get('/inventory/ledger', { params })
      return res.data?.data ?? []
    },
  })
}

// ── Purchases — endpoint lives under /inventory/purchases ────────────────────
export const usePurchases = (params = {}) => {
  return useQuery({
    queryKey: ['purchases', params],
    queryFn: async () => {
      const res = await api.get('/inventory/purchases', { params })
      return res.data?.data ?? []
    },
  })
}

export const useCreatePurchase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/inventory/purchases', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['stockSummary'] })
      qc.invalidateQueries({ queryKey: ['stockLedger'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
    },
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
    },
  })
}

export const useCreateAdjustment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/inventory/adjustment', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockSummary'] })
      qc.invalidateQueries({ queryKey: ['stockLedger'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
    },
  })
}

export const useUpdateReorderLevel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sku_code, reorder_level }) =>
      api.put(`/inventory/stock/${sku_code}/reorder-level`, { reorder_level }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockSummary'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
    },
  })
}

// ── Backward-compatible aliases ───────────────────────────────────────────────
export const useStockSummaryQuery    = useStock
export const usePurchasesQuery       = usePurchases
export const useStockLedgerQuery     = useStockLedger
export const useLowStockAlertsQuery  = useLowStock
