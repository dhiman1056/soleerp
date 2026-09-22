import React from 'react'

export default function PageLoader() {
  return (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 animate-fadeIn">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing pulsing ring */}
        <div className="w-12 h-12 rounded-full border-2 border-blue-100 animate-ping absolute opacity-50"></div>
        {/* Modern spinner */}
        <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-blue-600 border-r-blue-600 animate-spin"></div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400 animate-pulse">
        Loading module...
      </p>
    </div>
  )
}
