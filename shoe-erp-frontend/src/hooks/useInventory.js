import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../api/axiosInstance'

export function useStockSummaryQuery() {
  return useQuery({
    queryKey: ['stockSummary'],
    queryFn:  async () => {
      const res = await axiosInstance.get('/inventory/stock')
      return res.data?.data ?? []
    },
  })
}

export function useStockLedgerQuery(params) {
  return useQuery({
    queryKey: ['stockLedger', params],
    queryFn:  async () => {
      const res = await axiosInstance.get('/inventory/ledger', { params })
      return res.data?.data ?? []
    },
  })
}

export function usePurchasesQuery(params) {
  return useQuery({
    queryKey: ['purchases', params],
    queryFn:  async () => {
      const res = await axiosInstance.get('/purchases', { params })
      return res.data?.data ?? []
    },
  })
}

export function useLowStockAlertsQuery() {
  return useQuery({
    queryKey: ['lowStockAlerts'],
    queryFn:  async () => {
      const res = await axiosInstance.get('/inventory/alerts/low-stock')
      return res.data?.data ?? []
    },
  })
}

export function useCreatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => axiosInstance.post('/purchases', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['stockSummary'] })
      qc.invalidateQueries({ queryKey: ['stockLedger'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
    },
  })
}

export function useDeletePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => axiosInstance.delete(`/purchases/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['stockSummary'] })
      qc.invalidateQueries({ queryKey: ['stockLedger'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
    },
  })
}

export function useCreateAdjustment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => axiosInstance.post('/inventory/adjustment', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockSummary'] })
      qc.invalidateQueries({ queryKey: ['stockLedger'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
    },
  })
}

export function useUpdateReorderLevel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sku_code, reorder_level }) =>
      axiosInstance.put(`/inventory/stock/${sku_code}/reorder-level`, { reorder_level }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockSummary'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
    },
  })
}
