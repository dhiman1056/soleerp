import React from 'react';
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useMarkNotificationRead } from '../../hooks/useNotifications'

const getIcon = (type) => {
  switch (type) {
    case 'LOW_STOCK':
      return <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    case 'PENDING_WO':
      return <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    case 'PO_DUE':
      return <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    default:
      return <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  }
}

export default function NotificationItem({ notif, onClose }) {
  const navigate = useNavigate()
  const markRead = useMarkNotificationRead()

  const handleClick = () => {
    if (!notif.is_read) markRead.mutate(notif.id)
    onClose()
    
    if (notif.reference_type === 'STOCK') navigate(`/inventory/stock?sku=${notif.reference_id}`)
    else if (notif.reference_type === 'WORK_ORDER') navigate(`/work-orders/${notif.reference_id}`)
    else if (notif.reference_type === 'PURCHASE_ORDER') navigate(`/purchases/${notif.reference_id}`)
  }

  const borderClass = notif.is_read ? 'border-transparent' 
    : notif.severity === 'CRITICAL' ? 'border-red-500 bg-red-50/50'
    : notif.severity === 'WARNING' ? 'border-amber-500 bg-amber-50/30'
    : 'border-blue-500 bg-blue-50/30'

  return (
    <div 
      onClick={handleClick}
      className={`p-4 border-l-4 border-b border-b-gray-100 cursor-pointer hover:bg-gray-50 flex gap-3 ${borderClass}`}
    >
       <div className="shrink-0 mt-1">{getIcon(notif.notification_type)}</div>
       <div className="flex-1 min-w-0">
          <p className={`text-sm ${notif.is_read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'} truncate`}>
            {notif.title}
          </p>
          <p className={`text-xs mt-1 line-clamp-2 ${notif.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
            {notif.message}
          </p>
          <p className="text-[10px] text-gray-400 mt-2 font-medium">
            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
          </p>
       </div>
    </div>
  )
}
