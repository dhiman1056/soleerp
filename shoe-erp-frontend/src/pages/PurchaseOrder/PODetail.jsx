import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useParams, useNavigate } from 'react-router-dom'
import { usePOQuery, useSendPO } from '../../hooks/usePurchaseOrders'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'
import Loader from '../../components/common/Loader'
import POReceiveModal from './POReceiveModal'
import toast from 'react-hot-toast'

export default function PODetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showReceive, setShowReceive] = useState(false)
  
  const { data, isLoading } = usePOQuery(id)
  const sendMut = useSendPO()

  if (isLoading) return <Loader />
  // usePOQuery already unwraps res.data?.data — data is the PO object directly
  const po = data
  if (!po) return <div className="p-8">PO not found.</div>

  const handleSend = () => {
    if (confirm('Send PO to Supplier? This registers an outstanding payable amount.')) {
      sendMut.mutate(id, { onSuccess: () => toast.success('PO Sent & Ledger updated') })
    }
  }

  const isDRAFT   = po.status === 'DRAFT'
  const canReceive = po.status === 'SENT' || po.status === 'PARTIAL'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchase-orders')} className="btn-secondary px-3">&larr;</button>
        <h1 className="text-2xl font-bold text-gray-900">Purchase Order: {po.po_no}</h1>
        <div className={`ml-auto px-3 py-1 rounded-full text-xs font-bold uppercase ${
          po.status === 'RECEIVED' ? 'bg-green-100 text-green-700' :
          po.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
          po.status === 'PARTIAL_RECEIVED' ? 'bg-yellow-100 text-yellow-800' :
          po.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
          'bg-gray-200 text-gray-800'
        }`}>
          {po.status.replace('_', ' ')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <div className="card">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <h2 className="font-semibold text-gray-800">Order Lines</h2>
             </div>
             <table className="w-full text-sm text-left">
                <thead className="bg-white border-b border-gray-200 text-gray-500 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3 text-right">Order Qty</th>
                    <th className="px-4 py-3 text-right">Rcvd Qty</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {po.lines.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/30">
                      <td className="px-4 py-3">
                         <p className="font-mono text-xs font-bold text-gray-900 mt-1">{l.sku_code}</p>
                         <p className="text-xs text-gray-500">{l.sku_description}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{parseFloat(l.ordered_qty)} {l.uom}</td>
                      <td className="px-4 py-3 text-right">
                         <span className={parseFloat(l.received_qty) > 0 ? 'text-green-600 font-bold' : 'text-gray-400'}>
                            {parseFloat(l.received_qty)}
                         </span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(l.rate)}</td>
                      <td className="px-4 py-3 text-right font-bold bg-gray-50/50">{formatCurrency(l.line_value)}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
           
           <div className="card p-6 border-l-4 border-green-500">
             <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4">Receipt History (GRNs)</h3>
             {po.receipts && po.receipts.length > 0 ? (
               <div className="space-y-4">
                 {po.receipts.map(r => (
                   <div key={r.id} className="border border-gray-200 rounded p-4 text-sm bg-gray-50">
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                         <span className="font-bold text-gray-900">GRN-{r.id}</span>
                         <span className="text-gray-500">{formatDate(r.receipt_date)}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2 mt-1">Challan: <span className="font-mono text-gray-900">{r.challan_no}</span></p>
                      <table className="w-full text-xs text-left text-gray-700">
                         <thead className="text-[10px] text-gray-500 uppercase border-b border-gray-200">
                           <tr><th>SKU</th><th className="text-right">Rcvd Qty</th><th className="text-right">Value Added to Stock</th></tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                           {r.lines.map(rl => (
                             <tr key={rl.id}>
                               <td className="py-1 font-mono font-medium">{rl.sku_code}</td>
                               <td className="py-1 text-right font-bold text-green-700">{parseFloat(rl.received_qty)}</td>
                               <td className="py-1 text-right">{formatCurrency(parseFloat(rl.received_qty) * parseFloat(rl.unit_price || 0))}</td>
                             </tr>
                           ))}
                         </tbody>
                      </table>
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-sm text-gray-500">No goods receipts registered yet.</p>
             )}
           </div>
        </div>

        <div className="space-y-6">
           <div className="card p-6 bg-gray-900 text-white">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total PO Value</p>
              <p className="text-4xl font-black">{formatCurrency(po.total_value)}</p>
           </div>
           
           <div className="card p-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Supplier Info</h3>
              <p className="font-bold text-gray-900 mb-1">{po.supplier_name}</p>
              <p className="text-sm text-gray-600">{po.supplier_city}</p>
              <button 
                onClick={() => navigate(`/suppliers/${po.supplier_id}`)}
                className="text-xs text-blue-600 hover:underline mt-2 font-medium"
              >
                View Supplier Ledger &rarr;
              </button>
           </div>
           
           <div className="card p-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Meta Data</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">PO Date</span><span className="font-medium">{formatDate(po.po_date)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Expected</span><span className="font-medium">{po.expected_delivery_date ? formatDate(po.expected_delivery_date) : 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Remarks</span><span className="font-medium">{po.remarks || '-'}</span></div>
              </div>
           </div>

           {/* Actions Panel */}
           {['admin', 'manager'].includes(user?.role) && (
             <div className="card p-6 bg-blue-50/50 border border-blue-100">
                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-4">Logistics Actions</h3>
                
                {isDRAFT && (
                  <button onClick={handleSend} disabled={sendMut.isPending} className="btn-primary w-full mb-3 shadow-lg shadow-blue-200">
                    {sendMut.isPending ? 'Sending...' : 'Send PO to Supplier'}
                  </button>
                )}

                {canReceive && (
                  <button onClick={() => setShowReceive(true)} className="btn-primary w-full shadow-lg shadow-green-200" style={{backgroundColor: '#059669'}}>
                    Receive Material (GRN)
                  </button>
                )}
                
                {(!isDRAFT && !canReceive) && (
                  <p className="text-xs text-gray-500 italic text-center">No outstanding logistical actions available.</p>
                )}
             </div>
           )}
        </div>
      </div>
      
      {showReceive && <POReceiveModal po={po} onClose={() => setShowReceive(false)} />}
    </div>
  )
}
