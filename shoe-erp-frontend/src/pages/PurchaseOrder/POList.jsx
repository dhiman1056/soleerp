import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useNavigate } from 'react-router-dom'
import { usePOsQuery } from '../../hooks/usePurchaseOrders'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'
import Loader from '../../components/common/Loader'

export default function POList() {
  const [status, setStatus] = useState('')
  const { data, isLoading } = usePOsQuery({ status })
  const navigate = useNavigate()
  const { user } = useAuth()

  const pos = data?.data || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <select 
            className="input-field max-w-[150px]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PARTIAL_RECEIVED">Partial Received</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {['admin', 'manager'].includes(user?.role) && (
            <button onClick={() => navigate('/purchase-orders/new')} className="btn-primary shrink-0">
              Create PO
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8"><Loader /></div>
        ) : pos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No purchase orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-5 py-3">PO No</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Expected Del.</th>
                  <th className="px-5 py-3 text-right">Total Amount</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pos.map(po => (
                  <tr key={po.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/purchase-orders/${po.id}`)}>
                    <td className="px-5 py-3 font-mono font-bold text-gray-900">{po.po_no}</td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(po.po_date)}</td>
                    <td className="px-5 py-3 font-semibold text-gray-800">{po.supplier_name}</td>
                    <td className="px-5 py-3 text-gray-600">{po.expected_delivery_date ? formatDate(po.expected_delivery_date) : '-'}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">{formatCurrency(po.total_value)}</td>
                    <td className="px-5 py-3 text-center">
                       <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                           po.status === 'RECEIVED' ? 'bg-green-100 text-green-700' :
                           po.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                           po.status === 'PARTIAL_RECEIVED' ? 'bg-yellow-100 text-yellow-800' :
                           po.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                           'bg-gray-100 text-gray-700'
                       }`}>
                         {po.status.replace('_', ' ')}
                       </span>
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
