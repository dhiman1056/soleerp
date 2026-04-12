import axiosInstance from './axiosInstance'

export const fetchSizes = (params) => axiosInstance.get('/sizes', { params })
export const createSize = (data) => axiosInstance.post('/sizes', data)
export const updateSize = (id, data) => axiosInstance.put(`/sizes/${id}`, data)
export const deleteSize = (id) => axiosInstance.delete(`/sizes/${id}`)
