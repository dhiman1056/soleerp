import api from './axiosInstance'

export const fetchRawMaterials = (params = {}) => api.get('/raw-materials', { params })
export const fetchRawMaterial  = (sku)         => api.get(`/raw-materials/${sku}`)
export const createRawMaterial = (data)        => api.post('/raw-materials', data)
export const updateRawMaterial = ({ sku, ...data }) => api.put(`/raw-materials/${sku}`, data)
export const deleteRawMaterial = (sku)         => api.delete(`/raw-materials/${sku}`)
