import React from 'react';
import { NavLink, Outlet } from 'react-router-dom'
import Topbar from '../../components/layout/Topbar'

const reportLinks = [
  { to: '/reports/production', label: 'Production Summary' },
  { to: '/reports/consumption', label: 'Material Consumption' },
  { to: '/reports/cost-sheet', label: 'Cost Sheet' },
  { to: '/reports/wip-aging', label: 'WIP Aging' },
  { to: '/reports/stock-valuation', label: 'Stock Valuation' },
  { to: '/reports/purchase', label: 'Purchase Report' },
]

export default function ReportsLayout() {
  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Topbar title="Management Reports" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Navigation Tabs */}
          <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            {reportLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex-1 text-center py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200
                   ${isActive ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          
          {/* Active Report View */}
          <div className="flex-1">
             <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
