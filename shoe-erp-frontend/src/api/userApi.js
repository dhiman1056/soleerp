import axiosInstance from './axiosInstance'

export const fetchUsers = () => axiosInstance.get('/users')
export const createUser = (data) => axiosInstance.post('/users', data)
export const updateUser = ({ id, ...data }) => axiosInstance.put(`/users/${id}`, data)
export const resetUserPassword = ({ id, new_password }) => axiosInstance.put(`/users/${id}/reset-password`, { new_password })
export const deleteUser = (id) => axiosInstance.delete(`/users/${id}`)
