import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useDivisions = (params = {}) => useQuery({
  queryKey: ['divisions', params],
  queryFn: async () => {
    const res = await api.get('/divisions', { params })
    return res.data?.data ?? []
  }
})

export const useDivision = (id) => useQuery({
  queryKey: ['divisions', id],
  queryFn: async () => {
    const res = await api.get(`/divisions/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

export const useCreateDivision = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/divisions', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['divisions'] })
  })
}

export const useUpdateDivision = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/divisions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['divisions'] })
  })
}

export const useDeleteDivision = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/divisions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['divisions'] })
  })
}
