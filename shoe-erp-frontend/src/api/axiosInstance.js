import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  timeout: 15_000,
})

// Attach Content-Type on every request
api.interceptors.request.use((config) => {
  config.headers['Content-Type'] = 'application/json'
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Unwrap response.data and handle global server errors
api.interceptors.response.use(
  (response) => response.data,          // returns { success, data, meta }
  (error) => {
    // Check 401 Unauthorized
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.detail  ||
      error.message                  ||
      'Something went wrong'

    if (!error.response || error.response.status >= 500) {
      toast.error(`Server error: ${message}`)
    }

    // Re-throw a plain object so callers can do err.message
    return Promise.reject({ message, status: error.response?.status, raw: error })
  },
)

export default api
