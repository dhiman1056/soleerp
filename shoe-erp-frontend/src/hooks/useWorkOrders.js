import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  fetchWorkOrders, fetchWorkOrder,
  createWorkOrder, receiveWorkOrder, deleteWorkOrder,
  fetchWIP, fetchWIPSummary,
} from '../api/workOrderApi'

export const useWorkOrdersQuery = (params = {}) =>
  useQuery({
    queryKey: ['work-orders', params],
    queryFn:  () => fetchWorkOrders(params),
  })

export const useWorkOrderQuery = (id) =>
  useQuery({
    queryKey: ['work-orders', id],
    queryFn:  () => fetchWorkOrder(id),
    enabled:  !!id,
  })

export const useCreateWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createWorkOrder,
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
    mutationFn: receiveWorkOrder,
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
    mutationFn: deleteWorkOrder,
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
    queryKey:       ['wip', params],
    queryFn:        () => fetchWIP(params),
    refetchInterval: 30_000,
  })

export const useWIPSummaryQuery = () =>
  useQuery({
    queryKey:       ['wip', 'summary'],
    queryFn:        fetchWIPSummary,
    refetchInterval: 30_000,
  })
