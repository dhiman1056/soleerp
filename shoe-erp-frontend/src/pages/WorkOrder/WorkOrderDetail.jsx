import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useNavigate, useParams } from 'react-router-dom'
import MetricCard  from '../../components/common/MetricCard.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import Loader      from '../../components/common/Loader.jsx'
import ReceiveModal from './ReceiveModal.jsx'
import { useWorkOrderQuery } from '../../hooks/useWorkOrders.js'
import { formatCurrency }    from '../../utils/formatCurrency.js'
import { formatDate }        from '../../utils/formatDate.js'
import { WO_TYPE_LABELS }    from '../../utils/constants.js'
import { printWorkOrder }    from '../../print/PrintWorkOrder.jsx'

export default function WorkOrderDetail() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const [receiveOpen, setReceiveOpen] = useState(false)

  // useWorkOrderById returns data directly (already unwrapped in queryFn)
  const wo = data

  if (isLoading) return <div className="py-16"><Loader /></div>
  if (error || !wo)  return (
    <div className="text-center py-16">
      <p className="text-gray-500">Work Order not found.</p>
      <button onClick={() => navigate('/work-orders')} className="btn-secondary mt-4">← Back to list</button>
    </div>
  )

  const wipQty   = parseFloat(wo.wip_qty   || 0)
  const wipValue = parseFloat(wo.wip_value || 0)
  const plannedQty  = parseFloat(wo.planned_qty  || 0)
  const receivedQty = parseFloat(wo.received_qty || 0)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/work-orders')} className="btn-secondary text-xs">← Back</button>
        <div className="flex gap-2">
          <button onClick={() => printWorkOrder(wo)} className="btn-secondary">Print</button>
          {!['RECEIVED', 'DRAFT'].includes(wo.status) && (
            <button onClick={() => setReceiveOpen(true)} className="btn-primary">Record Receipt</button>
          )}
        </div>
      </div>

      {/* Header Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{wo.wo_number}</h1>
              <StatusBadge status={wo.status} />
            </div>
            <p className="text-gray-500 text-sm">{wo.product_name}</p>
          </div>
          <div className="text-right text-sm text-gray-500 space-y-0.5">
            <p><span className="font-medium text-gray-700">BOM:</span> {wo.bom_code} ({wo.bom_type})</p>
            <p><span className="font-medium text-gray-700">Type:</span> {WO_TYPE_LABELS[wo.wo_type]}</p>
            <p><span className="font-medium text-gray-700">Date:</span> {formatDate(wo.wo_date)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400 text-xs uppercase font-semibold tracking-wide">From Store</span>
            <p className="mt-0.5 font-medium text-gray-800">{wo.from_store}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs uppercase font-semibold tracking-wide">To Store</span>
            <p className="mt-0.5 font-medium text-gray-800">{wo.to_store}</p>
          </div>
          {wo.notes && (
            <div className="col-span-2">
              <span className="text-gray-400 text-xs uppercase font-semibold tracking-wide">Notes</span>
              <p className="mt-0.5 text-gray-700">{wo.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Planned Qty"  value={plannedQty.toFixed(2)}      color="gray"  />
        <MetricCard title="Received Qty" value={receivedQty.toFixed(2)}     color="green" />
        <MetricCard title="WIP Qty"      value={wipQty.toFixed(2)}          color="amber" />
        <MetricCard title="WIP Value"    value={formatCurrency(wipValue)}    color={wipValue > 0 ? 'amber' : 'gray'} />
      </div>

      {/* BOM Component Breakdown */}
      {Array.isArray(wo.lines) && wo.lines.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">BOM Component Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['SKU', 'Description', 'Qty/Unit', 'Total Planned Qty', 'Rate (₹)', 'Total Value'].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${h.includes('Qty') || h.includes('Rate') || h.includes('Value') ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(wo.lines) ? wo.lines : []).map((l, i) => {
                  const totalQty  = (parseFloat(l.consume_qty) * plannedQty)
                  const totalVal  = totalQty * parseFloat(l.rate_at_bom)
                  return (
                    <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{l.input_sku}</td>
                      <td className="px-4 py-3 text-gray-700">{l.description}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{l.consume_qty} {l.uom}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{totalQty.toFixed(4)} {l.uom}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(l.rate_at_bom)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatCurrency(totalVal)}</td>
                    </tr>
                  )
                })}
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                  <td colSpan={5} className="px-4 py-3 text-right text-gray-700">Total BOM Material Cost</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                    {formatCurrency(
                      (Array.isArray(wo.lines) ? wo.lines : []).reduce(
                        (sum, l) => sum + (Number(l.consume_qty) || 0) * (Number(l.rate_at_bom) || 0), 0
                      ) * plannedQty
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receipt History */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Receipt History</h2>
        </div>
        {!wo.receipts?.length ? (
          <p className="text-center text-sm text-gray-400 py-8">No receipts recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Received Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {wo.receipts.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-700">{parseFloat(r.received_qty).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(r.receipt_date)}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{r.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReceiveModal isOpen={receiveOpen} onClose={() => setReceiveOpen(false)} wo={wo} />
    </div>
  )
}
