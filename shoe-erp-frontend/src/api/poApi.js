import axiosInstance from './axiosInstance'

export const fetchPOs = (params) => axiosInstance.get('/purchase-orders', { params })
export const fetchPOById = (id) => axiosInstance.get(`/purchase-orders/${id}`)
export const createPO = (data) => axiosInstance.post('/purchase-orders', data)
export const updatePO = ({ id, ...data }) => axiosInstance.put(`/purchase-orders/${id}`, data)
export const sendPO = (id) => axiosInstance.put(`/purchase-orders/${id}/send`)
export const cancelPO = (id) => axiosInstance.put(`/purchase-orders/${id}/cancel`)

export const fetchPOReceipts = (id) => axiosInstance.get(`/purchase-orders/${id}/receipts`)
export const receivePO = ({ id, data }) => axiosInstance.post(`/purchase-orders/${id}/receive`, data)

export const fetchGRNDetail = (grn_no) => axiosInstance.get(`/grn/${grn_no}`)
