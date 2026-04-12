import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchBOMs, fetchBOM, createBOM, updateBOM, deleteBOM } from '../api/bomApi'

export const useBOMsQuery = (params = {}) =>
  useQuery({
    queryKey: ['boms', params],
    queryFn:  () => fetchBOMs(params),
  })

export const useBOMQuery = (id) =>
  useQuery({
    queryKey: ['boms', id],
    queryFn:  () => fetchBOM(id),
    enabled:  !!id,
  })

export const useCreateBOM = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createBOM,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['boms'] }); toast.success('BOM created successfully!') },
    onError:    (err) => toast.error(err.message || 'Failed to create BOM'),
  })
}

export const useUpdateBOM = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateBOM,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['boms'] }); toast.success('BOM updated successfully!') },
    onError:    (err) => toast.error(err.message || 'Failed to update BOM'),
  })
}

export const useDeleteBOM = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteBOM,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['boms'] }); toast.success('BOM deactivated.') },
    onError:    (err) => toast.error(err.message || 'Failed to deactivate BOM'),
  })
}
