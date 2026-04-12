import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/inventoryApi'

export function useStockSummaryQuery() {
  return useQuery({
    queryKey: ['stockSummary'],
    queryFn: api.fetchStockSummary,
  })
}

export function useStockLedgerQuery(params) {
  return useQuery({
    queryKey: ['stockLedger', params],
    queryFn: () => api.fetchStockLedger(params),
  })
}

export function usePurchasesQuery(params) {
  return useQuery({
    queryKey: ['purchases', params],
    queryFn: () => api.fetchPurchases(params),
  })
}

export function useLowStockAlertsQuery() {
  return useQuery({
    queryKey: ['lowStockAlerts'],
    queryFn: api.fetchLowStockAlerts,
  })
}

export function useCreatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createPurchase,
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
    mutationFn: api.deletePurchase,
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
    mutationFn: api.createAdjustment,
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
    mutationFn: ({ sku_code, reorder_level }) => api.updateReorderLevel(sku_code, reorder_level),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockSummary'] })
      qc.invalidateQueries({ queryKey: ['lowStockAlerts'] })
    },
  })
}
