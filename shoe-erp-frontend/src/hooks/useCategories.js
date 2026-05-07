import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ─── List (with optional filters) ────────────────────────────────────────────
export const useCategories = (params = {}) => useQuery({
  queryKey: ['categories', params],
  queryFn: async () => {
    const res = await api.get('/categories', { params })
    return res.data?.data ?? []
  }
})

// ─── Single record ────────────────────────────────────────────────────────────
export const useCategory = (id) => useQuery({
  queryKey: ['categories', id],
  queryFn: async () => {
    const res = await api.get(`/categories/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

// ─── Create ───────────────────────────────────────────────────────────────────
export const useCreateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/categories', data),
    onSuccess: () => {
      // Invalidate both the new CRUD query key AND the legacy masters dropdown
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['masters', 'categories'] })
    }
  })
}

// ─── Update ───────────────────────────────────────────────────────────────────
export const useUpdateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/categories/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['masters', 'categories'] })
    }
  })
}

// ─── Delete (soft) ────────────────────────────────────────────────────────────
export const useDeleteCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['masters', 'categories'] })
    }
  })
}
