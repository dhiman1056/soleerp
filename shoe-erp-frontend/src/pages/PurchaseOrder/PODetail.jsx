import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePOQuery, useSendPO, useCancelPO } from '../../hooks/usePurchaseOrders'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate }     from '../../utils/formatDate'
import Loader   from '../../components/common/Loader'
import GRNForm  from './GRNForm'
import PRNForm  from './PRNForm'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  RECEIVED: 'bg-green-100 text-green-700', SENT: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-800', PARTIAL_RECEIVED: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-700', DRAFT: 'bg-gray-200 text-gray-800',
}

export default function PODetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const [showGRN,  setShowGRN]  = useState(false)
  const [showPRN,  setShowPRN]  = useState(false)

  const { data, isLoading } = usePOQuery(id)
  const sendMut   = useSendPO()
  const cancelMut = useCancelPO()

  if (isLoading) return <div className="py-20"><Loader /></div>
  const po = data
  if (!po) return <div className="p-8 text-gray-500">PO not found.</div>

  const lines       = Array.isArray(po.lines) ? po.lines : []
  const canEdit     = ['admin', 'manager'].includes(user?.role)
  const isDraft     = po.status === 'DRAFT'
  const canReceive  = ['SENT','PARTIAL','PARTIAL_RECEIVED'].includes(po.status)
  const canReturn   = ['PARTIAL','PARTIAL_RECEIVED','RECEIVED'].includes(po.status)

  const handleSend = () => {
    if (!confirm('Send this PO to supplier? This will mark it as SENT.')) return
    sendMut.mutate(id, { onSuccess: () => toast.success('PO sent!') })
  }

  const handleCancel = () => {
    if (!confirm('Cancel this PO? This action cannot be undone.')) return
    cancelMut.mutate(id, { onSuccess: () => { toast.success('PO cancelled.'); navigate('/purchase-orders') } })
  }

  const totalReceived = lines.reduce((s, l) => s + (parseFloat(l.received_qty) || 0), 0)
  const totalOrdered  = lines.reduce((s, l) => s + (parseFloat(l.ordered_qty)  || 0), 0)
  const receiptPct    = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate('/purchase-orders')} className="btn-secondary px-3 py-2 text-sm">← Back</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order: {po.po_no}</h1>
          <p className="text-sm text-gray-500">{po.supplier_name} · {formatDate(po.po_date)}</p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[po.status] || ''}`}>
          {(po.status||'').replace(/_/g,' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Lines + Receipts */}
        <div className="lg:col-span-2 space-y-6">

          {/* Receipt progress bar */}
          {totalOrdered > 0 && (
            <div className="card p-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Receipt Progress</span>
                <span className="font-bold text-gray-800">{receiptPct}% received</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(receiptPct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Rcvd: {totalReceived.toFixed(2)}</span>
                <span>Ordered: {totalOrdered.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* PO Lines */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800">Order Lines ({lines.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3 text-right">Ordered</th>
                    <th className="px-4 py-3 text-right">Received</th>
                    <th className="px-4 py-3 text-right">Pending</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map(l => {
                    const pending = parseFloat(l.pending_qty || 0)
                    return (
                      <tr key={l.id} className="hover:bg-gray-50/30">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-bold text-gray-900">{l.sku_code}</p>
                          <p className="text-xs text-gray-500">{l.sku_description}</p>
                        </td>
                        <td className="px-4 py-3 text-right">{parseFloat(l.ordered_qty).toFixed(2)} {l.uom}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={parseFloat(l.received_qty) > 0 ? 'text-green-600 font-bold' : 'text-gray-400'}>
                            {parseFloat(l.received_qty).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={pending > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}>
                            {pending.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(l.rate)}</td>
                        <td className="px-4 py-3 text-right font-bold bg-gray-50/50">{formatCurrency(l.line_value)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Total PO Value:</td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">{formatCurrency(po.total_value)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* GRN History */}
          <div className="card p-5 border-l-4 border-green-400">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">GRN History</h3>
            {po.receipts && po.receipts.length > 0 ? (
              <div className="space-y-3">
                {po.receipts.map(r => (
                  <div key={r.id} className="border border-gray-200 rounded-lg p-4 text-sm bg-gray-50">
                    <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-2">
                      <span className="font-bold text-gray-900 font-mono">{r.grn_no || `GRN#${r.id}`}</span>
                      <span className="text-gray-500 text-xs">{formatDate(r.grn_date || r.receipt_date)}</span>
                    </div>
                    {r.challan_no && <p className="text-xs text-gray-500 mb-2">Challan: <span className="font-mono">{r.challan_no}</span></p>}
                    {Array.isArray(r.lines) && r.lines.length > 0 && (
                      <table className="w-full text-xs">
                        <thead className="text-gray-500 uppercase border-b border-gray-200">
                          <tr><th>SKU</th><th className="text-right">Rcvd</th><th className="text-right">Value</th></tr>
                        </thead>
                        <tbody>
                          {r.lines.map(rl => (
                            <tr key={rl.id} className="border-t border-gray-100">
                              <td className="py-1 font-mono font-medium">{rl.sku_code}</td>
                              <td className="py-1 text-right text-green-700 font-bold">{parseFloat(rl.received_qty).toFixed(2)}</td>
                              <td className="py-1 text-right">{formatCurrency(rl.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No goods receipts recorded yet.</p>
            )}
          </div>
        </div>

        {/* RIGHT — Info + Actions */}
        <div className="space-y-5">
          {/* Total Value card */}
          <div className="card p-6 bg-gray-900 text-white rounded-2xl">
            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total PO Value</p>
            <p className="text-4xl font-black">{formatCurrency(po.total_value)}</p>
          </div>

          {/* Supplier Info */}
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Supplier</h3>
            <p className="font-bold text-gray-900">{po.supplier_name}</p>
            <button onClick={() => navigate(`/suppliers/${po.supplier_id}`)} className="text-xs text-blue-600 hover:underline mt-2 font-medium">
              View Supplier →
            </button>
          </div>

          {/* Meta */}
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">PO Date</span><span className="font-medium">{formatDate(po.po_date)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Expected</span><span className="font-medium">{po.expected_delivery_date ? formatDate(po.expected_delivery_date) : '—'}</span></div>
              {po.remarks && <div className="flex justify-between"><span className="text-gray-500">Remarks</span><span className="font-medium text-right max-w-[150px]">{po.remarks}</span></div>}
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="card p-5 bg-blue-50/50 border border-blue-100">
              <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-4">Actions</h3>
              <div className="space-y-2">
                {isDraft && (
                  <>
                    <button onClick={handleSend} disabled={sendMut.isPending} className="btn-primary w-full">
                      {sendMut.isPending ? 'Sending…' : '📤 Send to Supplier'}
                    </button>
                    <button onClick={() => navigate(`/purchase-orders/${id}/edit`)} className="btn-secondary w-full">
                      ✏️ Edit PO
                    </button>
                  </>
                )}
                {canReceive && (
                  <button onClick={() => setShowGRN(true)} className="btn-primary w-full" style={{ backgroundColor: '#059669' }}>
                    📦 Receive Material (GRN)
                  </button>
                )}
                {canReturn && (
                  <button onClick={() => setShowPRN(true)} className="w-full px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-100">
                    ↩️ Create Return (PRN)
                  </button>
                )}
                {(isDraft || po.status === 'SENT') && (
                  <button onClick={handleCancel} disabled={cancelMut.isPending} className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200">
                    Cancel PO
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GRN Modal */}
      {showGRN && <GRNForm po={po} onClose={() => setShowGRN(false)} />}

      {/* PRN Modal */}
      {showPRN && <PRNForm po={po} onClose={() => setShowPRN(false)} />}
    </div>
  )
}
