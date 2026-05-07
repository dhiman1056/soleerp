import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useHSN = (params = {}) => useQuery({
  queryKey: ['hsn', params],
  queryFn: async () => {
    const res = await api.get('/hsn', { params })
    return res.data?.data ?? []
  }
})

export const useHSNById = (id) => useQuery({
  queryKey: ['hsn', id],
  queryFn: async () => {
    const res = await api.get(`/hsn/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

export const useCreateHSN = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/hsn', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hsn'] })
      qc.invalidateQueries({ queryKey: ['masters', 'hsn'] })
    }
  })
}

export const useUpdateHSN = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/hsn/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hsn'] })
      qc.invalidateQueries({ queryKey: ['masters', 'hsn'] })
    }
  })
}

export const useDeleteHSN = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/hsn/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hsn'] })
      qc.invalidateQueries({ queryKey: ['masters', 'hsn'] })
    }
  })
}
