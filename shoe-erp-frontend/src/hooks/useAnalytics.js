import { useQuery } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ── Primary exports (new naming convention) ──────────────────────────────────

export const useAnalyticsOverview = () => {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const res = await api.get('/analytics/overview')
      return res.data?.data ?? {}
    },
    refetchInterval: 300000, // 5 minutes
  })
}

export const useProductionTrend = (period = '30d', groupBy = 'day') => {
  return useQuery({
    queryKey: ['analytics', 'productionTrend', period, groupBy],
    queryFn: async () => {
      const res = await api.get('/analytics/production-trend', {
        params: { period, group_by: groupBy },
      })
      return res.data?.data ?? { labels: [], planned: [], received: [], wip: [] }
    },
  })
}

export const useMaterialConsumptionTrend = (period = '30d') => {
  return useQuery({
    queryKey: ['analytics', 'materialConsumptionTrend', period],
    queryFn: async () => {
      const res = await api.get('/analytics/material-consumption-trend', { params: { period } })
      return res.data?.data ?? { materials: [], series: [] }
    },
  })
}

export const useProductMix = (period = '30d') => {
  return useQuery({
    queryKey: ['analytics', 'productMix', period],
    queryFn: async () => {
      const res = await api.get('/analytics/product-mix', { params: { period } })
      return res.data?.data ?? { labels: [], qty: [], value: [] }
    },
  })
}

export const useWIPByAge = () => {
  return useQuery({
    queryKey: ['analytics', 'wipByAge'],
    queryFn: async () => {
      const res = await api.get('/analytics/wip-by-age')
      return res.data?.data ?? { buckets: [], counts: [], values: [] }
    },
  })
}

export const useSupplierPerformance = (period = '90d') => {
  return useQuery({
    queryKey: ['analytics', 'supplierPerformance', period],
    queryFn: async () => {
      const res = await api.get('/analytics/supplier-performance', { params: { period } })
      // Endpoint may return array or { suppliers: [] } — handle both
      const payload = res.data?.data ?? {}
      return Array.isArray(payload) ? { suppliers: payload } : payload
    },
  })
}

// ── Backward-compatible alias ─────────────────────────────────────────────────
// Dashboard.jsx uses useWipByAge (lowercase 'ip') — keep both names
export const useWipByAge = useWIPByAge

export const useStockMovement = (params = {}) =>
  useQuery({
    queryKey: ['analytics', 'stockMovement', params],
    queryFn: async () => {
      const res = await api.get('/analytics/stock-movement', { params })
      return res.data?.data ?? []
    },
  })

export const useCostTrend = (params = {}) =>
  useQuery({
    queryKey: ['analytics', 'costTrend', params],
    queryFn: async () => {
      const res = await api.get('/analytics/cost-trend', { params })
      return res.data?.data ?? []
    },
  })
