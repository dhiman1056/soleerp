import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/supplierApi'

export const useSuppliersQuery = (params) => useQuery({
  queryKey: ['suppliers', params],
  queryFn: () => api.fetchSuppliers(params),
})

export const useSupplierQuery = (id) => useQuery({
  queryKey: ['supplier', id],
  queryFn: () => api.fetchSupplierById(id),
  enabled: !!id,
})

export const useSupplierLedgerQuery = (id, params) => useQuery({
  queryKey: ['supplier-ledger', id, params],
  queryFn: () => api.fetchSupplierLedger({ id, params }),
  enabled: !!id,
})

export const useCreateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createSupplier,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] })
  })
}

export const useUpdateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.updateSupplier,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['supplier', variables.id] })
    }
  })
}

export const useRecordPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.recordPayment,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['supplier', variables.id] })
      qc.invalidateQueries({ queryKey: ['supplier-ledger', variables.id] })
    }
  })
}
