import api from './axiosInstance'

export const fetchStockSummary = async () => {
  return api.get('/inventory/stock')
}

export const fetchStockLedger = async (params) => {
  return api.get('/inventory/ledger', { params })
}

export const fetchPurchases = async (params) => {
  return api.get('/purchases', { params })
}

export const createPurchase = async (data) => {
  return api.post('/purchases', data)
}

export const deletePurchase = async (id) => {
  return api.delete(`/purchases/${id}`)
}

export const createAdjustment = async (data) => {
  return api.post('/inventory/adjustment', data)
}

export const updateReorderLevel = async (sku_code, reorder_level) => {
  return api.put(`/inventory/stock/${sku_code}/reorder-level`, { reorder_level })
}

export const fetchLowStockAlerts = async () => {
  return api.get('/inventory/alerts/low-stock')
}
