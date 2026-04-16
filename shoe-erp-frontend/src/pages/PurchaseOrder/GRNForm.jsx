import React, { useState } from 'react'
import { useReceivePO } from '../../hooks/usePurchaseOrders'
import toast from 'react-hot-toast'
import { today } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

export default function GRNForm({ po, onClose }) {
  const receiveMut = useReceivePO()

  const [grnDate,  setGrnDate]  = useState(today())
  const [challan,  setChallan]  = useState('')
  const [remarks,  setRemarks]  = useState('')

  // Build editable receive lines from pending PO lines
  const [lines, setLines] = useState(() =>
    (Array.isArray(po.lines) ? po.lines : []).map(l => ({
      line_id:     l.id,
      sku_code:    l.sku_code,
      description: l.sku_description,
      uom:         l.uom,
      ordered_qty: parseFloat(l.ordered_qty) || 0,
      received_qty_prev: parseFloat(l.received_qty) || 0,
      pending_qty: parseFloat(l.pending_qty || l.ordered_qty) || 0,
      rate:        parseFloat(l.rate) || 0,
      receive_qty: String(parseFloat(l.pending_qty || 0) || ''),
    }))
  )

  const updateLine = (idx, val) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, receive_qty: val } : l))
  }

  const totalReceiving = lines.reduce((s, l) => s + (parseFloat(l.receive_qty) || 0), 0)
  const totalValue     = lines.reduce((s, l) => s + (parseFloat(l.receive_qty) || 0) * l.rate, 0)

  const handleSubmit = (e) => {
    e.preventDefault()

    const validLines = lines
      .filter(l => parseFloat(l.receive_qty) > 0)
      .map(l => ({
        line_id:      l.line_id,
        sku_code:     l.sku_code,
        received_qty: parseFloat(l.receive_qty),
        rate:         l.rate,
      }))

    if (validLines.length === 0) {
      toast.error('Enter received qty on at least one line.')
      return
    }

    for (const l of lines) {
      const qty = parseFloat(l.receive_qty)
      if (qty > l.pending_qty + 0.001) {
        toast.error(`${l.sku_code}: receive qty (${qty}) exceeds pending (${l.pending_qty})`)
        return
      }
    }

    receiveMut.mutate(
      { id: po.id, grn_date: grnDate, challan_no: challan, remarks, lines: validLines },
      { onSuccess: (res) => { toast.success(`GRN ${res?.data?.data?.grn_no || ''} recorded!`); onClose() } }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Record GRN — {po.po_no}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{po.supplier_name}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Meta fields */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 border-b border-gray-100">
            <div>
              <label className="label">GRN Date *</label>
              <input type="date" required className="input-field" value={grnDate} onChange={e => setGrnDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Challan / Gate Pass No</label>
              <input type="text" className="input-field" value={challan} onChange={e => setChallan(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="label">Remarks</label>
              <input type="text" className="input-field" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {/* Lines table */}
          <div className="p-6">
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Material</th>
                    <th className="px-4 py-3 text-right">Ordered</th>
                    <th className="px-4 py-3 text-right">Prev Rcvd</th>
                    <th className="px-4 py-3 text-right">Pending</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right w-36 bg-blue-50">Receive Qty *</th>
                    <th className="px-4 py-3 text-right bg-blue-50">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((l, idx) => {
                    const rQty = parseFloat(l.receive_qty) || 0
                    const ok   = l.pending_qty > 0
                    return (
                      <tr key={l.line_id} className={ok ? '' : 'opacity-40'}>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-bold text-gray-900">{l.sku_code}</p>
                          <p className="text-xs text-gray-500">{l.description}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{l.ordered_qty.toFixed(2)} {l.uom}</td>
                        <td className="px-4 py-3 text-right text-gray-400">{l.received_qty_prev.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-700">{l.pending_qty.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(l.rate)}</td>
                        <td className="px-4 py-3 bg-blue-50/40">
                          <input
                            type="number" step="0.001" min="0" max={l.pending_qty}
                            value={l.receive_qty}
                            onChange={e => updateLine(idx, e.target.value)}
                            disabled={!ok}
                            className={`input-field text-right py-1 font-bold ${parseFloat(l.receive_qty) > l.pending_qty ? 'border-red-400' : 'text-blue-900'}`}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-right bg-blue-50/40 font-medium text-gray-800">
                          {rQty > 0 ? formatCurrency(rQty * l.rate) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-4 flex justify-end">
              <div className="bg-gray-900 text-white rounded-xl px-6 py-4 text-sm space-y-1">
                <div className="flex gap-8 justify-between">
                  <span className="text-gray-400">Total Items Receiving</span>
                  <span className="font-bold">{totalReceiving.toFixed(2)}</span>
                </div>
                <div className="flex gap-8 justify-between border-t border-gray-700 pt-1">
                  <span className="text-gray-400">Total GRN Value</span>
                  <span className="font-black text-lg">{formatCurrency(totalValue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={receiveMut.isPending || totalReceiving <= 0}
              className="btn-primary"
              style={{ backgroundColor: '#059669' }}
            >
              {receiveMut.isPending ? 'Recording…' : 'Confirm Receipt (GRN)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
