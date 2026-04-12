import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/notificationApi'

export const useNotificationsQuery = (params) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => api.fetchNotifications(params),
  })
}

export const useNotificationCountQuery = () => {
  return useQuery({
    queryKey: ['notification-count'],
    queryFn: api.fetchNotificationCount,
    refetchInterval: 60000 // Poll every 60 seconds
  })
}

export const useMarkNotificationRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.markAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-count'] })
    }
  })
}

export const useMarkAllRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-count'] })
    }
  })
}
