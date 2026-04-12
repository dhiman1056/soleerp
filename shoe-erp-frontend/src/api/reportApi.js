import axiosInstance from './axiosInstance'

export const fetchProductionSummary = (params) => axiosInstance.get('/reports/production', { params })
export const fetchMaterialConsumption = (params) => axiosInstance.get('/reports/material-consumption', { params })
export const fetchCostSheet = (fgSku, params) => axiosInstance.get(`/reports/cost-sheet/${fgSku}`, { params })
export const fetchWipAging = (params) => axiosInstance.get('/reports/wip-aging', { params })
export const fetchStockValuation = (params) => axiosInstance.get('/reports/stock-valuation', { params })
