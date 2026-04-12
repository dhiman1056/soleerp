import React from 'react';
/** Centered spinner with optional label */
export default function Loader({ label = 'Loading…', size = 'md' }) {
  const sizeMap = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <svg
        className={`animate-spin ${sizeMap[size]} text-gray-400`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      {label && <p className="text-xs text-gray-400">{label}</p>}
    </div>
  )
}
