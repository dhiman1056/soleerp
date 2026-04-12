import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useNotificationsQuery, useMarkAllRead } from '../../hooks/useNotifications'
import NotificationItem from './NotificationItem'
import Loader from '../common/Loader'

export default function NotificationDrawer({ isOpen, onClose }) {
  const [filter, setFilter] = useState('ALL') // ALL, UNREAD, CRITICAL
  const { data, isLoading } = useNotificationsQuery({ limit: 50 })
  const markAllRead = useMarkAllRead()
  
  const drawerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const notifications = data?.data || []
  const filtered = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.is_read
    if (filter === 'CRITICAL') return n.severity === 'CRITICAL' && !n.is_read
    return true
  })

  return (
    <div 
      ref={drawerRef}
      className={`absolute top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800">Notifications</h2>
        <div className="flex gap-2">
           <button onClick={() => markAllRead.mutate()} className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1">
             Mark all read
           </button>
           <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 text-gray-500">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 text-xs font-semibold bg-white">
         <button onClick={() => setFilter('ALL')} className={`flex-1 py-3 border-b-2 ${filter === 'ALL' ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-400'}`}>All</button>
         <button onClick={() => setFilter('UNREAD')} className={`flex-1 py-3 border-b-2 ${filter === 'UNREAD' ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-400'}`}>Unread</button>
         <button onClick={() => setFilter('CRITICAL')} className={`flex-1 py-3 border-b-2 ${filter === 'CRITICAL' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400'}`}>Critical</button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {isLoading ? (
          <div className="py-10"><Loader /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400">
             <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
             </svg>
             <p className="text-sm">No notifications</p>
          </div>
        ) : (
          filtered.map(notif => (
            <NotificationItem key={notif.id} notif={notif} onClose={onClose} />
          ))
        )}
      </div>
    </div>
  )
}
