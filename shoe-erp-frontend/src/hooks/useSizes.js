import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ── Primary exports (new naming convention) ──────────────────────────────────

export const useSizes = (params = {}) => {
  return useQuery({
    queryKey: ['sizes', params],
    queryFn: async () => {
      const res = await api.get('/sizes', { params })
      return res.data?.data ?? []
    },
  })
}

export const useCreateSize = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/sizes', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sizes'] }),
  })
}

export const useUpdateSize = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/sizes/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sizes'] }),
  })
}

export const useDeleteSize = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/sizes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sizes'] }),
  })
}

// ── Backward-compatible alias ─────────────────────────────────────────────────
export const useSizesQuery = useSizes
