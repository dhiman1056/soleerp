import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'
import toast from 'react-hot-toast'

export const useLocations = (params = {}) =>
  useQuery({
    queryKey: ['locations', params],
    queryFn: async () => {
      const res = await api.get('/locations', { params })
      return res.data?.data ?? []
    },
  })

export const useCreateLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/locations', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Location created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const useUpdateLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/locations/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Location updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// Alias
export const useLocationsQuery = useLocations
