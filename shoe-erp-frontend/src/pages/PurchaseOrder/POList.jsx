import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePOsQuery } from '../../hooks/usePurchaseOrders'
import { useAuth }     from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate }     from '../../utils/formatDate'
import Loader from '../../components/common/Loader'

const STATUS_COLORS = {
  RECEIVED:         'bg-green-100 text-green-700',
  SENT:             'bg-blue-100 text-blue-700',
  PARTIAL:          'bg-yellow-100 text-yellow-800',
  PARTIAL_RECEIVED: 'bg-yellow-100 text-yellow-800',
  CANCELLED:        'bg-red-100 text-red-700',
  DRAFT:            'bg-gray-100 text-gray-700',
}

export default function POList() {
  const [status, setStatus] = useState('')
  const { data, isLoading } = usePOsQuery({ status })
  const navigate = useNavigate()
  const { user } = useAuth()

  const pos    = Array.isArray(data) ? data : []
  const canEdit = ['admin', 'manager'].includes(user?.role)

  // Summary counts
  const draft   = pos.filter(p => p.status === 'DRAFT').length
  const sent    = pos.filter(p => p.status === 'SENT').length
  const partial = pos.filter(p => ['PARTIAL','PARTIAL_RECEIVED'].includes(p.status)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {draft > 0 && <span className="mr-3 text-gray-600">{draft} Draft</span>}
            {sent > 0  && <span className="mr-3 text-blue-600">{sent} Sent</span>}
            {partial > 0 && <span className="text-amber-600">{partial} Partial</span>}
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <select
            className="input-field max-w-[160px]"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PARTIAL">Partial Received</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {canEdit && (
            <button onClick={() => navigate('/purchase-orders/new')} className="btn-primary shrink-0">
              + Create PO
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8"><Loader /></div>
        ) : pos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">📋</div>
            <p className="text-gray-500 font-medium">No purchase orders found.</p>
            {canEdit && (
              <button onClick={() => navigate('/purchase-orders/new')} className="btn-primary mt-4">
                Create First PO
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-5 py-3">PO No</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3 text-center">Items</th>
                  <th className="px-5 py-3">Expected Del.</th>
                  <th className="px-5 py-3 text-right">Total (₹)</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pos.map(po => (
                  <tr
                    key={po.id}
                    className="hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => navigate(`/purchase-orders/${po.id}`)}
                  >
                    <td className="px-5 py-3 font-mono font-bold text-gray-900">{po.po_no}</td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(po.po_date)}</td>
                    <td className="px-5 py-3 font-semibold text-gray-800">
                      {po.supplier_name || po.supplier_display || po.supplier || '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {po.line_count || 0} {Number(po.line_count) === 1 ? 'item' : 'items'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {po.expected_delivery_date ? formatDate(po.expected_delivery_date) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(po.total_value)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[po.status] || 'bg-gray-100 text-gray-700'}`}>
                        {(po.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
                        >
                          View
                        </button>
                        {po.status === 'DRAFT' && canEdit && (
                          <button
                            onClick={() => navigate(`/purchase-orders/${po.id}`)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                          >
                            Send
                          </button>
                        )}
                        {['SENT','PARTIAL','PARTIAL_RECEIVED'].includes(po.status) && (
                          <button
                            onClick={() => navigate(`/purchase-orders/${po.id}`)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
                          >
                            GRN
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
