import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useCompanies = (params = {}) => useQuery({
  queryKey: ['companies', params],
  queryFn: async () => {
    const res = await api.get('/companies', { params })
    return res.data?.data ?? []
  }
})

export const useCompany = (id) => useQuery({
  queryKey: ['companies', id],
  queryFn: async () => {
    const res = await api.get(`/companies/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

export const useCreateCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/companies', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] })
  })
}

export const useUpdateCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/companies/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] })
  })
}

export const useDeleteCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/companies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] })
  })
}
