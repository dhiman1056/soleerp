import api from './axiosInstance'

export const fetchWorkOrders  = (params = {}) => api.get('/work-orders', { params })
export const fetchWorkOrder   = (id)          => api.get(`/work-orders/${id}`)
export const createWorkOrder  = (data)        => api.post('/work-orders', data)
export const receiveWorkOrder = ({ id, ...data }) => api.put(`/work-orders/${id}/receive`, data)
export const deleteWorkOrder  = (id)          => api.delete(`/work-orders/${id}`)
export const fetchWIP         = (params = {}) => api.get('/work-orders/wip', { params })
export const fetchWIPSummary  = ()            => api.get('/work-orders/wip/summary')
