import React from 'react';

/**
 * Modern 2026 Executive KPI card with gradient glow, icon badge, trend pill, and hover effects.
 * Props: title, value, subtitle (or sub), color, icon, trend, trendValue, badge, onClick
 */
export default function MetricCard({
  title,
  value,
  subtitle,
  sub,
  color = 'blue',
  icon,
  trend,
  trendValue,
  badge,
  onClick
}) {
  const displaySub = subtitle || sub;

  const colorThemes = {
    blue: {
      border: 'hover:border-indigo-300/80',
      bgGlow: 'from-indigo-50/40 via-white to-white',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-100',
      barBg: 'bg-gradient-to-r from-indigo-500 to-blue-500',
      accentDot: 'bg-indigo-500',
    },
    green: {
      border: 'hover:border-emerald-300/80',
      bgGlow: 'from-emerald-50/40 via-white to-white',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-100',
      barBg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      accentDot: 'bg-emerald-500',
    },
    amber: {
      border: 'hover:border-amber-300/80',
      bgGlow: 'from-amber-50/40 via-white to-white',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-100',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-amber-100',
      barBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      accentDot: 'bg-amber-500',
    },
    orange: {
      border: 'hover:border-orange-300/80',
      bgGlow: 'from-orange-50/40 via-white to-white',
      badgeBg: 'bg-orange-50 text-orange-700 border-orange-100',
      iconBg: 'bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-orange-100',
      barBg: 'bg-gradient-to-r from-orange-500 to-rose-500',
      accentDot: 'bg-orange-500',
    },
    teal: {
      border: 'hover:border-teal-300/80',
      bgGlow: 'from-teal-50/40 via-white to-white',
      badgeBg: 'bg-teal-50 text-teal-700 border-teal-100',
      iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-teal-100',
      barBg: 'bg-gradient-to-r from-teal-500 to-cyan-500',
      accentDot: 'bg-teal-500',
    },
    purple: {
      border: 'hover:border-purple-300/80',
      bgGlow: 'from-purple-50/40 via-white to-white',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
      iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-100',
      barBg: 'bg-gradient-to-r from-purple-500 to-indigo-500',
      accentDot: 'bg-purple-500',
    },
    red: {
      border: 'hover:border-rose-300/80',
      bgGlow: 'from-rose-50/40 via-white to-white',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-100',
      iconBg: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-100',
      barBg: 'bg-gradient-to-r from-rose-500 to-red-500',
      accentDot: 'bg-rose-500',
    },
    gray: {
      border: 'hover:border-slate-300/80',
      bgGlow: 'from-slate-50/40 via-white to-white',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
      iconBg: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-slate-100',
      barBg: 'bg-slate-400',
      accentDot: 'bg-slate-500',
    }
  };

  const theme = colorThemes[color] || colorThemes.blue;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b ${theme.bgGlow} p-4 sm:p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.08)] ${theme.border} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Top row: Icon badge + Tag/Pill */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${theme.iconBg} shadow-sm group-hover:scale-105 transition-transform duration-200`}>
              {icon}
            </div>
          )}
          <span className="text-[12px] font-semibold text-slate-600 truncate leading-snug">
            {title}
          </span>
        </div>

        {badge && (
          <span className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium border ${theme.badgeBg}`}>
            {badge}
          </span>
        )}

        {trend && (
          <span
            className={`inline-flex shrink-0 items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              trend === 'up'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                : trend === 'down'
                ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
          </span>
        )}
      </div>

      {/* Main value */}
      <div className="mt-1">
        <div className="text-[22px] sm:text-[24px] font-extrabold text-slate-900 tracking-tight leading-none group-hover:text-indigo-950 transition-colors">
          {value ?? '—'}
        </div>
        {displaySub && (
          <p className="mt-2 text-[11.5px] font-medium text-slate-500 flex items-center gap-1.5 truncate">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.accentDot}`} />
            <span className="truncate">{displaySub}</span>
          </p>
        )}
      </div>

      {/* Subtle bottom indicator line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100">
        <div className={`h-full w-0 group-hover:w-full transition-all duration-400 ease-out ${theme.barBg}`} />
      </div>
    </div>
  );
}
