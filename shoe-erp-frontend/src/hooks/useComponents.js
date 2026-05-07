import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useComponents = (params = {}) => useQuery({
  queryKey: ['components', params],
  queryFn: async () => {
    const res = await api.get('/components', { params })
    return res.data?.data ?? []
  }
})

export const useComponentsByDesign = (designId) => useQuery({
  queryKey: ['components', 'by-design', designId],
  queryFn: async () => {
    const res = await api.get('/components', { params: { design_id: designId } })
    return res.data?.data ?? []
  },
  enabled: !!designId
})

export const useComponent = (id) => useQuery({
  queryKey: ['components', id],
  queryFn: async () => {
    const res = await api.get(`/components/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

export const useCreateComponent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/components', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['components'] })
  })
}

export const useUpdateComponent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/components/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['components'] })
  })
}

export const useDeleteComponent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/components/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['components'] })
  })
}
