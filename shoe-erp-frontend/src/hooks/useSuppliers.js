import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ── Primary exports (new naming convention) ──────────────────────────────────

export const useSuppliers = (params = {}) => {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: async () => {
      const res = await api.get('/suppliers', { params })
      return res.data?.data ?? []
    },
  })
}

export const useSupplierById = (id) => {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const res = await api.get(`/suppliers/${id}`)
      return res.data?.data ?? null
    },
    enabled: !!id,
  })
}

export const useSupplierLedger = (id, params) => {
  return useQuery({
    queryKey: ['supplier-ledger', id, params],
    queryFn: async () => {
      const res = await api.get(`/suppliers/${id}/ledger`, { params })
      // Backend returns { opening_balance, transactions } — not an array
      return res.data?.data ?? { opening_balance: 0, transactions: [] }
    },
    enabled: !!id,
  })
}

export const useCreateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/suppliers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export const useUpdateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/suppliers/${id}`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['supplier', variables.id] })
    },
  })
}

export const useRecordPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.post(`/suppliers/${id}/payment`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['supplier', variables.id] })
      qc.invalidateQueries({ queryKey: ['supplier-ledger', variables.id] })
    },
  })
}

// ── Backward-compatible aliases ───────────────────────────────────────────────
export const useSuppliersQuery      = useSuppliers
export const useSupplierQuery       = useSupplierById
export const useSupplierLedgerQuery = useSupplierLedger
