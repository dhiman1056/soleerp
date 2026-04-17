import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'
import toast from 'react-hot-toast'

// ── Product list ──────────────────────────────────────────────────────────────
export const useProducts = (params = {}) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const res = await api.get('/products', { params })
      // Return the full response so callers can access meta too
      return {
        records: Array.isArray(res.data?.data) ? res.data.data : [],
        meta:    res.data?.meta ?? {},
      }
    },
  })

// ── Single product ────────────────────────────────────────────────────────────
export const useProductById = (sku) =>
  useQuery({
    queryKey: ['products', sku],
    queryFn: async () => {
      const res = await api.get(`/products/${sku}`)
      return res.data?.data ?? null
    },
    enabled: !!sku,
  })

// ── Next SKU preview ──────────────────────────────────────────────────────────
export const useNextSku = (product_type) =>
  useQuery({
    queryKey: ['next-sku', product_type],
    queryFn: async () => {
      const res = await api.get('/products/next-sku', { params: { product_type } })
      return res.data?.data?.sku_code ?? ''
    },
    enabled: !!product_type,
    staleTime: 0,       // always re-fetch — SKU advances with each creation
    gcTime: 0,
  })

// ── Create ────────────────────────────────────────────────────────────────────
export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/products', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['next-sku'] })
      toast.success('Product created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Update ────────────────────────────────────────────────────────────────────
export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sku, ...data }) => api.put(`/products/${sku}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Delete ────────────────────────────────────────────────────────────────────
export const useDeleteProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sku) => api.delete(`/products/${sku}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deleted.')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Backward-compatible aliases ───────────────────────────────────────────────
export const useProductsQuery = useProducts
export const useProductQuery  = useProductById
