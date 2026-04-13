import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ── Primary exports (new naming convention) ──────────────────────────────────

export const useProducts = (params = {}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const res = await api.get('/products', { params })
      return res.data?.data ?? []
    },
  })
}

export const useProductById = (sku) => {
  return useQuery({
    queryKey: ['products', sku],
    queryFn: async () => {
      const res = await api.get(`/products/${sku}`)
      return res.data?.data ?? null
    },
    enabled: !!sku,
  })
}

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/products', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sku, ...data }) => api.put(`/products/${sku}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useDeleteProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sku) => api.delete(`/products/${sku}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

// ── Backward-compatible aliases ───────────────────────────────────────────────
export const useProductsQuery = useProducts
export const useProductQuery  = useProductById
