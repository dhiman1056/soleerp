import React, { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import ProductForm   from './ProductForm.jsx'
import { useProducts, useDeleteProduct } from '../../hooks/useProducts.js'
import { PRODUCT_TYPE_LABELS } from '../../utils/constants.js'
import { formatCurrency }      from '../../utils/formatCurrency.js'
import { useAuth }             from '../../hooks/useAuth.js'

const TYPE_BADGE = {
  RAW_MATERIAL:  'bg-gray-100 text-gray-700',
  SEMI_FINISHED: 'bg-blue-100 text-blue-700',
  FINISHED:      'bg-green-100 text-green-700',
}

const TYPE_FILTERS   = ['All', 'RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED']
const ALL_CATEGORIES = ['All', 'Footwear', 'Accessories', 'Components', 'Packaging', 'Leather', 'Sole', 'Other']

// ── Expandable detail row ──────────────────────────────────────────────────────
function DetailRow({ product, onEdit, onDelete, canDelete }) {
  const [open, setOpen] = useState(false)
  const imgs = Array.isArray(product.images) ? product.images : []

  return (
    <>
      <tr
        className="hover:bg-gray-50/60 cursor-pointer border-b border-gray-100 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {imgs.length > 0 ? (
              <img src={imgs[0]} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-xs">—</div>
            )}
            <span className="font-mono text-xs font-bold text-gray-800">{product.sku_code}</span>
          </div>
        </td>
        <td className="px-4 py-3 max-w-[220px]">
          <p className="font-medium text-gray-800 truncate">{product.description}</p>
          {product.design_no && <p className="text-xs text-gray-400 font-mono">{product.design_no}</p>}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[product.product_type] || 'bg-gray-100 text-gray-600'}`}>
            {PRODUCT_TYPE_LABELS[product.product_type] || product.product_type}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600">{product.category || '—'}</td>
        <td className="px-4 py-3 text-xs text-gray-600">{product.color || '—'}</td>
        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-gray-800">
          {product.cost_price > 0 ? formatCurrency(product.cost_price) : '—'}
        </td>
        <td className="px-4 py-3 text-right font-mono text-sm text-purple-700 font-semibold">
          {product.mrp > 0 ? formatCurrency(product.mrp) : '—'}
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
            product.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {product.is_active !== false ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setOpen((v) => !v)}
              className="px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500"
              title={open ? 'Collapse' : 'Expand'}
            >
              {open ? '▲' : '▼'}
            </button>
            <button
              onClick={() => onEdit(product.sku_code)}
              className="px-2.5 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50 font-medium"
            >
              Edit
            </button>
            {canDelete && (
              <button
                onClick={() => onDelete(product.sku_code)}
                className="px-2.5 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 font-medium"
              >
                Del
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded detail panel */}
      {open && (
        <tr className="bg-blue-50/30">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {/* Left column */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Classification</p>
                <Detail label="Category"     val={product.category}     />
                <Detail label="Sub Category" val={product.sub_category} />
                <Detail label="Design No"    val={product.design_no}    mono />
                <Detail label="Size Chart"   val={product.size_chart}   />
                <Detail label="Color"        val={product.color}        />
                <Detail label="Pack Size"    val={product.pack_size}    />
              </div>
              {/* Middle column */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Pricing</p>
                <Detail label="Basic CP"   val={product.basic_cost_price ? formatCurrency(product.basic_cost_price) : '—'} />
                <Detail label="Cost Price" val={product.cost_price ? formatCurrency(product.cost_price) : '—'}         />
                <Detail label="MRP"        val={product.mrp ? formatCurrency(product.mrp) : '—'}                       />
                <Detail label="SP"         val={product.sp  ? formatCurrency(product.sp)  : '—'}                       />
              </div>
              {/* Right column */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Tax & Supply</p>
                <Detail label="HSN Code"      val={product.hsn_code}           mono />
                <Detail label="GST Rate"      val={product.gst_rate != null ? `${product.gst_rate}%` : '—'} />
                <Detail label="Supplier"      val={product.supplier_name}      />
                <Detail label="Brand"         val={product.brand_name}         />
                <Detail label="UOM"           val={product.uom}                />
              </div>
              {/* Images */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Images ({imgs.length})</p>
                <div className="flex flex-wrap gap-2">
                  {imgs.map((src, i) => (
                    <img key={i} src={src} alt={`img-${i}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm" />
                  ))}
                  {imgs.length === 0 && <p className="text-xs text-gray-400 italic">No images</p>}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

