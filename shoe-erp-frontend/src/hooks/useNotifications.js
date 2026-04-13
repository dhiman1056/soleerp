import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ── Primary exports (new naming convention) ──────────────────────────────────

export const useNotifications = (params = {}) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const res = await api.get('/notifications', { params })
      return res.data?.data ?? []
    },
    refetchInterval: 60000,
  })
}

export const useNotificationCount = () => {
  return useQuery({
    queryKey: ['notification-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/count')
      return res.data?.data ?? { total: 0, unread: 0, critical: 0 }
    },
    refetchInterval: 60000,
  })
}

export const useMarkAsRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export const useMarkAllAsRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

// ── Backward-compatible aliases ───────────────────────────────────────────────
export const useNotificationsQuery     = useNotifications
export const useNotificationCountQuery = useNotificationCount
export const useMarkNotificationRead   = useMarkAsRead
export const useMarkAllRead            = useMarkAllAsRead
