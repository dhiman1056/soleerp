import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useNotificationCountQuery } from '../../hooks/useNotifications'

export default function NotificationBell({ onClick }) {
  const { data } = useNotificationCountQuery()
  const stats = data?.data || { total: 0, unread: 0, critical: 0 }
  
  const hasUnread = stats.unread > 0
  const hasCritical = stats.critical > 0

  return (
    <button 
       type="button" 
       onClick={onClick}
       className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
    >
      <span className="sr-only">View notifications</span>
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>

      {hasUnread && (
         <span className={`absolute top-1.5 right-1.5 flex items-center justify-center h-4 w-4 text-[10px] font-bold text-white rounded-full ${hasCritical ? 'bg-red-600 animate-pulse' : 'bg-red-500'}`}>
           {stats.unread > 9 ? '9+' : stats.unread}
         </span>
      )}
    </button>
  )
}
