import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useLocation, useNavigate } from 'react-router-dom'
import GlobalSearch from '../search/GlobalSearch.jsx'
import NotificationBell from '../notifications/NotificationBell.jsx'
import { useAuth } from '../../hooks/useAuth.js'

const routeLabels = {
  '/': ['Dashboard'],
  '/raw-materials': ['Raw Materials'],
  '/products': ['Products'],
  '/bom': ['Bill of Material'],
  '/bom/new': ['Bill of Material', 'New BOM'],
  '/work-orders': ['Work Orders'],
  '/wip': ['WIP Dashboard'],
}

const getLabels = (pathname) => {
  if (routeLabels[pathname]) return routeLabels[pathname]
  if (pathname.startsWith('/bom/') && pathname.endsWith('/edit')) return ['Bill of Material', 'Edit BOM']
  if (pathname.startsWith('/work-orders/')) return ['Work Orders', 'Work Order Detail']
  return [pathname.replace('/', '').replace(/-/g, ' ')]
}

export default function Topbar({ onToggleSidebar, onToggleNotifications }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, role } = useAuth()

  const labels = getLabels(pathname)
  const title = labels[labels.length - 1]

  useEffect(() => {
    document.title = title ? `${title} — ShoeERP` : 'ShoeERP'
  }, [title])

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 relative z-20">

      {/* LEFT SIDE: Hamburger & Title */}
      <div className="flex items-center gap-4 lg:gap-6 flex-1">
        {/* Hamburger Menu (visible on small screens or used to toggle sidebar) */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors xl:hidden focus:outline-none"
            aria-label="Toggle Sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div>
          <nav className="hidden sm:flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-400 mb-0.5 uppercase tracking-wide font-medium">
            {labels.map((label, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                <span className={i === labels.length - 1 ? 'text-blue-600 font-bold' : ''}>
                  {label}
                </span>
              </span>
            ))}
          </nav>

        </div>
      </div>

      {/* RIGHT SIDE: Search, Notifications, User, Settings */}
      <div className="flex items-center justify-end gap-3 sm:gap-5 flex-1">

        {/* Global Search Bar (hidden on very small mobile) */}
        <div className="hidden md:block w-64 max-w-sm">
          <GlobalSearch />
        </div>

        {/* Notification Bell */}
        <div className="flex items-center">
          <NotificationBell onClick={(e) => { e.stopPropagation(); onToggleNotifications && onToggleNotifications(); }} />
        </div>

        {/* Separator */}
        <div className="hidden sm:block h-6 w-px bg-gray-200" />

        {/* User Info & Role Badge */}
        <div className="hidden sm:flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-gray-900 leading-tight">{user?.name || 'User'}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1 rounded">
              {role || 'Operator'}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-[10px] font-bold uppercase tracking-widest">{user?.name?.substring(0, 2) || 'OP'}</span>
            )}
          </div>
        </div>

        {/* Settings Gear */}
        <button
          onClick={() => navigate('/settings')}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
          aria-label="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

      </div>
    </header>
  )
}
