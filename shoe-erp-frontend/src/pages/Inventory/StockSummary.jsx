import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useNavigate } from 'react-router-dom'
import Table from '../../components/common/Table'
import { useStockSummaryQuery, useUpdateReorderLevel } from '../../hooks/useInventory'
import { formatCurrency } from '../../utils/formatCurrency'
import { downloadFile } from '../../utils/downloadFile'
import StockAdjustment from './StockAdjustment'
import { useAuth } from '../../hooks/useAuth'

export default function StockSummary() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { data, isLoading } = useStockSummaryQuery()
  const updateMut = useUpdateReorderLevel()

  const [search, setSearch] = useState('')
  const [editingSku, setEditingSku] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [isAdjOpen, setIsAdjOpen] = useState(false)

  const records = data?.data || []

  const filtered = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(
      r => r.sku_code.toLowerCase().includes(q) || r.sku_description.toLowerCase().includes(q)
    )
  }, [search, records])

  const totalValue = records.reduce((acc, r) => acc + parseFloat(r.current_value), 0)
  const lowStockCount = records.filter(r => r.current_qty > 0 && r.current_qty <= r.reorder_level).length
  const outOfStockCount = records.filter(r => r.current_qty <= 0).length

  const handleSaveReorder = (sku) => {
    updateMut.mutate({ sku_code: sku, reorder_level: parseFloat(editVal) || 0 }, {
      onSuccess: () => setEditingSku(null)
    })
  }

  const columns = [
    { key: 'sku_code', label: 'SKU Code', className: 'font-mono text-xs font-semibold' },
    { key: 'sku_description', label: 'Description' },
    { key: 'uom', label: 'UOM', align: 'center', className: 'font-mono text-xs' },
    { 
      key: 'current_qty', label: 'Current Qty', align: 'right',
      render: r => <span className="tabular-nums font-semibold">{parseFloat(r.current_qty).toFixed(3)}</span> 
    },
    { 
      key: 'avg_rate', label: 'Avg Rate (₹)', align: 'right',
      render: r => <span className="tabular-nums">{formatCurrency(r.avg_rate)}</span> 
    },
    { 
      key: 'current_value', label: 'Current Value (₹)', align: 'right',
      render: r => <span className="tabular-nums font-semibold">{formatCurrency(r.current_value)}</span> 
    },
    {
      key: 'reorder_level', label: 'Reorder Level', align: 'right',
      render: r => {
        if (editingSku === r.sku_code) {
          return (
            <div className="flex items-center justify-end gap-1">
              <input 
                autoFocus
                type="number" 
                value={editVal} 
                onChange={e => setEditVal(e.target.value)} 
                className="input-field py-1 px-2 w-20 text-right text-xs" 
              />
              <button disabled={updateMut.isPending} onClick={() => handleSaveReorder(r.sku_code)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Save</button>
              <button disabled={updateMut.isPending} onClick={() => setEditingSku(null)} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">X</button>
            </div>
          )
        }
        return (
          <span className="cursor-pointer hover:text-blue-600 tabular-nums border-b border-dashed border-gray-400 pb-0.5" onClick={() => { setEditingSku(r.sku_code); setEditVal(r.reorder_level) }}>
            {parseFloat(r.reorder_level).toFixed(3)}
          </span>
        )
      }
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: r => {
        const q = parseFloat(r.current_qty)
        const rl = parseFloat(r.reorder_level)
        if (q <= 0) return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Out of Stock</span>
        if (rl > 0 && q <= rl) return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Low Stock</span>
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">In Stock</span>
      }
    },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: r => (
        <button onClick={() => navigate(`/inventory/ledger?sku=${r.sku_code}`)} className="text-xs text-blue-600 hover:underline font-medium">View Ledger</button>
      )
    }
  ]

  const handleExport = () => downloadFile('/api/export/stock/excel', 'Stock_Report.xlsx')

  return (
    <div className="space-y-4">
      {/* Top summary bar */}
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
          <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Low Stock Count</p>
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
          {(role === 'admin' || role === 'manager') && (
            <button onClick={() => setIsAdjOpen(true)} className="btn-secondary border-dashed text-gray-700">Stock Adjustment</button>
          )}
          <button onClick={handleExport} className="btn-secondary">Export Excel</button>
        </div>
      </div>

      <Table 
        columns={columns} 
        data={filtered} 
        loading={isLoading} 
        empty="No inventory records found." 
      />

      <StockAdjustment isOpen={isAdjOpen} onClose={() => setIsAdjOpen(false)} />
    </div>
  )
}
