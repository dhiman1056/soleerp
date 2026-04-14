import React, { createContext, useState, useEffect } from 'react'

export const AuthContext = createContext({
  user:            null,
  token:           null,
  isAuthenticated: false,
  loading:         true,   // start true — prevents redirect before localStorage is checked
  role:            null,
  login:           () => {},
  logout:          () => {},
})

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(null)
  const [loading, setLoading] = useState(true)  // block render until hydration done

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser  = localStorage.getItem('user')

    if (storedToken && storedUser) {
      try {
        // Decode JWT payload and check expiry without a library
        const payload = JSON.parse(atob(storedToken.split('.')[1]))
        if (payload.exp * 1000 < Date.now()) {
          // Token expired — clear storage but don't call logout() to avoid
          // the circular reference on first render
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        } else {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        }
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }

    setLoading(false)  // always mark hydration complete, success or failure
  }, [])

  const login = (newToken, newUser) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: !!token,
      role:            user?.role ?? null,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
