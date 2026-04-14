import { useQuery } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useProductionSummaryQuery = (params = {}) => {
  return useQuery({
    queryKey: ['report-production', params],
    queryFn: async () => {
      const res = await api.get('/reports/production', { params })
      return res.data?.data ?? {
        summary: {},
        byWoType: [],
        byProduct: [],
        dailyTrend: [],
      }
    },
    enabled: !!params.from_date,
  })
}

export const useMaterialConsumptionQuery = (params = {}) => {
  return useQuery({
    queryKey: ['report-consumption', params],
    queryFn: async () => {
      const res = await api.get('/reports/material-consumption', { params })
      return res.data?.data ?? {
        summary: {},
        byMaterial: [],
        byWorkOrder: [],
      }
    },
    enabled: !!params.from_date,
  })
}

export const useCostSheetQuery = (fgSku, params = {}) => {
  return useQuery({
    queryKey: ['report-cost-sheet', fgSku, params],
    queryFn: async () => {
      const res = await api.get(`/reports/cost-sheet/${fgSku}`, { params })
      return res.data?.data ?? { costSheet: {} }
    },
    enabled: !!fgSku,
  })
}

export const useWipAgingQuery = (params = {}) => {
  return useQuery({
    queryKey: ['report-wip-aging', params],
    queryFn: async () => {
      const res = await api.get('/reports/wip-aging', { params })
      return res.data?.data ?? {
        summary: {},
        aging: [],
        details: [],
      }
    },
  })
}

export const useStockValuationQuery = (params = {}) => {
  return useQuery({
    queryKey: ['report-stock-valuation', params],
    queryFn: async () => {
      const res = await api.get('/reports/stock-valuation', { params })
      return res.data?.data ?? {
        summary: {},
        items: [],
      }
    },
  })
}
