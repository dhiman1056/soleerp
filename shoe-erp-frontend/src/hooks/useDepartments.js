import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useDepartments = (params = {}) => useQuery({
  queryKey: ['departments', params],
  queryFn: async () => {
    const res = await api.get('/departments', { params })
    return res.data?.data ?? []
  }
})

export const useDepartment = (id) => useQuery({
  queryKey: ['departments', id],
  queryFn: async () => {
    const res = await api.get(`/departments/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

export const useCreateDepartment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/departments', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] })
  })
}

export const useUpdateDepartment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/departments/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] })
  })
}

export const useDeleteDepartment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] })
  })
}
