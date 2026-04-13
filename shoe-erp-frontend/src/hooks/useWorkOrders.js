import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'
import toast from 'react-hot-toast'

// ── Primary exports (new naming convention) ──────────────────────────────────

export const useWorkOrders = (params = {}) => {
  return useQuery({
    queryKey: ['work-orders', params],
    queryFn: async () => {
      const res = await api.get('/work-orders', { params })
      return res.data?.data ?? []
    },
  })
}

export const useWorkOrderById = (id) => {
  return useQuery({
    queryKey: ['work-orders', id],
    queryFn: async () => {
      const res = await api.get(`/work-orders/${id}`)
      return res.data?.data ?? null
    },
    enabled: !!id,
  })
}

export const useWIPSummary = () => {
  return useQuery({
    queryKey: ['wip', 'summary'],
    queryFn: async () => {
      const res = await api.get('/work-orders/wip/summary')
      return res.data?.data ?? {}
    },
    refetchInterval: 30_000,
  })
}

export const useWIPOrders = (params = {}) => {
  return useQuery({
    queryKey: ['wip', params],
    queryFn: async () => {
      const res = await api.get('/work-orders/wip', { params })
      // WIP endpoint returns an object grouped by wo_type
      return res.data?.data ?? {}
    },
    refetchInterval: 30_000,
  })
}

export const useCreateWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/work-orders', data),
    onSuccess: () => {
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
    onSuccess: () => {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-orders'] })
      qc.invalidateQueries({ queryKey: ['wip'] })
      toast.success('Work Order cancelled.')
    },
    onError: (err) => toast.error(err.message || 'Failed to cancel Work Order'),
  })
}

// ── Backward-compatible aliases ───────────────────────────────────────────────
export const useWorkOrdersQuery  = useWorkOrders
export const useWorkOrderQuery   = useWorkOrderById
export const useWIPQuery         = useWIPOrders
export const useWIPSummaryQuery  = useWIPSummary
