import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

export const useTeams = (params = {}) => useQuery({
  queryKey: ['teams', params],
  queryFn: async () => {
    const res = await api.get('/teams', { params })
    return res.data?.data ?? []
  }
})

export const useTeamsByDivision = (divisionId) => useQuery({
  queryKey: ['teams', 'by-division', divisionId],
  queryFn: async () => {
    const res = await api.get('/teams', { params: { division_id: divisionId } })
    return res.data?.data ?? []
  },
  enabled: !!divisionId
})

export const useTeam = (id) => useQuery({
  queryKey: ['teams', id],
  queryFn: async () => {
    const res = await api.get(`/teams/${id}`)
    return res.data?.data ?? null
  },
  enabled: !!id
})

export const useCreateTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/teams', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] })
  })
}

export const useUpdateTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/teams/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] })
  })
}

export const useDeleteTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/teams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] })
  })
}
