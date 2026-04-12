import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Table         from '../../components/common/Table.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import ProductForm   from './ProductForm.jsx'
import { fetchProducts, deleteProduct } from '../../api/productApi.js'
import { PRODUCT_TYPE_LABELS } from '../../utils/constants.js'
import { useAuth } from '../../hooks/useAuth.js'

const TYPE_BADGE = {
  RAW_MATERIAL:  'bg-gray-100 text-gray-700',
  SEMI_FINISHED: 'bg-blue-100 text-blue-700',
  FINISHED:      'bg-green-100 text-green-700',
}

const TYPE_FILTERS = ['All', 'RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED']

export default function ProductList() {
  const [search,       setSearch]      = useState('')
  const [typeFilter,   setTypeFilter]  = useState('All')
  const [page,         setPage]        = useState(1)
  const [editTarget,   setEditTarget]  = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const qc = useQueryClient()
  const { role } = useAuth()

  const params = {
    page,
    limit: 20,
    ...(typeFilter !== 'All' ? { product_type: typeFilter } : {}),
  }
  const { data, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn:  () => fetchProducts(params),
  })

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deleted.')
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(err.message || 'Failed to delete product'),
  })

  const records  = data?.data || []
  const meta     = data?.meta || {}

  const filtered = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(
      (r) => r.sku_code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    )
  }, [records, search])

  const columns = [
    { key: 'sku_code',     label: 'SKU Code',   className: 'font-mono text-xs font-semibold text-gray-800' },
    { key: 'description',  label: 'Description' },
    {
      key: 'product_type', label: 'Type',
      render: (r) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[r.product_type]}`}>
          {PRODUCT_TYPE_LABELS[r.product_type] || r.product_type}
        </span>
      ),
    },
    { key: 'uom', label: 'UOM', align: 'center', className: 'font-mono text-xs' },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <button onClick={(e) => { e.stopPropagation(); setEditTarget(r) }} className="px-3 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">Edit</button>
          {role !== 'operator' && (
            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r.sku_code) }} className="px-3 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Delete</button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search SKU or description…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input-field max-w-xs"
          />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            className="input-field w-auto"
          >
            {TYPE_FILTERS.map((t) => (
              <option key={t} value={t}>{t === 'All' ? 'All Types' : PRODUCT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <button onClick={() => setEditTarget({})} className="btn-primary">+ Add Product</button>
      </div>

      <Table
        columns={columns}
        data={filtered}
        loading={isLoading}
        empty="No products found."
        pagination={{ page, pages: meta.pages || 1, total: meta.total || 0, limit: meta.limit || 20, onPageChange: setPage }}
      />

      <ProductForm
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        existing={editTarget && editTarget.sku_code ? editTarget : null}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Product"
        message={`Delete product "${deleteTarget}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate(deleteTarget)}
      />
    </div>
  )
}
