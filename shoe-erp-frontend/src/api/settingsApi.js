import axiosInstance from './axiosInstance'

export const fetchSettingsGroup = (group) => axiosInstance.get(`/settings/${group}`)
export const fetchAllSettings = () => axiosInstance.get('/settings')
export const updateSettings = (updates) => axiosInstance.put('/settings', { updates })
