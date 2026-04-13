import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../api/axiosInstance'

export const useWorkOrdersQuery = (params = {}) =>
  useQuery({
    queryKey: ['work-orders', params],
    queryFn:  async () => {
      const res = await api.get('/work-orders', { params })
      return res.data?.data ?? []
    },
  })

export const useWorkOrderQuery = (id) =>
  useQuery({
    queryKey: ['work-orders', id],
    queryFn:  async () => {
      const res = await api.get(`/work-orders/${id}`)
      return res.data?.data ?? null
    },
    enabled:  !!id,
  })

export const useCreateWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/work-orders', data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['work-orders'] })
      qc.invalidateQueries({ queryKey: ['wip'] })
      toast.success('Work Order created!')
    },
    onError: (err) => toast.error(err.message || 'Failed to create Work Order'),
  })
}

export const useReceiveWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/work-orders/${id}/receive`, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['work-orders'] })
      qc.invalidateQueries({ queryKey: ['wip'] })
      toast.success('Receipt recorded successfully!')
    },
    onError: (err) => toast.error(err.message || 'Failed to record receipt'),
  })
}

export const useDeleteWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/work-orders/${id}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['work-orders'] })
      qc.invalidateQueries({ queryKey: ['wip'] })
      toast.success('Work Order cancelled.')
    },
    onError: (err) => toast.error(err.message || 'Failed to cancel Work Order'),
  })
}

export const useWIPQuery = (params = {}) =>
  useQuery({
    queryKey:        ['wip', params],
    queryFn:         async () => {
      const res = await api.get('/work-orders/wip', { params })
      // WIP grouped endpoint returns an object keyed by wo_type
      return res.data?.data ?? {}
    },
    refetchInterval: 30_000,
  })

export const useWIPSummaryQuery = () =>
  useQuery({
    queryKey:        ['wip', 'summary'],
    queryFn:         async () => {
      const res = await api.get('/work-orders/wip/summary')
      return res.data?.data ?? {}
    },
    refetchInterval: 30_000,
  })
