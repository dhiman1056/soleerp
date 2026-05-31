import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import NotificationDrawer from '../notifications/NotificationDrawer.jsx'

export default function Layout() {
  const [showDrawer, setShowDrawer] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 relative">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <Topbar onToggleNotifications={() => setShowDrawer(!showDrawer)} />
        <main className="flex-1 overflow-y-auto p-6 relative">
          <Outlet />
        </main>
        
        <NotificationDrawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} />
      </div>
    </div>
  )
}
