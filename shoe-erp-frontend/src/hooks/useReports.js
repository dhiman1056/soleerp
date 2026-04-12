import { useQuery } from '@tanstack/react-query'
import * as api from '../api/reportApi'

export const useProductionSummaryQuery = (params) => {
  return useQuery({
    queryKey: ['report-production', params],
    queryFn: () => api.fetchProductionSummary(params),
  })
}

export const useMaterialConsumptionQuery = (params) => {
  return useQuery({
    queryKey: ['report-consumption', params],
    queryFn: () => api.fetchMaterialConsumption(params),
  })
}

export const useCostSheetQuery = (fgSku, params) => {
  return useQuery({
    queryKey: ['report-cost-sheet', fgSku, params],
    queryFn: () => api.fetchCostSheet(fgSku, params),
    enabled: !!fgSku,
  })
}

export const useWipAgingQuery = (params) => {
  return useQuery({
    queryKey: ['report-wip-aging', params],
    queryFn: () => api.fetchWipAging(params),
  })
}

export const useStockValuationQuery = (params) => {
  return useQuery({
    queryKey: ['report-stock-valuation', params],
    queryFn: () => api.fetchStockValuation(params),
  })
}
