import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  fetchRawMaterials, fetchRawMaterial,
  createRawMaterial, updateRawMaterial, deleteRawMaterial,
} from '../api/rawMaterialApi'

export const useRawMaterialsQuery = (params = {}) =>
  useQuery({
    queryKey: ['raw-materials', params],
    queryFn:  () => fetchRawMaterials(params),
  })

export const useRawMaterialQuery = (sku) =>
  useQuery({
    queryKey: ['raw-materials', sku],
    queryFn:  () => fetchRawMaterial(sku),
    enabled:  !!sku,
  })

export const useCreateRawMaterial = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createRawMaterial,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['raw-materials'] }); toast.success('Raw material created!') },
    onError:    (err) => toast.error(err.message || 'Failed to create raw material'),
  })
}

export const useUpdateRawMaterial = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateRawMaterial,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['raw-materials'] }); toast.success('Raw material updated!') },
    onError:    (err) => toast.error(err.message || 'Failed to update raw material'),
  })
}

export const useDeleteRawMaterial = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteRawMaterial,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['raw-materials'] }); toast.success('Raw material deactivated.') },
    onError:    (err) => toast.error(err.message || 'Failed to deactivate raw material'),
  })
}
