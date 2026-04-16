import React, { useState } from 'react'
import { useCreatePRN } from '../../hooks/usePurchaseOrders'
import toast from 'react-hot-toast'
import { today } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

const RETURN_REASONS = ['Quality Issue', 'Wrong Item Received', 'Excess Quantity', 'Damaged Material', 'Other']

export default function PRNForm({ po, onClose }) {
  const createPRN = useCreatePRN()

  const [prnDate,  setPrnDate]  = useState(today())
  const [grnRef,   setGrnRef]   = useState('')
  const [remarks,  setRemarks]  = useState('')

  // Build return lines from received PO lines (only received qty is returnable)
  const [lines, setLines] = useState(() =>
    (Array.isArray(po?.lines) ? po.lines : [])
      .filter(l => parseFloat(l.received_qty) > 0)
      .map(l => ({
        sku_code:       l.sku_code,
        sku_description: l.sku_description,
        uom:             l.uom,
        received_qty:    parseFloat(l.received_qty) || 0,
        rate:            parseFloat(l.rate) || 0,
        return_qty:      '',
        reason:          'Quality Issue',
        selected:        false,
      }))
  )

  const toggleLine = (i) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, selected: !l.selected, return_qty: l.selected ? '' : String(l.received_qty) } : l))

  const updateLine = (i, field, val) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))

  const selectedLines = lines.filter(l => l.selected && parseFloat(l.return_qty) > 0)
  const totalValue    = selectedLines.reduce((s, l) => s + (parseFloat(l.return_qty)||0) * l.rate, 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedLines.length === 0) { toast.error('Select at least one line to return.'); return }

    for (const l of selectedLines) {
      const rq = parseFloat(l.return_qty)
      if (rq > l.received_qty + 0.001) {
        toast.error(`${l.sku_code}: Cannot return more than received (${l.received_qty}).`)
        return
      }
    }

    createPRN.mutate(
      {
        supplier_id:   po.supplier_id,
        supplier_name: po.supplier_name,
        grn_no:        grnRef || undefined,
        prn_date:      prnDate,
        remarks,
        lines: selectedLines.map(l => ({
          sku_code:       l.sku_code,
          sku_description: l.sku_description,
          uom:             l.uom,
          return_qty:      parseFloat(l.return_qty),
          rate:            l.rate,
          reason:          l.reason,
        })),
      },
      {
        onSuccess: (res) => {
          toast.success(`PRN ${res?.data?.data?.prn_no || ''} created!`)
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Purchase Return Note (PRN)</h2>
          <p className="text-sm text-gray-500">{po.supplier_name} · {po.po_no}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Meta */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-red-50/30 border-b border-gray-100">
            <div>
              <label className="label">PRN Date *</label>
              <input type="date" required value={prnDate} onChange={e => setPrnDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Reference GRN No (Optional)</label>
              <input value={grnRef} onChange={e => setGrnRef(e.target.value)} className="input-field" placeholder="GRN-0001" />
            </div>
            <div>
              <label className="label">Remarks</label>
              <input value={remarks} onChange={e => setRemarks(e.target.value)} className="input-field" placeholder="Optional" />
            </div>
          </div>

          {/* Lines */}
          <div className="p-6 space-y-3">
            <p className="text-sm text-gray-500">Select lines to return and enter return quantities:</p>

            {lines.length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                <p>No received lines available for return on this PO.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-2 w-8" />
                      <th className="px-3 py-2 text-left">Material</th>
                      <th className="px-3 py-2 text-right">Received</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right w-32 bg-red-50">Return Qty *</th>
                      <th className="px-3 py-2 text-left w-40">Reason</th>
                      <th className="px-3 py-2 text-right bg-red-50">Return Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((l, i) => (
                      <tr key={l.sku_code} className={l.selected ? 'bg-red-50/40' : ''}>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={l.selected}
                            onChange={() => toggleLine(i)}
                            className="w-4 h-4 accent-red-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-mono text-xs font-bold">{l.sku_code}</p>
                          <p className="text-xs text-gray-500">{l.sku_description}</p>
                        </td>
                        <td className="px-3 py-2 text-right text-green-700 font-semibold">{l.received_qty.toFixed(2)} {l.uom}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(l.rate)}</td>
                        <td className="px-3 py-2 bg-red-50/30">
                          <input
                            type="number" min="0.001" step="0.001" max={l.received_qty}
                            value={l.return_qty}
                            onChange={e => updateLine(i, 'return_qty', e.target.value)}
                            disabled={!l.selected}
                            placeholder="0"
                            className={`input-field py-1 text-right tabular-nums ${!l.selected ? 'opacity-40' : 'text-red-700 font-bold'}`}
                          />
                          {l.selected && parseFloat(l.return_qty) > l.received_qty && (
                            <p className="text-red-500 text-xs mt-0.5">Exceeds received</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={l.reason}
                            onChange={e => updateLine(i, 'reason', e.target.value)}
                            disabled={!l.selected}
                            className={`input-field py-1 text-xs ${!l.selected ? 'opacity-40' : ''}`}
                          >
                            {RETURN_REASONS.map(r => <option key={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-red-700 bg-red-50/30">
                          {l.selected && parseFloat(l.return_qty) > 0
                            ? formatCurrency(parseFloat(l.return_qty) * l.rate)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalValue > 0 && (
              <div className="flex justify-end">
                <div className="bg-red-700 text-white rounded-xl px-5 py-3 text-sm">
                  <span className="text-red-200">Total Return Value: </span>
                  <span className="font-black text-base ml-2">{formatCurrency(totalValue)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={createPRN.isPending || selectedLines.length === 0}
              className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              {createPRN.isPending ? 'Creating…' : 'Create PRN & Deduct Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
