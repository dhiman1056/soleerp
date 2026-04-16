import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'
import toast from 'react-hot-toast'

const invalidatePO = (qc, id) => {
  qc.invalidateQueries({ queryKey: ['po'] })
  qc.invalidateQueries({ queryKey: ['stockSummary'] })
  qc.invalidateQueries({ queryKey: ['stockLedger'] })
  if (id) qc.invalidateQueries({ queryKey: ['po', String(id)] })
}

// ── Purchase Orders ───────────────────────────────────────────────
export const usePurchaseOrders = (params = {}) =>
  useQuery({
    queryKey: ['po', params],
    queryFn: async () => {
      const res = await api.get('/purchase-orders', { params })
      return res.data?.data ?? []
    },
  })

export const usePurchaseOrderById = (id) =>
  useQuery({
    queryKey: ['po', String(id)],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${id}`)
      return res.data?.data ?? null
    },
    enabled: !!id,
  })

export const useCreatePO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/purchase-orders', data),
    onSuccess: () => { invalidatePO(qc); toast.success('Purchase Order created!') },
    onError:   (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const useUpdatePO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/purchase-orders/${id}`, data),
    onSuccess: (_, v) => { invalidatePO(qc, v.id); toast.success('PO updated!') },
    onError:   (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const useSendPO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.put(`/purchase-orders/${id}/send`),
    onSuccess: (_, id) => { invalidatePO(qc, id); toast.success('PO sent to supplier!') },
    onError:   (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const useCancelPO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.put(`/purchase-orders/${id}/cancel`),
    onSuccess: () => { invalidatePO(qc); toast.success('PO cancelled.') },
    onError:   (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── GRN (against PO) ─────────────────────────────────────────────
export const useReceivePO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.post(`/purchase-orders/${id}/receive`, data),
    onSuccess: (_, v) => {
      invalidatePO(qc, v.id)
      qc.invalidateQueries({ queryKey: ['grn'] })
      toast.success('GRN recorded successfully!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Direct GRN (without PO) ───────────────────────────────────────
export const useDirectGRN = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/purchase-orders/grn/direct', data),
    onSuccess: () => {
      invalidatePO(qc)
      qc.invalidateQueries({ queryKey: ['grn'] })
      toast.success('Direct GRN recorded!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── GRN List ──────────────────────────────────────────────────────
export const useGRNList = (params = {}) =>
  useQuery({
    queryKey: ['grn', params],
    queryFn: async () => {
      const res = await api.get('/purchase-orders/grn', { params })
      return res.data?.data ?? []
    },
  })

// ── PRN (Purchase Return Note) ────────────────────────────────────
export const useCreatePRN = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/purchase-orders/prn', data),
    onSuccess: () => {
      invalidatePO(qc)
      qc.invalidateQueries({ queryKey: ['prn'] })
      toast.success('Purchase Return Note created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const usePRNList = (params = {}) =>
  useQuery({
    queryKey: ['prn', params],
    queryFn: async () => {
      const res = await api.get('/purchase-orders/prn', { params })
      return res.data?.data ?? []
    },
  })

// ── PO Receipt lines ──────────────────────────────────────────────
export const usePOReceipts = (poId) =>
  useQuery({
    queryKey: ['po-receipts', poId],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${poId}/receipts`)
      return res.data?.data ?? []
    },
    enabled: !!poId,
  })

// ── Backward-compatible aliases ───────────────────────────────────
export const usePOsQuery      = usePurchaseOrders
export const usePOQuery       = usePurchaseOrderById
export const useReceiveGRN    = useReceivePO
