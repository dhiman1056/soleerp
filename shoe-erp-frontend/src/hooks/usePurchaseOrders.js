import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ── Primary exports (new naming convention) ──────────────────────────────────

export const usePurchaseOrders = (params = {}) => {
  return useQuery({
    queryKey: ['po', params],
    queryFn: async () => {
      const res = await api.get('/purchase-orders', { params })
      return res.data?.data ?? []
    },
  })
}

export const usePurchaseOrderById = (id) => {
  return useQuery({
    queryKey: ['po', id],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${id}`)
      return res.data?.data ?? null
    },
    enabled: !!id,
  })
}

export const useCreatePO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/purchase-orders', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po'] }),
  })
}

export const useSendPO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.put(`/purchase-orders/${id}/send`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['po'] })
      qc.invalidateQueries({ queryKey: ['po', id] })
    },
  })
}

export const useReceivePO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.post(`/purchase-orders/${id}/receive`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['po'] })
      qc.invalidateQueries({ queryKey: ['po', variables.id] })
    },
  })
}

export const useCancelPO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.put(`/purchase-orders/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po'] }),
  })
}

// ── Backward-compatible aliases ───────────────────────────────────────────────
export const usePOsQuery = usePurchaseOrders
export const usePOQuery  = usePurchaseOrderById
