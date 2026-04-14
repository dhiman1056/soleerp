import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV = [
  { to: 'company',      label: 'Company'      },
  { to: 'financial',    label: 'Financial'    },
  { to: 'inventory',    label: 'Inventory'    },
  { to: 'notification', label: 'Notification' },
  { to: 'users',        label: 'Users'        },
];

export default function SettingsLayout() {
  const { user } = useAuth();

  if (!['admin', 'manager'].includes(user?.role)) {
    return (
      <div className="p-8 text-center text-gray-500">
        You do not have permission to access Settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>

      <div className="card overflow-hidden">
        {/* Tab navigation */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-6 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-gray-900 text-gray-900 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              {n.label} Settings
            </NavLink>
          ))}
        </div>

        {/* Sub-page content */}
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
