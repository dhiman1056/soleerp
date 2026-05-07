import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useGST = (params = {}) => useQuery({
  queryKey: ['gst', params],
  queryFn: async () => {
    const res = await api.get('/gst', { params })
    return res.data?.data ?? []
  }
})

export const useGSTById = (id) => useQuery({
  queryKey: ['gst', id],
  queryFn: async () => {
    const res = await api.get(`/gst/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

export const useCreateGST = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/gst', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gst'] })
  })
}

export const useUpdateGST = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/gst/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gst'] })
  })
}

export const useDeleteGST = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/gst/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gst'] })
  })
}
