import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useColors = (params = {}) => useQuery({
  queryKey: ['colors', params],
  queryFn: async () => {
    const res = await api.get('/colors', { params })
    return res.data?.data ?? []
  }
})

export const useColor = (id) => useQuery({
  queryKey: ['colors', id],
  queryFn: async () => {
    const res = await api.get(`/colors/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

export const useCreateColor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/colors', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colors'] })
      qc.invalidateQueries({ queryKey: ['masters', 'colors'] })
    }
  })
}

export const useUpdateColor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/colors/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colors'] })
      qc.invalidateQueries({ queryKey: ['masters', 'colors'] })
    }
  })
}

export const useDeleteColor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/colors/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colors'] })
      qc.invalidateQueries({ queryKey: ['masters', 'colors'] })
    }
  })
}