const Detail = ({ label, val, mono = false }) => (
  <div className="flex gap-2 text-xs">
    <span className="text-gray-400 w-24 shrink-0">{label}</span>
    <span className={`font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>{val || '—'}</span>
  </div>
)

// ── CSV Export ─────────────────────────────────────────────────────────────────
const exportCsv = (records) => {
  const HEADERS = ['SKU Code','Description','Type','Category','Sub Category','Design No','Color','UOM','HSN Code','GST%','Basic CP','Cost Price','MRP','SP','Brand','Supplier','Pack Size','Status']
  const rows = records.map((r) => [
    r.sku_code, r.description, r.product_type, r.category || '', r.sub_category || '',
    r.design_no || '', r.color || '', r.uom, r.hsn_code || '',
    r.gst_rate ?? 0, r.basic_cost_price ?? 0, r.cost_price ?? 0,
    r.mrp ?? 0, r.sp ?? 0, r.brand_name || '', r.supplier_name || '',
    r.pack_size || 1, r.is_active !== false ? 'Active' : 'Inactive',
  ])
  const csv = [HEADERS, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a    = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Products.csv'; a.click()
  toast.success('CSV exported!')
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ProductList() {
  const [search,       setSearch]      = useState('')
  const [typeFilter,   setTypeFilter]  = useState('All')
  const [catFilter,    setCatFilter]   = useState('All')
  const [page,         setPage]        = useState(1)
  const [editTarget,   setEditTarget]  = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { role } = useAuth()
  const canEdit   = ['admin', 'manager'].includes(role)
  const canDelete = role === 'admin'

  const apiParams = {
    page,
    limit: 50,
    ...(typeFilter !== 'All' ? { product_type: typeFilter } : {}),
    ...(catFilter  !== 'All' ? { category: catFilter }     : {}),
    ...(search.trim()        ? { search: search.trim() }   : {}),
  }

  const { data: rawData, isLoading } = useProducts(apiParams)
  const deleteMut = useDeleteProduct()

  const records  = rawData?.records ?? []
  const meta     = rawData?.meta    ?? {}

  // Client-side filter by search (supplemental to server search param)
  const filtered = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(
      (r) =>
        (r.sku_code      || '').toLowerCase().includes(q) ||
        (r.description   || '').toLowerCase().includes(q) ||
        (r.design_no     || '').toLowerCase().includes(q) ||
        (r.brand_name    || '').toLowerCase().includes(q)
    )
  }, [records, search])

  // Summary counts
  const rawCount  = records.filter((r) => r.product_type === 'RAW_MATERIAL').length
  const sfCount   = records.filter((r) => r.product_type === 'SEMI_FINISHED').length
  const fgCount   = records.filter((r) => r.product_type === 'FINISHED').length

  const handleDelete = (sku) => {
    deleteMut.mutate(sku, { onSuccess: () => setDeleteTarget(null) })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Master</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="mr-3 text-gray-600">{rawCount} Raw Material</span>
            <span className="mr-3 text-blue-600">{sfCount} Semi-Finished</span>
            <span className="text-green-600">{fgCount} Finished Goods</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => exportCsv(filtered)} className="btn-secondary text-sm px-3">Export CSV</button>
          {canEdit && (
            <button onClick={() => setEditTarget('new')} className="btn-primary">+ Add Product</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search SKU, description, design, brand…"
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
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1) }}
          className="input-field w-auto"
        >
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
        </select>
        {(search || typeFilter !== 'All' || catFilter !== 'All') && (
          <button
            onClick={() => { setSearch(''); setTypeFilter('All'); setCatFilter('All'); setPage(1) }}
            className="text-xs text-red-500 hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 font-medium">No products found.</p>
            {canEdit && (
              <button onClick={() => setEditTarget('new')} className="btn-primary mt-4">Add First Product</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Color</th>
                  <th className="px-4 py-3 text-right">Cost (₹)</th>
                  <th className="px-4 py-3 text-right">MRP (₹)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <DetailRow
                    key={p.sku_code}
                    product={p}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                    canDelete={canDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {(meta.pages > 1) && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Page {meta.page} of {meta.pages} · {meta.total} total products
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <button
                disabled={page >= meta.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {editTarget !== null && (
        <ProductForm
          isOpen={editTarget !== null}
          onClose={() => setEditTarget(null)}
          editSku={editTarget === 'new' ? null : editTarget}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Product"
        message={`Delete product "${deleteTarget}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => handleDelete(deleteTarget)}
      />
    </div>
  )
}
