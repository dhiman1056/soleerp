import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useEmployees = (params = {}) => useQuery({
  queryKey: ['employees', params],
  queryFn: async () => {
    const res = await api.get('/employees', { params })
    return res.data?.data ?? []
  }
})

export const useEmployee = (id) => useQuery({
  queryKey: ['employees', id],
  queryFn: async () => {
    const res = await api.get(`/employees/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

export const useCreateEmployee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/employees', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
    }
  })
}

export const useUpdateEmployee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/employees/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
    }
  })
}

export const useDeleteEmployee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
    }
  })
}
