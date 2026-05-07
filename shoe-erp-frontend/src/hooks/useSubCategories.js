import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ─── List (with optional filters) ────────────────────────────────────────────
export const useSubCategories = (params = {}) => useQuery({
  queryKey: ['sub-categories', params],
  queryFn: async () => {
    const res = await api.get('/sub-categories', { params })
    return res.data?.data ?? []
  }
})

// ─── Filtered by category ─────────────────────────────────────────────────────
export const useSubCategoriesByCategory = (categoryId) => useQuery({
  queryKey: ['sub-categories', 'by-category', categoryId],
  queryFn: async () => {
    const res = await api.get('/sub-categories', {
      params: { category_id: categoryId, is_active: 'true' }
    })
    return res.data?.data ?? []
  },
  enabled: !!categoryId
})

// ─── Single record ────────────────────────────────────────────────────────────
export const useSubCategory = (id) => useQuery({
  queryKey: ['sub-categories', id],
  queryFn: async () => {
    const res = await api.get(`/sub-categories/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

// ─── Create ───────────────────────────────────────────────────────────────────
export const useCreateSubCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/sub-categories', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-categories'] })
      // Keep legacy masters dropdown cache fresh too
      qc.invalidateQueries({ queryKey: ['masters', 'sub-categories'] })
    }
  })
}

// ─── Update ───────────────────────────────────────────────────────────────────
export const useUpdateSubCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/sub-categories/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-categories'] })
      qc.invalidateQueries({ queryKey: ['masters', 'sub-categories'] })
    }
  })
}

// ─── Delete (soft) ────────────────────────────────────────────────────────────
export const useDeleteSubCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/sub-categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-categories'] })
      qc.invalidateQueries({ queryKey: ['masters', 'sub-categories'] })
    }
  })
}
