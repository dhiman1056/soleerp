import React from 'react'

export function SkeletonRow({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 5 }).map((_, j) => (
             <td key={j} className="px-5 py-3">
               <div className="h-4 bg-gray-200 rounded w-full"></div>
             </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-8 bg-gray-300 rounded w-1/2"></div>
    </div>
  )
}

export function SkeletonChart({ height = 300 }) {
  return (
    <div className="card p-4 animate-pulse flex flex-col justify-between" style={{ height }}>
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="flex-1 bg-gray-100 rounded w-full"></div>
    </div>
  )
}
