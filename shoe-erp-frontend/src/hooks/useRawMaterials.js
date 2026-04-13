import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../api/axiosInstance'

export const useRawMaterialsQuery = (params = {}) =>
  useQuery({
    queryKey: ['raw-materials', params],
    queryFn:  async () => {
      const res = await api.get('/raw-materials', { params })
      return res.data?.data ?? []
    },
  })

export const useRawMaterialQuery = (sku) =>
  useQuery({
    queryKey: ['raw-materials', sku],
    queryFn:  async () => {
      const res = await api.get(`/raw-materials/${sku}`)
      return res.data?.data ?? null
    },
    enabled:  !!sku,
  })

export const useCreateRawMaterial = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/raw-materials', data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['raw-materials'] }); toast.success('Raw material created!') },
    onError:    (err) => toast.error(err.message || 'Failed to create raw material'),
  })
}

export const useUpdateRawMaterial = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sku, ...data }) => api.put(`/raw-materials/${sku}`, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['raw-materials'] }); toast.success('Raw material updated!') },
    onError:    (err) => toast.error(err.message || 'Failed to update raw material'),
  })
}

export const useDeleteRawMaterial = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sku) => api.delete(`/raw-materials/${sku}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['raw-materials'] }); toast.success('Raw material deactivated.') },
    onError:    (err) => toast.error(err.message || 'Failed to deactivate raw material'),
  })
}
