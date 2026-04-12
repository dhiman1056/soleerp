import api from './axiosInstance'

export const fetchProducts = (params = {}) => api.get('/products', { params })
export const fetchProduct  = (sku)         => api.get(`/products/${sku}`)
export const createProduct = (data)        => api.post('/products', data)
export const updateProduct = ({ sku, ...data }) => api.put(`/products/${sku}`, data)
export const deleteProduct = (sku)         => api.delete(`/products/${sku}`)
