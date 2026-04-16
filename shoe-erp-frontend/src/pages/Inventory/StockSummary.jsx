import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Table from '../../components/common/Table'
import { useStockSummaryQuery, useUpdateReorderLevel, useAddOpeningStock } from '../../hooks/useInventory'
import { formatCurrency } from '../../utils/formatCurrency'
import { downloadFile }   from '../../utils/downloadFile'
import StockAdjustment    from './StockAdjustment'
import { useAuth }        from '../../hooks/useAuth'
import { today }          from '../../utils/formatDate'

// ── Opening/Adjustment Stock Mini-Modal ───────────────────────────
function StockAddModal({ row, onClose }) {
  const addOS  = useAddOpeningStock()
  const [qty,    setQty]    = useState('')
  const [rate,   setRate]   = useState(String(row?.avg_rate || ''))
  const [date,   setDate]   = useState(today())
  const [reason, setReason] = useState('Opening Stock')
  const [rem,    setRem]    = useState('')

  if (!row) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const q = parseFloat(qty)
    const r = parseFloat(rate) || 0
    if (!q || q <= 0) { alert('Qty must be > 0'); return }
    addOS.mutate(
      { sku_code: row.sku_code, opening_qty: q, rate: r, opening_date: date, remarks: rem || reason },
      { onSuccess: onClose }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add / Adjust Stock</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-mono font-semibold text-gray-800">{row.sku_code}</span> — {row.sku_description}
          </p>
          <p className="text-xs text-blue-600 mt-1">Current Stock: <strong>{(Number(row.current_qty) || 0).toFixed(3)} {row.uom}</strong></p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="input-field">
              <option>Opening Stock</option>
              <option>Stock Adjustment</option>
              <option>Physical Count Correction</option>
              <option>Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Qty to Add ({row.uom}) *</label>
              <input
                type="number" min="0.001" step="0.001" required
                value={qty} onChange={e => setQty(e.target.value)}
                className="input-field text-right tabular-nums"
                placeholder="0.000" autoFocus
              />
            </div>
            <div>
              <label className="label">Rate per {row.uom} (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={rate} onChange={e => setRate(e.target.value)}
                className="input-field text-right tabular-nums"
                placeholder={row.avg_rate || '0.00'}
              />
            </div>
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Remarks</label>
            <input value={rem} onChange={e => setRem(e.target.value)} className="input-field" placeholder="Optional notes…" />
          </div>
          {qty && (
            <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm flex justify-between">
              <span className="text-gray-600">Value Added</span>
              <span className="font-bold text-green-800">₹{(parseFloat(qty||0) * parseFloat(rate||0)).toFixed(2)}</span>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={addOS.isPending} className="btn-primary flex-1">
              {addOS.isPending ? 'Saving…' : 'Add to Stock'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main StockSummary ─────────────────────────────────────────────
export default function StockSummary() {
  const navigate = useNavigate()
  const { role } = useAuth()

  const { data, isLoading } = useStockSummaryQuery()
  const updateMut = useUpdateReorderLevel()

  const [search,      setSearch]      = useState('')
  const [editingSku,  setEditingSku]  = useState(null)
  const [editVal,     setEditVal]     = useState('')
  const [isAdjOpen,   setIsAdjOpen]   = useState(false)
  const [stockAddRow, setStockAddRow] = useState(null)  // row for "Add Stock" modal

  const records = Array.isArray(data) ? data : []

  const filtered = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(r =>
      (r.sku_code       || '').toLowerCase().includes(q) ||
      (r.sku_description || '').toLowerCase().includes(q)
    )
  }, [search, records])

  const totalValue      = records.reduce((acc, r) => acc + (Number(r.current_value) || 0), 0)
  const lowStockCount   = records.filter(r => (Number(r.current_qty)||0) > 0 && (Number(r.current_qty)||0) <= (Number(r.reorder_level)||0)).length
  const outOfStockCount = records.filter(r => (Number(r.current_qty)||0) <= 0).length

  const handleSaveReorder = (sku) =>
    updateMut.mutate({ sku_code: sku, reorder_level: Number(editVal) || 0 }, { onSuccess: () => setEditingSku(null) })

  const canEdit = role === 'admin' || role === 'manager'

  const columns = [
    { key: 'sku_code',        label: 'SKU Code',    className: 'font-mono text-xs font-semibold' },
    { key: 'sku_description', label: 'Description' },
    { key: 'uom',             label: 'UOM', align: 'center', className: 'font-mono text-xs' },
    {
      key: 'current_qty', label: 'Current Qty', align: 'right',
      render: r => <span className="tabular-nums font-semibold">{(Number(r.current_qty) || 0).toFixed(3)}</span>,
    },
    {
      key: 'avg_rate', label: 'Avg Rate (₹)', align: 'right',
      render: r => <span className="tabular-nums">{formatCurrency(r.avg_rate)}</span>,
    },
    {
      key: 'current_value', label: 'Stock Value (₹)', align: 'right',
      render: r => <span className="tabular-nums font-semibold">{formatCurrency(r.current_value)}</span>,
    },
    {
      key: 'reorder_level', label: 'Reorder Lvl', align: 'right',
      render: r => {
        if (editingSku === r.sku_code) {
          return (
            <div className="flex items-center justify-end gap-1">
              <input autoFocus type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                className="input-field py-1 px-2 w-20 text-right text-xs" />
              <button disabled={updateMut.isPending} onClick={() => handleSaveReorder(r.sku_code)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">✓</button>
              <button disabled={updateMut.isPending} onClick={() => setEditingSku(null)} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">✕</button>
            </div>
          )
        }
        return (
          <span
            className="cursor-pointer hover:text-blue-600 tabular-nums border-b border-dashed border-gray-400 pb-0.5"
            onClick={() => { setEditingSku(r.sku_code); setEditVal(r.reorder_level) }}
          >
            {(Number(r.reorder_level) || 0).toFixed(3)}
          </span>
        )
      },
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: r => {
        const q  = Number(r.current_qty) || 0
        const rl = Number(r.reorder_level) || 0
        if (q <= 0)           return <span className="px-2 py-0.5 bg-red-100     text-red-700     rounded-full text-xs font-semibold">Out of Stock</span>
        if (rl > 0 && q <= rl) return <span className="px-2 py-0.5 bg-amber-100  text-amber-700   rounded-full text-xs font-semibold">Low Stock</span>
        return                        <span className="px-2 py-0.5 bg-green-100   text-green-700   rounded-full text-xs font-semibold">In Stock</span>
      },
    },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: r => (
        <div className="flex items-center justify-end gap-2">
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); setStockAddRow(r) }}
              className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 font-medium whitespace-nowrap"
            >
              + Add Stock
            </button>
          )}
          <button
            onClick={() => navigate(`/inventory/ledger?sku=${r.sku_code}`)}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Ledger
          </button>
        </div>
      ),
    },
  ]

  const handleExport = () => downloadFile('/api/export/stock/excel', 'Stock_Report.xlsx')

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Total SKUs</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{records.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Total Stock Value</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{formatCurrency(totalValue)}</p>
        </div>
        <div className="card p-4 bg-amber-50 border border-amber-100">
          <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Low Stock</p>
          <p className="text-2xl font-bold mt-1 text-amber-900">{lowStockCount}</p>
        </div>
        <div className="card p-4 bg-red-50 border border-red-100">
          <p className="text-xs text-red-700 font-semibold uppercase tracking-wide">Out of Stock</p>
          <p className="text-2xl font-bold mt-1 text-red-900">{outOfStockCount}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search by SKU or Description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field max-w-sm"
        />
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={() => setIsAdjOpen(true)} className="btn-secondary border-dashed text-gray-700">
              Stock Adjustment
            </button>
          )}
          <button onClick={handleExport} className="btn-secondary">Export Excel</button>
        </div>
      </div>

      <Table columns={columns} data={filtered} loading={isLoading} empty="No inventory records found." />

      <StockAdjustment isOpen={isAdjOpen} onClose={() => setIsAdjOpen(false)} />

      {/* Add/Opening Stock Modal per row */}
      {stockAddRow && (
        <StockAddModal row={stockAddRow} onClose={() => setStockAddRow(null)} />
      )}
    </div>
  )
}
