import React from 'react';
import { STATUS_CLASSES } from '../../utils/constants'

/**
 * Colored pill badge for WO status values.
 * status: 'DRAFT' | 'ISSUED' | 'WIP' | 'PARTIAL' | 'RECEIVED'
 */
export default function StatusBadge({ status }) {
  const cls = STATUS_CLASSES[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status}
    </span>
  )
}
