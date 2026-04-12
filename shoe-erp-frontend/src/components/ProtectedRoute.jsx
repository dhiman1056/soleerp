import React from 'react';
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ requiredRole = null }) {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && role !== requiredRole && !['admin'].includes(role)) {
    // Basic fallback for insufficient permissions - usually it's manager or admin needed
    // Assuming manager can do anything except what requires admin explicitly.
    if (requiredRole === 'admin' && role !== 'admin') {
      return (
        <div className="p-8 text-center bg-gray-50 h-screen flex flex-col justify-center items-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to view this page.</p>
        </div>
      )
    }
    if (requiredRole === 'manager' && role === 'operator') {
        return (
          <div className="p-8 text-center bg-gray-50 h-screen flex flex-col justify-center items-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
            <p className="text-gray-600">You do not have permission to view this page.</p>
          </div>
        )
    }
  }

  return <Outlet />
}
