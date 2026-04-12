import React from 'react';
/**
 * Summary metric card.
 * Props: title, value, sub, icon (ReactNode), color ('gray'|'blue'|'amber'|'green')
 */
export default function MetricCard({ title, value, sub, icon, color = 'gray' }) {
  const colorMap = {
    gray:  { bg: 'bg-gray-100',  text: 'text-gray-600',  val: 'text-gray-900'  },
    blue:  { bg: 'bg-blue-100',  text: 'text-blue-600',  val: 'text-blue-900'  },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', val: 'text-amber-900' },
    green: { bg: 'bg-green-100', text: 'text-green-600', val: 'text-green-900' },
  }
  const c = colorMap[color] || colorMap.gray

  return (
    <div className="card p-5 flex items-start gap-4">
      {icon && (
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <span className={c.text}>{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{title}</p>
        <p className={`text-2xl font-bold mt-0.5 ${c.val}`}>{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
