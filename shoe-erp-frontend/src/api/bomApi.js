import api from './axiosInstance'

export const fetchBOMs  = (params = {}) => api.get('/bom', { params })
export const fetchBOM   = (id)          => api.get(`/bom/${id}`)
export const createBOM  = (data)        => api.post('/bom', data)
export const updateBOM  = ({ id, ...data }) => api.put(`/bom/${id}`, data)
export const deleteBOM  = (id)          => api.delete(`/bom/${id}`)
