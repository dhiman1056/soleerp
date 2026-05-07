import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ─── List (with optional filters) ────────────────────────────────────────────
export const useBrands = (params = {}) => useQuery({
  queryKey: ['brands', params],
  queryFn: async () => {
    const res = await api.get('/brands', { params })
    return res.data?.data ?? []
  }
})

// ─── Single record ────────────────────────────────────────────────────────────
export const useBrand = (id) => useQuery({
  queryKey: ['brands', id],
  queryFn: async () => {
    const res = await api.get(`/brands/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

// ─── Create ───────────────────────────────────────────────────────────────────
export const useCreateBrand = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/brands', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] })
      // Keep legacy masters dropdown fresh
      qc.invalidateQueries({ queryKey: ['masters', 'brands'] })
    }
  })
}

// ─── Update ───────────────────────────────────────────────────────────────────
export const useUpdateBrand = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/brands/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] })
      qc.invalidateQueries({ queryKey: ['masters', 'brands'] })
    }
  })
}

// ─── Delete (soft) ────────────────────────────────────────────────────────────
export const useDeleteBrand = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/brands/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] })
      qc.invalidateQueries({ queryKey: ['masters', 'brands'] })
    }
  })
}
