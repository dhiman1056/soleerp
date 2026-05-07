import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useUOMs = (params = {}) => useQuery({
  queryKey: ['uom', params],
  queryFn: async () => {
    const res = await api.get('/uom', { params })
    return res.data?.data ?? []
  }
})

export const useUOM = (id) => useQuery({
  queryKey: ['uom', id],
  queryFn: async () => {
    const res = await api.get(`/uom/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

export const useCreateUOM = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/uom', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uom'] })
      qc.invalidateQueries({ queryKey: ['masters', 'uom'] })
    }
  })
}

export const useUpdateUOM = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/uom/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uom'] })
      qc.invalidateQueries({ queryKey: ['masters', 'uom'] })
    }
  })
}

export const useDeleteUOM = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/uom/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uom'] })
      qc.invalidateQueries({ queryKey: ['masters', 'uom'] })
    }
  })
}
