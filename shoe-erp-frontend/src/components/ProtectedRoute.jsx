import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ requiredRole = null }) {
  const { isAuthenticated, role, loading } = useAuth()

  // Wait for localStorage hydration before making any redirect decision.
  // Without this guard, isAuthenticated is always false on first render
  // (token state is null) and every refresh triggers a /login redirect.
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Admin-only pages
  if (requiredRole === 'admin' && role !== 'admin') {
    return (
      <div className="p-8 text-center bg-gray-50 h-screen flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600">You need admin privileges to view this page.</p>
      </div>
    )
  }

  // Manager-or-above pages
  if (requiredRole === 'manager' && role === 'operator') {
    return (
      <div className="p-8 text-center bg-gray-50 h-screen flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600">You do not have permission to view this page.</p>
      </div>
    )
  }

  return <Outlet />
}
