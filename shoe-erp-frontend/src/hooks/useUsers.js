import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ─── GET /api/settings/users ─────────────────────────────────────────────────
export const useUsersQuery = () =>
  useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/settings/users')
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

// ─── POST /api/settings/users ────────────────────────────────────────────────
export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/settings/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

// ─── PUT /api/settings/users/:id ─────────────────────────────────────────────
export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/settings/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

// ─── PUT /api/settings/users/:id/reset-password ──────────────────────────────
export const useResetPassword = () =>
  useMutation({
    mutationFn: ({ id, new_password }) =>
      api.put(`/settings/users/${id}/reset-password`, { new_password }),
  })

// ─── DELETE /api/settings/users/:id ─────────────────────────────────────────
export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/settings/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}
