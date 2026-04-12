import axiosInstance from './axiosInstance'
export const fetchGlobalSearch = (query) => axiosInstance.get(`/search?q=${query}`)
