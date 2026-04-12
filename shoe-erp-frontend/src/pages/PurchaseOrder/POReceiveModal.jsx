import React from 'react';
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePOQuery, useSendPO, useReceivePO } from '../../hooks/usePurchaseOrders'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

export default function POReceiveModal({ po, onClose }) {
  const receiveMut = useReceivePO()
  
  // Initialize lines with expected balance qty
  const [lines, setLines] = useState(
    po.lines.map(l => ({
      po_line_id: l.id,
      sku_code: l.sku_code,
      description: l.sku_description,
      uom: l.uom,
      order_qty: parseFloat(l.order_qty),
      prev_received: parseFloat(l.received_qty),
      balance: parseFloat(l.order_qty) - parseFloat(l.received_qty),
      receive_qty: parseFloat(l.order_qty) - parseFloat(l.received_qty) // Default fill
    }))
  )

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [challan, setChallan] = useState('')
  const [remarks, setRemarks] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const validLines = lines.filter(l => l.receive_qty > 0)
    if (validLines.length === 0) return toast.error('You must receive >0 qty on at least one line.')

    // Optional validation: don't receive more than balance unless intentional over-receipt is allowed
    // Here we will restrict
    for (let l of validLines) {
      if (l.receive_qty > l.balance) return toast.error(`Received qty for ${l.sku_code} exceeds balance.`)
    }

    const payload = {
      receipt_date: date,
      challan_no: challan,
      remarks,
      lines: validLines.map(l => ({ po_line_id: l.po_line_id, receive_qty: l.receive_qty }))
    }

    receiveMut.mutate({ id: po.id, data: payload }, {
      onSuccess: () => { toast.success('GRN Generated'); onClose(); }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 overflow-y-auto w-full h-full flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 relative">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Receive PO: {po.po_no} (GRN)</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
             <div>
               <label className="text-xs font-semibold text-gray-600 block mb-1">Receipt Date</label>
               <input type="date" required className="input-field" value={date} onChange={e => setDate(e.target.value)} />
             </div>
             <div>
               <label className="text-xs font-semibold text-gray-600 block mb-1">Gate Pass / Challan No *</label>
               <input type="text" required className="input-field" value={challan} onChange={e => setChallan(e.target.value)} />
             </div>
             <div>
               <label className="text-xs font-semibold text-gray-600 block mb-1">Remarks</label>
               <input type="text" className="input-field" value={remarks} onChange={e => setRemarks(e.target.value)} />
             </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-gray-100 text-gray-700 sticky top-0 uppercase text-xs font-semibold">
                 <tr>
                   <th className="px-4 py-2">Material</th>
                   <th className="px-4 py-2 text-right">Order Qty</th>
                   <th className="px-4 py-2 text-right">Previously Rcvd</th>
                   <th className="px-4 py-2 text-right">Balance</th>
                   <th className="px-4 py-2 text-right w-32 bg-blue-50/50">Receive Qty</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {lines.map((l, idx) => (
                   <tr key={l.po_line_id}>
                     <td className="px-4 py-3">
                       <span className="font-mono text-xs font-bold block">{l.sku_code}</span>
                       <span className="text-xs text-gray-500">{l.description}</span>
                     </td>
                     <td className="px-4 py-3 text-right">{l.order_qty} {l.uom}</td>
                     <td className="px-4 py-3 text-right text-gray-400">{l.prev_received} {l.uom}</td>
                     <td className="px-4 py-3 text-right font-bold text-gray-700">{l.balance} {l.uom}</td>
                     <td className="px-4 py-3 bg-blue-50/20">
                       <input 
                         type="number" step="0.001" min="0" max={l.balance}
                         className="input-field text-right py-1 text-blue-900 font-bold"
                         value={l.receive_qty}
                         onChange={e => {
                           const newL = [...lines]; newL[idx].receive_qty = e.target.value; setLines(newL)
                         }}
                         disabled={l.balance <= 0}
                       />
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={receiveMut.isLoading} className="btn-primary" style={{backgroundColor: '#059669'}}>
              {receiveMut.isLoading ? 'Processing...' : 'Confirm Goods Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
