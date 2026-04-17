import React, { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Table from '../../components/common/Table'
import {
  useStock,
  useUpdateReorderLevel,
  useAddOpeningStock,
} from '../../hooks/useInventory'
import { formatCurrency } from '../../utils/formatCurrency'
import { downloadFile }   from '../../utils/downloadFile'
import StockAdjustment    from './StockAdjustment'
import { useAuth }        from '../../hooks/useAuth'
import { today }          from '../../utils/formatDate'

// ── Debounce hook ─────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// ── Badge helpers ─────────────────────────────────────────────────
function StockStatusBadge({ status }) {
  if (status === 'OUT_OF_STOCK')
    return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Out of Stock</span>
  if (status === 'LOW_STOCK')
    return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Low Stock</span>
  return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">In Stock</span>
}

function ProductTypeBadge({ type }) {
  const map = {
    RAW_MATERIAL:   'bg-gray-100 text-gray-700',
    SEMI_FINISHED:  'bg-blue-100 text-blue-700',
    FINISHED:       'bg-purple-100 text-purple-700',
  }
  const cls = map[type] || 'bg-gray-100 text-gray-600'
  const label = (type || '').replace(/_/g, ' ')
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}

// ── Opening Stock Modal ───────────────────────────────────────────
function StockAddModal({ row, onClose }) {
  const addOS  = useAddOpeningStock()
  const [qty,    setQty]    = useState('')
  const [rate,   setRate]   = useState(String(row?.avg_rate || ''))
  const [date,   setDate]   = useState(today())
  const [reason, setReason] = useState('Opening Stock')
  const [rem,    setRem]    = useState('')

  if (!row) return null

  const previewQty   = parseFloat(qty)   || 0
  const previewRate  = parseFloat(rate)  || 0
  const afterQty     = (Number(row.current_qty) || 0) + previewQty
  const addedValue   = previewQty * previewRate

  const handleSubmit = (e) => {
    e.preventDefault()
    const q = parseFloat(qty)
    const r = parseFloat(rate) || 0
    if (!q || q <= 0) { alert('Qty must be > 0'); return }
    addOS.mutate(
      {
        sku_code:     row.sku_code,
        opening_qty:  q,     // backend expects opening_qty
        rate:         r,
        opening_date: date,  // backend expects opening_date
        remarks:      rem || reason,
      },
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
          <p className="text-xs text-blue-600 mt-1">
            Current Stock: <strong>{(Number(row.current_qty) || 0).toFixed(3)} {row.uom}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="input-field">
              <option>Opening Stock</option>
              <option>Stock Adjustment - Addition</option>
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

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">After adding:</span>
              <span className="font-bold text-blue-800">{afterQty.toFixed(3)} {row.uom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Value added:</span>
              <span className="font-bold text-green-800">₹{addedValue.toFixed(2)}</span>
            </div>
          </div>

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
const PAGE_SIZE = 50

export default function StockSummary() {
  const navigate = useNavigate()
  const { role } = useAuth()

  // Filter state
  const [search,      setSearch]      = useState('')
  const [typeFilter,  setTypeFilter]  = useState('')
  const [statusFilter,setStatusFilter]= useState('')
  const [page,        setPage]        = useState(1)

  // UI state
  const [editingSku,  setEditingSku]  = useState(null)
  const [editVal,     setEditVal]     = useState('')
  const [isAdjOpen,   setIsAdjOpen]   = useState(false)
  const [stockAddRow, setStockAddRow] = useState(null)

  const debouncedSearch = useDebounce(search)

  // Reset to page 1 whenever filters change
  const resetPage = useCallback(() => setPage(1), [])
  const handleSearch      = (v) => { setSearch(v);      resetPage() }
  const handleTypeFilter  = (v) => { setTypeFilter(v);  resetPage() }
  const handleStatusFilter= (v) => { setStatusFilter(v);resetPage() }

  const params = {
    search:       debouncedSearch || undefined,
    product_type: typeFilter       || undefined,
    stock_status: statusFilter     || undefined,
    page,
    limit: PAGE_SIZE,
  }

  const { data, isLoading } = useStock(params)
  const updateMut = useUpdateReorderLevel()

  const items = Array.isArray(data?.items) ? data.items
              : Array.isArray(data)        ? data
              : []
  const total = data?.total ?? items.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Summary stats (across current page; server handles filtering)
  const totalValue      = items.reduce((acc, r) => acc + (Number(r.current_value) || 0), 0)
  const lowStockCount   = items.filter(r => r.stock_status === 'LOW_STOCK').length
  const outOfStockCount = items.filter(r => r.stock_status === 'OUT_OF_STOCK').length

  const handleSaveReorder = (sku) =>
    updateMut.mutate({ sku_code: sku, reorder_level: Number(editVal) || 0 }, { onSuccess: () => setEditingSku(null) })

  const canEdit = role === 'admin' || role === 'manager'

  const columns = [
    { key: 'sku_code',        label: 'SKU Code',    className: 'font-mono text-xs font-semibold' },
    { key: 'sku_description', label: 'Description' },
    {
      key: 'product_type', label: 'Type', align: 'center',
      render: r => <ProductTypeBadge type={r.product_type} />,
    },
    { key: 'uom', label: 'UOM', align: 'center', className: 'font-mono text-xs' },
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
      key: 'stock_status', label: 'Status', align: 'center',
      render: r => <StockStatusBadge status={r.stock_status} />,
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
              + Stock
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
          <p className="text-2xl font-bold mt-1 text-gray-900">{total}</p>
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

      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 flex-1">
          <input
            type="text"
            placeholder="Search SKU or Description…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="input-field max-w-xs"
          />
          <select
            value={typeFilter}
            onChange={e => handleTypeFilter(e.target.value)}
            className="input-field w-44"
          >
            <option value="">All Types</option>
            <option value="RAW_MATERIAL">Raw Material</option>
            <option value="SEMI_FINISHED">Semi-Finished</option>
            <option value="FINISHED">Finished</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => handleStatusFilter(e.target.value)}
            className="input-field w-44"
          >
            <option value="">All Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>

        <div className="flex gap-2 shrink-0">
          {canEdit && (
            <button onClick={() => setIsAdjOpen(true)} className="btn-secondary border-dashed text-gray-700">
              Stock Adjustment
            </button>
          )}
          <button onClick={handleExport} className="btn-secondary">Export Excel</button>
        </div>
      </div>

      <Table columns={columns} data={items} loading={isLoading} empty="No inventory records found." />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} SKUs
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary text-sm py-1 px-3 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary text-sm py-1 px-3 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <StockAdjustment isOpen={isAdjOpen} onClose={() => setIsAdjOpen(false)} />

      {stockAddRow && (
        <StockAddModal row={stockAddRow} onClose={() => setStockAddRow(null)} />
      )}
    </div>
  )
}
