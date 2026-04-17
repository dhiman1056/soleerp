import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Table         from '../../components/common/Table.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import { useBOMsQuery, useDeleteBOM, useBOMQuery } from '../../hooks/useBOM.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { useAuth } from '../../hooks/useAuth.js'
import { downloadFile } from '../../utils/downloadFile.js'
import { printBOMSheet } from '../../print/PrintBOMSheet.jsx'

// Inline expandable component detail sub-table
function BOMLines({ bomId }) {
  const { data: bom, isLoading } = useBOMQuery(bomId)
  // useBOMQuery now returns the BOM object directly (res.data.data)
  const lines = Array.isArray(bom?.components) ? bom.components : []

  // Compute total from lines directly — getBom endpoint doesn't include total_cost
  const totalCost = lines.reduce(
    (sum, l) => sum + (Number(l.value) || Number(l.consume_qty) * Number(l.rate_at_bom) || 0),
    0
  )

  if (isLoading) return <div className="py-4 text-center text-xs text-gray-400">Loading components…</div>
  if (!lines.length) return <div className="py-4 text-center text-xs text-gray-400">No lines found.</div>

  return (
    <div className="px-4 pb-4">
      <table className="w-full text-xs bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
        <thead>
          <tr className="bg-gray-100 text-gray-500">
            <th className="px-3 py-2 text-left font-semibold">Input SKU</th>
            <th className="px-3 py-2 text-left font-semibold">Description</th>
            <th className="px-3 py-2 text-right font-semibold">Consume Qty</th>
            <th className="px-3 py-2 text-center font-semibold">UOM</th>
            <th className="px-3 py-2 text-right font-semibold">Rate (₹)</th>
            <th className="px-3 py-2 text-right font-semibold">Line Cost</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="px-3 py-2 font-mono font-semibold text-gray-800">{l.input_sku}</td>
              <td className="px-3 py-2 text-gray-600">{l.description}</td>
              <td className="px-3 py-2 text-right tabular-nums">{l.consume_qty}</td>
              <td className="px-3 py-2 text-center font-mono">{l.uom}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(l.rate_at_bom)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatCurrency(l.value)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-200 bg-gray-100 font-bold">
            <td colSpan={5} className="px-3 py-2 text-right text-gray-700">Total Material Cost</td>
            <td className="px-3 py-2 text-right text-gray-900 tabular-nums">{formatCurrency(totalCost)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function BOMList() {
  const navigate = useNavigate()
  const [page,         setPage]        = useState(1)
  const [search,       setSearch]      = useState('')
  const [typeFilter,   setTypeFilter]  = useState('')
  const [expandedId,   setExpandedId]  = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useBOMsQuery({ search: search || undefined, bom_type: typeFilter || undefined })
  const deleteMut            = useDeleteBOM()
  const { role }             = useAuth()

  // useBOMsQuery returns array directly
  const records = Array.isArray(data) ? data : []

  const handleExport = () => {
    downloadFile('/api/export/bom/excel', `BOM_Master.xlsx`)
      .catch((err) => console.error('Export failed:', err))
  }

  const columns = [
    { key: 'bom_code',           label: 'BOM Code',    className: 'font-mono text-xs font-semibold text-gray-800' },
    { key: 'output_sku',         label: 'Output SKU',  className: 'font-mono text-xs' },
    { key: 'product_name',       label: 'Product' },
    {
      key: 'bom_type', label: 'Type',
      render: (r) => <span className="text-xs font-semibold text-blue-700">{r.bom_type}</span>,
    },
    { key: 'output_qty', label: 'Output Qty', align: 'right', className: 'tabular-nums' },
    { key: 'output_uom', label: 'UOM',        align: 'center', className: 'font-mono text-xs' },
    {
      key: 'total_material_cost', label: 'Material Cost', align: 'right',
      render: (r) => <span className="font-semibold tabular-nums">{formatCurrency(r.total_cost)}</span>,
    },
    {
      key: 'is_active', label: 'Status', align: 'center',
      render: (r) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {r.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <button onClick={(e) => { e.stopPropagation(); printBOMSheet(r) }} className="px-3 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">Print</button>
          <button onClick={(e) => { e.stopPropagation(); navigate(`/bom/${r.id}/edit`) }} className="px-3 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">Edit</button>
          {role !== 'operator' && (
            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }} className="px-3 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Delete</button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Click a row to expand component breakdown.</p>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary">Export BOM Master (Excel)</button>
          <button onClick={() => navigate('/bom/new')} className="btn-primary">+ New BOM</button>
        </div>
      </div>

      {/* Search + Type filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search BOM code or product..."
          className="input-field w-64"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input-field w-auto"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="SF">Semi-Finished (SF)</option>
          <option value="FG">Finished Goods (FG)</option>
          <option value="FG_DIRECT">Direct FG (FG_DIRECT)</option>
        </select>
        {(search || typeFilter) && (
          <button
            onClick={() => { setSearch(''); setTypeFilter('') }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 w-8" />
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap text-${col.align || 'left'} ${col.className || ''}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={columns.length + 1} className="py-12 text-center text-gray-400 text-sm">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="py-12 text-center text-gray-400 text-sm">No BOMs found. Create your first BOM.</td></tr>
              ) : (
                records.map((row, i) => (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/40`}
                    >
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {expandedId === row.id ? '▼' : '▶'}
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3 text-gray-700 text-${col.align || 'left'} ${col.className || ''}`}>
                          {col.render ? col.render(row, i) : row[col.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                    {expandedId === row.id && (
                      <tr key={`${row.id}-expand`} className="bg-gray-50">
                        <td colSpan={columns.length + 1}>
                          <BOMLines bomId={row.id} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Deactivate BOM"
        message={`Deactivate BOM "${deleteTarget?.bom_code}"? It will be hidden from Work Order creation.`}
        confirmLabel="Deactivate"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate(deleteTarget?.id, { onSuccess: () => setDeleteTarget(null) })}
      />
    </div>
  )
}
