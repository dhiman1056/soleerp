import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import Table         from '../../components/common/Table.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import RawMaterialForm from './RawMaterialForm.jsx'
import { useRawMaterialsQuery, useDeleteRawMaterial } from '../../hooks/useRawMaterials.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { useAuth } from '../../hooks/useAuth.js'

export default function RawMaterialList() {
  const [search,      setSearch]      = useState('')
  const [page,        setPage]        = useState(1)
  const [editTarget,  setEditTarget]  = useState(null)   // null = closed, {} = new, row = edit
  const [deleteTarget, setDeleteTarget] = useState(null) // sku string

  const { data, isLoading } = useRawMaterialsQuery({ page, limit: 20, is_active: 'true' })
  const deleteMut           = useDeleteRawMaterial()
  const { role }            = useAuth()

  const records = data?.data || []
  const meta    = data?.meta || {}

  // Client-side filter on what we already loaded (server also supports search param)
  const filtered = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(
      (r) => r.sku_code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    )
  }, [records, search])

  const columns = [
    { key: 'sku_code',     label: 'SKU Code',    className: 'font-mono text-xs font-semibold text-gray-800' },
    { key: 'description',  label: 'Description' },
    { key: 'uom',          label: 'UOM',          align: 'center', className: 'font-mono text-xs' },
    {
      key: 'rate', label: 'Rate (₹)', align: 'right',
      render: (r) => <span className="font-semibold tabular-nums">{formatCurrency(r.rate)}</span>,
    },
    {
      key: 'is_active', label: 'Status', align: 'center',
      render: (r) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
          {r.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setEditTarget(r) }}
            className="px-3 py-1 text-xs font-medium rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
          {role !== 'operator' && (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(r.sku_code) }}
              className="px-3 py-1 text-xs font-medium rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search SKU or description…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="input-field max-w-xs"
        />
        <button onClick={() => setEditTarget({})} className="btn-primary">
          + Add Raw Material
        </button>
      </div>

      <Table
        columns={columns}
        data={filtered}
        loading={isLoading}
        empty="No raw materials found."
        pagination={{
          page,
          pages: meta.pages || 1,
          total: meta.total || 0,
          limit: meta.limit || 20,
          onPageChange: setPage,
        }}
      />

      {/* Add / Edit Modal */}
      <RawMaterialForm
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        existing={editTarget && editTarget.sku_code ? editTarget : null}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Deactivate Raw Material"
        message={`Are you sure you want to deactivate SKU "${deleteTarget}"? It will no longer appear in forms.`}
        confirmLabel="Deactivate"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })}
      />
    </div>
  )
}
