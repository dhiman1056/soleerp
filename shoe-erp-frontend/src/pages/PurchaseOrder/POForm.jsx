import React, { useState } from 'react'
import { useNavigate }  from 'react-router-dom'
import { useCreatePO }  from '../../hooks/usePurchaseOrders'
import { useSuppliers } from '../../hooks/useSuppliers'
import { useRawMaterials } from '../../hooks/useRawMaterials'
import { formatCurrency }  from '../../utils/formatCurrency'
import toast from 'react-hot-toast'

export default function POForm() {
  const navigate  = useNavigate()
  const createMut = useCreatePO()

  // Both hooks now return the array directly (res.data.data extracted in queryFn)
  const { data: suppliersRaw, isLoading: supLoading } = useSuppliers({ is_active: true })
  const { data: materialsRaw, isLoading: rmLoading  } = useRawMaterials({ limit: 500, is_active: 'true' })

  // Safe array extraction — defensive even though hooks already return arrays
  const suppliers = Array.isArray(suppliersRaw) ? suppliersRaw : []
  const materials = Array.isArray(materialsRaw) ? materialsRaw : []

  const [form, setForm] = useState({
    supplier_id:            '',
    po_date:                new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    remarks:                '',
  })

  const [lines, setLines] = useState([
    { sku_code: '', order_qty: '', unit_price: '', expected_date: '' },
  ])

  const calcTotal = () =>
    lines.reduce((sum, line) =>
      sum + (Number(line.order_qty) || 0) * (Number(line.unit_price) || 0), 0)

  const updateLine = (idx, patch) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  const handleMaterialChange = (idx, val) => {
    const mat = materials.find(m => m.sku_code === val)
    updateLine(idx, {
      sku_code:   val,
      unit_price: mat ? (Number(mat.rate) || Number(mat.rate_per_unit) || '') : '',
    })
  }

  const addLine = () =>
    setLines(prev => [...prev, { sku_code: '', order_qty: '', unit_price: '', expected_date: '' }])

  const removeLine = (idx) =>
    setLines(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.supplier_id) return toast.error('Please select a supplier')
    const cleanLines = lines.filter(l => l.sku_code && (Number(l.order_qty) || 0) > 0)
    if (cleanLines.length === 0) return toast.error('Add at least one valid material line')

    createMut.mutate(
      { ...form, lines: cleanLines },
      { onSuccess: () => { toast.success('PO Created'); navigate('/purchase-orders') } }
    )
  }

  const isLoading = supLoading || rmLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchase-orders')} className="btn-secondary px-3">&larr;</button>
        <h1 className="text-2xl font-bold text-gray-900">Create Purchase Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Header fields ── */}
        <div className="card p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Supplier *</label>
            <select
              required
              className="input-field"
              value={form.supplier_id}
              onChange={e => setForm({ ...form, supplier_id: e.target.value })}
              disabled={supLoading}
            >
              <option value="">{supLoading ? 'Loading suppliers…' : 'Select Supplier...'}</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.supplier_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">PO Date *</label>
            <input
              type="date"
              required
              className="input-field"
              value={form.po_date}
              onChange={e => setForm({ ...form, po_date: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Expected Delivery (Overall)</label>
            <input
              type="date"
              className="input-field"
              value={form.expected_delivery_date}
              onChange={e => setForm({ ...form, expected_delivery_date: e.target.value })}
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600 block mb-1">General Remarks</label>
            <input
              type="text"
              className="input-field"
              value={form.remarks}
              onChange={e => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
        </div>

        {/* ── PO Lines ── */}
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-semibold text-gray-800">PO Lines</h2>
            <button
              type="button"
              onClick={addLine}
              className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100"
            >
              + Add Item
            </button>
          </div>

          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white border-b border-gray-200 text-gray-500 text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">Material</th>
                  <th className="px-4 py-3 font-semibold w-24">Qty</th>
                  <th className="px-4 py-3 font-semibold w-32">Unit Price (₹)</th>
                  <th className="px-4 py-3 font-semibold w-40">Expected Date</th>
                  <th className="px-4 py-3 font-semibold w-32 text-right">Line Total</th>
                  <th className="px-4 py-3 font-semibold w-12 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, idx) => {
                  const lineTotal = (Number(line.order_qty) || 0) * (Number(line.unit_price) || 0)
                  return (
                    <tr key={idx}>
                      <td className="px-4 py-2">
                        <select
                          required
                          className="input-field py-1.5 text-sm"
                          value={line.sku_code}
                          onChange={e => handleMaterialChange(idx, e.target.value)}
                          disabled={rmLoading}
                        >
                          <option value="">
                            {rmLoading ? 'Loading materials…' : 'Select Material...'}
                          </option>
                          {materials.map(m => (
                            <option key={m.sku_code} value={m.sku_code}>
                              {m.sku_code} - {m.description}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.001"
                          required
                          min="0.001"
                          className="input-field py-1.5 text-sm"
                          value={line.order_qty}
                          onChange={e => updateLine(idx, { order_qty: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0"
                          className="input-field py-1.5 text-sm"
                          value={line.unit_price}
                          onChange={e => updateLine(idx, { unit_price: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          className="input-field py-1.5 text-sm text-gray-500"
                          value={line.expected_date}
                          onChange={e => updateLine(idx, { expected_date: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900 bg-gray-50/50">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-red-400 hover:text-red-600 text-lg leading-none"
                          >
                            &times;
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-right font-bold text-gray-600 uppercase text-xs tracking-wider">
                    Total PO Value:
                  </td>
                  <td className="px-4 py-4 text-right font-black text-lg text-blue-600">
                    {formatCurrency(calcTotal())}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate('/purchase-orders')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={createMut.isPending} className="btn-primary px-8">
            {createMut.isPending ? 'Processing...' : 'Create Draft PO'}
          </button>
        </div>
      </form>
    </div>
  )
}
