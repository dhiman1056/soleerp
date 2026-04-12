import axiosInstance from './axiosInstance'

export const fetchSuppliers = (params) => axiosInstance.get('/suppliers', { params })
export const fetchSupplierById = (id) => axiosInstance.get(`/suppliers/${id}`)
export const createSupplier = (data) => axiosInstance.post('/suppliers', data)
export const updateSupplier = ({ id, ...data }) => axiosInstance.put(`/suppliers/${id}`, data)
export const deleteSupplier = (id) => axiosInstance.delete(`/suppliers/${id}`)

export const fetchSupplierLedger = ({ id, params }) => axiosInstance.get(`/suppliers/${id}/ledger`, { params })
export const recordPayment = ({ id, data }) => axiosInstance.post(`/suppliers/${id}/payment`, data)
