import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../api/axiosInstance'

export const useSuppliersQuery = (params) => useQuery({
  queryKey: ['suppliers', params],
  queryFn:  async () => {
    const res = await axiosInstance.get('/suppliers', { params })
    return res.data?.data ?? []
  },
})

export const useSupplierQuery = (id) => useQuery({
  queryKey: ['supplier', id],
  queryFn:  async () => {
    const res = await axiosInstance.get(`/suppliers/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id,
})

export const useSupplierLedgerQuery = (id, params) => useQuery({
  queryKey: ['supplier-ledger', id, params],
  queryFn:  async () => {
    const res = await axiosInstance.get(`/suppliers/${id}/ledger`, { params })
    return res.data?.data ?? []
  },
  enabled: !!id,
})

export const useCreateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => axiosInstance.post('/suppliers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export const useUpdateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => axiosInstance.put(`/suppliers/${id}`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['supplier', variables.id] })
    },
  })
}

export const useRecordPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => axiosInstance.post(`/suppliers/${id}/payment`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['supplier', variables.id] })
      qc.invalidateQueries({ queryKey: ['supplier-ledger', variables.id] })
    },
  })
}
