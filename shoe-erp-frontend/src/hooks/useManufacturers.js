import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ─── List (with optional filters) ────────────────────────────────────────────
export const useManufacturers = (params = {}) => useQuery({
  queryKey: ['manufacturers', params],
  queryFn: async () => {
    const res = await api.get('/manufacturers', { params })
    return res.data?.data ?? []
  }
})

// ─── Single record ────────────────────────────────────────────────────────────
export const useManufacturer = (id) => useQuery({
  queryKey: ['manufacturers', id],
  queryFn: async () => {
    const res = await api.get(`/manufacturers/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

// ─── Create ───────────────────────────────────────────────────────────────────
export const useCreateManufacturer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/manufacturers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] })
  })
}

// ─── Update ───────────────────────────────────────────────────────────────────
export const useUpdateManufacturer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/manufacturers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] })
  })
}

// ─── Delete (soft) ────────────────────────────────────────────────────────────
export const useDeleteManufacturer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/manufacturers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] })
  })
}
