import axiosInstance from './axiosInstance'

export const fetchNotifications = (params) => axiosInstance.get('/notifications', { params })
export const fetchNotificationCount = () => axiosInstance.get('/notifications/count')
export const markAsRead = (id) => axiosInstance.put(`/notifications/${id}/read`)
export const markAllRead = () => axiosInstance.put('/notifications/read-all')
export const deleteNotification = (id) => axiosInstance.delete(`/notifications/${id}`)
