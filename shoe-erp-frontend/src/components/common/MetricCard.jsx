import React from 'react';

/**
 * Modern 2026 Summary metric card.
 * Props: title, value, subtitle (or sub), color
 */
export default function MetricCard({ title, value, subtitle, sub, color = 'gray' }) {
  const displaySub = subtitle || sub;

  // Map color to accent bar color if custom is needed, or stick to indigo #4f46e5
  const accentColors = {
    blue: 'bg-[#4f46e5]',
    green: 'bg-[#10b981]',
    amber: 'bg-[#f59e0b]',
    orange: 'bg-[#f97316]',
    teal: 'bg-[#14b8a6]',
    purple: 'bg-[#8b5cf6]',
    red: 'bg-[#ef4444]',
    gray: 'bg-slate-400'
  }
  const accentClass = accentColors[color] || 'bg-[#4f46e5]'

  return (
    <div className="relative bg-white border border-[#e2e8f0] rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-6 py-5 flex flex-col justify-between overflow-hidden">
      {/* Accent bar at top */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accentClass}`} />
      
      <div className="min-w-0">
        <p className="text-[12px] text-[#64748b] font-medium mb-2 truncate">{title}</p>
        <p className="text-[28px] font-bold text-[#0f172a] leading-none">{value ?? '—'}</p>
        {displaySub && <p className="text-xs text-[#94a3b8] mt-1.5">{displaySub}</p>}
      </div>
    </div>
  )
}
