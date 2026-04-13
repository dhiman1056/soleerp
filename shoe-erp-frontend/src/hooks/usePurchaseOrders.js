import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../api/axiosInstance'

export const usePOsQuery = (params) => useQuery({
  queryKey: ['po', params],
  queryFn:  async () => {
    const res = await axiosInstance.get('/purchase-orders', { params })
    return res.data?.data ?? []
  },
})

export const usePOQuery = (id) => useQuery({
  queryKey: ['po', id],
  queryFn:  async () => {
    const res = await axiosInstance.get(`/purchase-orders/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id,
})

export const useCreatePO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => axiosInstance.post('/purchase-orders', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po'] }),
  })
}

export const useSendPO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => axiosInstance.put(`/purchase-orders/${id}/send`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['po'] })
      qc.invalidateQueries({ queryKey: ['po', id] })
    },
  })
}

export const useReceivePO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => axiosInstance.post(`/purchase-orders/${id}/receive`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['po'] })
      qc.invalidateQueries({ queryKey: ['po', variables.id] })
    },
  })
}
