import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useCustomers = (params = {}) => useQuery({
  queryKey: ['customers', params],
  queryFn: async () => {
    const res = await api.get('/customers', { params })
    return res.data?.data ?? []
  }
})

export const useCustomerById = (id) => useQuery({
  queryKey: ['customer', id],
  queryFn: async () => {
    const res = await api.get(`/customers/${id}`)
    return res.data?.data ?? {}
  },
  enabled: !!id
})

export const useCreateCustomer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/customers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] })
  })
}

export const useUpdateCustomer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/customers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] })
  })
}

export const useDeleteCustomer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] })
  })
}
