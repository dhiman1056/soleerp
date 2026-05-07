import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useDesigns = (params = {}) => useQuery({
  queryKey: ['designs', params],
  queryFn: async () => {
    const res = await api.get('/designs', { params })
    return res.data?.data ?? []
  }
})

export const useDesign = (id) => useQuery({
  queryKey: ['designs', id],
  queryFn: async () => {
    const res = await api.get(`/designs/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

export const useCreateDesign = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/designs', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['designs'] })
      qc.invalidateQueries({ queryKey: ['masters', 'designs'] })
    }
  })
}

export const useUpdateDesign = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/designs/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['designs'] })
      qc.invalidateQueries({ queryKey: ['masters', 'designs'] })
    }
  })
}

export const useDeleteDesign = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/designs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['designs'] })
      qc.invalidateQueries({ queryKey: ['masters', 'designs'] })
    }
  })
}
