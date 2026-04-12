import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/poApi'

export const usePOsQuery = (params) => useQuery({
  queryKey: ['po', params],
  queryFn: () => api.fetchPOs(params),
})

export const usePOQuery = (id) => useQuery({
  queryKey: ['po', id],
  queryFn: () => api.fetchPOById(id),
  enabled: !!id,
})

export const useCreatePO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createPO,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po'] })
  })
}

export const useSendPO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.sendPO,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['po'] })
      qc.invalidateQueries({ queryKey: ['po', id] })
    }
  })
}

export const useReceivePO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.receivePO,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['po'] })
      qc.invalidateQueries({ queryKey: ['po', variables.id] })
    }
  })
}
