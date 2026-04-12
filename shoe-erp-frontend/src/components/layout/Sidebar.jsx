import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { NavLink, useNavigate } from 'react-router-dom'
import { useWIPSummaryQuery } from '../../hooks/useWorkOrders'
import { useAuth } from '../../hooks/useAuth'

const Icon = ({ path, path2 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    {path2 && <path strokeLinecap="round" strokeLinejoin="round" d={path2} />}
  </svg>
)

const manufacturingNav = [
  {
    to: '/', end: true, label: 'Dashboard',
    icon: <Icon path="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />,
  },
  {
    to: '/raw-materials', label: 'Raw Materials',
    icon: <Icon path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  },
  {
    to: '/products', label: 'Products',
    icon: <Icon path="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />,
  },
  {
    to: '/bom', label: 'Bill of Material',
    icon: <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
  },
  {
    to: '/work-orders', label: 'Work Orders',
    icon: <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
  },
  {
    to: '/wip', label: 'WIP Dashboard', wip: true,
    icon: <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  },
]

const procurementNav = [
  {
    to: '/suppliers', label: 'Suppliers',
    icon: <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  },
  {
    to: '/purchase-orders', label: 'Purchase Orders',
    icon: <Icon path="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  }
]

const inventoryNav = [
  {
    to: '/inventory/stock', label: 'Stock Summary',
    icon: <Icon path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  },
  {
    to: '/inventory/ledger', label: 'Stock Ledger',
    icon: <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
  },
]

const analyticsNav = [
  {
    to: '/reports', label: 'Reports & Analytics',
    icon: <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  },
]

const adminNav = [
  {
    to: '/settings', label: 'Settings',
    icon: <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
  },
  {
    to: '/users', label: 'User Management',
    icon: <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  }
]

const NavSection = ({ title, items, collapsed, wipCount }) => (
  <div className="py-2 w-full">
    {!collapsed && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-5">{title}</p>}
    <div className="space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors relative
             ${isActive
               ? 'bg-gray-900 border-l-4 border-gray-900 text-white'
               : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent hover:text-gray-900'
             }`
          }
        >
          {item.icon}
          {!collapsed && <span className="truncate">{item.label}</span>}
          {item.wip && wipCount > 0 && (
            <span className={`${collapsed ? 'absolute right-1 top-1' : 'ml-auto'} w-2.5 h-2.5 bg-amber-500 shadow shadow-amber-200 rounded-full flex-shrink-0 animate-pulse`} />
          )}
        </NavLink>
      ))}
    </div>
  </div>
)

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { data: wipData }         = useWIPSummaryQuery()
  const navigate                  = useNavigate()
  const { user, logout }          = useAuth()

  const wipCount = wipData?.data?.overall?.total_wo_count || 0

  return (
    <aside
      className={`
        h-screen bg-white border-r border-gray-100 flex flex-col transition-all duration-300 flex-shrink-0
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Logo / Brand */}
      <div
        className="h-16 flex items-center justify-center gap-3 px-4 border-b border-gray-100 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0 shadow shadow-blue-200">
          <span className="text-white text-xs font-black">SE</span>
        </div>
        {!collapsed && (
          <div className="flex-1">
            <p className="text-sm font-black text-gray-900 leading-none">Shoe ERP</p>
            <p className="text-[10px] uppercase font-bold text-blue-500 mt-1">Manufacturing</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 overflow-y-auto w-full no-scrollbar">
          <NavSection title="MANUFACTURING" items={manufacturingNav} collapsed={collapsed} wipCount={wipCount} />
          <NavSection title="PROCUREMENT" items={procurementNav} collapsed={collapsed} />
          <NavSection title="INVENTORY" items={inventoryNav} collapsed={collapsed} />
          <NavSection title="ANALYTICS" items={analyticsNav} collapsed={collapsed} />
          {['admin', 'manager'].includes(user?.role) && <NavSection title="ADMINISTRATION" items={adminNav} collapsed={collapsed} />}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-3 mt-2 mb-2 p-2 rounded-lg text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 transition-colors flex items-center justify-center"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {collapsed
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          }
        </svg>
      </button>

      {/* User / Logout */}
      <div className={`p-4 border-t border-gray-100 flex items-center transition-all ${collapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex flex-col truncate pr-2">
            <span className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User'}</span>
            <span className="text-xs text-gray-500 capitalize">{user?.role || 'Operator'}</span>
          </div>
        )}
        <button
          onClick={logout}
          title="Logout"
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
