import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'
import toast from 'react-hot-toast'

// ── Primary exports (new naming convention) ──────────────────────────────────

export const useBOMs = (params = {}) => {
  return useQuery({
    queryKey: ['boms', params],
    queryFn: async () => {
      const res = await api.get('/bom', { params })
      return res.data?.data ?? []
    },
  })
}

export const useBOMById = (id) => {
  return useQuery({
    queryKey: ['boms', id],
    queryFn: async () => {
      const res = await api.get(`/bom/${id}`)
      return res.data?.data ?? null
    },
    enabled: !!id,
  })
}

export const useCreateBOM = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/bom', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boms'] })
      toast.success('BOM created successfully!')
    },
    onError: (err) => toast.error(err.message || 'Failed to create BOM'),
  })
}

export const useUpdateBOM = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/bom/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boms'] })
      toast.success('BOM updated successfully!')
    },
    onError: (err) => toast.error(err.message || 'Failed to update BOM'),
  })
}

export const useDeleteBOM = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/bom/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boms'] })
      toast.success('BOM deactivated.')
    },
    onError: (err) => toast.error(err.message || 'Failed to deactivate BOM'),
  })
}

export const useProductsWithBom = (bomType) => {
  return useQuery({
    queryKey: ['bom-products', bomType],
    queryFn: async () => {
      if (!bomType) return []
      const res = await api.get('/bom/products-with-bom', { params: { bom_type: bomType } })
      return res.data?.data ?? []
    },
    enabled: !!bomType
  })
}

// ── Backward-compatible aliases ───────────────────────────────────────────────
export const useBOMsQuery = useBOMs
export const useBOMQuery  = useBOMById
