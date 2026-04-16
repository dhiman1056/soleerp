import React, { useState } from 'react'
import { useDirectGRN } from '../../hooks/usePurchaseOrders'
import { useSuppliers } from '../../hooks/useSuppliers'
import { useStock }     from '../../hooks/useInventory'
import toast from 'react-hot-toast'
import { today } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

const emptyLine = () => ({ sku_code: '', sku_description: '', uom: 'PCS', received_qty: '', rate: '' })

export default function DirectGRNForm({ isOpen, onClose }) {
  const directGRN  = useDirectGRN()
  const { data: suppliersRaw } = useSuppliers?.() || { data: [] }
  const { data: stockRaw }     = useStock()
  const suppliers = Array.isArray(suppliersRaw) ? suppliersRaw : []
  const stockList = Array.isArray(stockRaw)     ? stockRaw     : []

  const [supplierId, setSupplierId] = useState('')
  const [grnDate,    setGrnDate]    = useState(today())
  const [challan,    setChallan]    = useState('')
  const [remarks,    setRemarks]    = useState('')
  const [lines,      setLines]      = useState([emptyLine()])

  if (!isOpen) return null

  const addLine    = () => setLines(prev => [...prev, emptyLine()])
  const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i))
  const updateLine = (i, field, val) =>
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l
      const updated = { ...l, [field]: val }
      // Auto-fill description + uom + rate from stock list when SKU selected
      if (field === 'sku_code') {
        const sk = stockList.find(s => s.sku_code === val)
        if (sk) {
          updated.sku_description = sk.sku_description || ''
          updated.uom             = sk.uom || 'PCS'
          updated.rate            = String(sk.avg_rate || '')
        }
      }
      return updated
    }))

  const totalValue = lines.reduce((s, l) => s + (parseFloat(l.received_qty)||0) * (parseFloat(l.rate)||0), 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    const validLines = lines.filter(l => l.sku_code && parseFloat(l.received_qty) > 0)
    if (validLines.length === 0) { toast.error('Add at least one valid line.'); return }

    const payload = {
      supplier_id: supplierId ? parseInt(supplierId) : undefined,
      grn_date:    grnDate,
      challan_no:  challan,
      remarks,
      lines: validLines.map(l => ({
        sku_code:       l.sku_code,
        sku_description: l.sku_description,
        uom:             l.uom,
        received_qty:    parseFloat(l.received_qty),
        rate:            parseFloat(l.rate) || 0,
      })),
    }

    directGRN.mutate(payload, {
      onSuccess: (res) => {
        toast.success(`Direct GRN ${res?.data?.data?.grn_no || ''} recorded!`)
        onClose()
      },
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Direct GRN (Without PO)</h2>
          <p className="text-sm text-gray-500">Receive material without a purchase order reference</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Meta */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 border-b border-gray-100">
            <div>
              <label className="label">Supplier (Optional)</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="input-field">
                <option value="">— No Supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">GRN Date *</label>
              <input type="date" required value={grnDate} onChange={e => setGrnDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Challan / Gate Pass</label>
              <input value={challan} onChange={e => setChallan(e.target.value)} className="input-field" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Remarks</label>
              <input value={remarks} onChange={e => setRemarks(e.target.value)} className="input-field" placeholder="Optional" />
            </div>
          </div>

          {/* Lines */}
          <div className="p-6 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">Material Lines</h3>
              <button type="button" onClick={addLine} className="text-xs text-blue-600 font-semibold hover:underline">+ Add Line</button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-2 text-left">SKU Code</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-center w-20">UOM</th>
                    <th className="px-3 py-2 text-right w-28">Qty *</th>
                    <th className="px-3 py-2 text-right w-28">Rate (₹)</th>
                    <th className="px-3 py-2 text-right w-28 bg-blue-50">Value</th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <input
                          list={`sku-opts-${i}`}
                          value={l.sku_code}
                          onChange={e => updateLine(i, 'sku_code', e.target.value)}
                          placeholder="SKU code"
                          className="input-field py-1 text-xs font-mono uppercase"
                        />
                        <datalist id={`sku-opts-${i}`}>
                          {stockList.map(s => <option key={s.sku_code} value={s.sku_code}>{s.sku_description}</option>)}
                        </datalist>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={l.sku_description}
                          onChange={e => updateLine(i, 'sku_description', e.target.value)}
                          placeholder="Description"
                          className="input-field py-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={l.uom}
                          onChange={e => updateLine(i, 'uom', e.target.value)}
                          className="input-field py-1 text-xs text-center"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="0.001" step="0.001"
                          value={l.received_qty}
                          onChange={e => updateLine(i, 'received_qty', e.target.value)}
                          placeholder="0"
                          className="input-field py-1 text-right tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={l.rate}
                          onChange={e => updateLine(i, 'rate', e.target.value)}
                          placeholder="0.00"
                          className="input-field py-1 text-right tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800 bg-blue-50/30">
                        {parseFloat(l.received_qty) > 0 && parseFloat(l.rate) > 0
                          ? formatCurrency(parseFloat(l.received_qty) * parseFloat(l.rate))
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          disabled={lines.length === 1}
                          className="text-red-400 hover:text-red-600 disabled:opacity-30 text-lg"
                        >×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end">
              <div className="bg-gray-900 text-white rounded-xl px-5 py-3 text-sm">
                <span className="text-gray-400">Total Value: </span>
                <span className="font-black text-base ml-2">{formatCurrency(totalValue)}</span>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={directGRN.isPending} className="btn-primary" style={{ backgroundColor: '#059669' }}>
              {directGRN.isPending ? 'Recording…' : 'Confirm Direct GRN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
