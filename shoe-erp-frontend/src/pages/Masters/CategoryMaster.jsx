import React, { useState, useEffect, useMemo } from 'react'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory
} from '../../hooks/useCategories'
import { useDepartments } from '../../hooks/useDepartments'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'
import SearchableSelect from '../../components/common/SearchableSelect'

// ─── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  catg_name: '',
  dept_id: '',
  discount: '',
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function CategoryModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateCategory()
  const updateMut = useUpdateCategory()
  const pending   = createMut.isPending || updateMut.isPending

  const { data: departments = [] } = useDepartments()

  const [form, setForm]     = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        catg_name: editItem.catg_name || '',
        dept_id:   editItem.dept_id ? String(editItem.dept_id) : '',
        discount:  editItem.discount || '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
  }, [editItem])

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.catg_name.trim()) errs.catg_name = 'Category description is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      catg_name: form.catg_name.trim(),
      dept_id:   form.dept_id ? Number(form.dept_id) : null,
      discount:  form.discount || null,
    }

    if (isEdit) {
      updateMut.mutate(
        { id: editItem.id, data: payload },
        {
          onSuccess: () => { toast.success('Category updated'); onClose() },
          onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Category created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Edit Category' : 'Add New Category'}
            </h3>
            {isEdit && editItem.catg_code && (
              <p className="text-xs text-gray-500 mt-0.5 font-mono font-semibold tracking-wide">
                {editItem.catg_code}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Category Code - Read Only */}
          <div>
            <label className="label">Category Code</label>
            <input
              value={isEdit ? editItem.catg_code : "Auto Generated (CATG-0001)"}
              disabled
              className="input-field bg-gray-50 text-gray-500 font-mono"
            />
          </div>

          {/* Category Description */}
          <div>
            <label className="label">Category Description *</label>
            <input
              type="text"
              required
              placeholder="Enter category description"
              value={form.catg_name}
              onChange={set('catg_name')}
              className={`input-field ${errors.catg_name ? 'border-red-400 focus:ring-red-300' : ''}`}
              autoFocus
            />
            {errors.catg_name && <p className="mt-1 text-xs text-red-500">{errors.catg_name}</p>}
          </div>

          {/* Stock Group */}
          <div>
            <label className="label">Stock Group</label>
            <SearchableSelect
              value={form.dept_id}
              onChange={(val) => setForm(f => ({ ...f, dept_id: val }))}
              options={departments.map(d => ({
                value: String(d.id),
                label: d.stock_group || d.dept_name,
                badge: d.sg_code ? `#${d.sg_code}` : null,
                searchKey: `${d.stock_group || d.dept_name} ${d.sg_code || ''}`
              }))}
              placeholder="— Select Stock Group —"
              searchPlaceholder="Search stock group..."
            />
          </div>

          {/* Discount */}
          <div>
            <label className="label">Discount %</label>
            <input
              type="number"
              min="0" max="100" step="0.01"
              placeholder="0.00"
              value={form.discount}
              onChange={set('discount')}
              className="input-field"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CategoryMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]                     = useState('')
  const [stockGroupFilter, setStockGroupFilter] = useState('')
  const [statusFilter, setStatusFilter]         = useState('ALL') // 'ALL', 'ACTIVE', 'INACTIVE'
  const [page, setPage]                         = useState(1)
  const [pageSize, setPageSize]                 = useState(10)

  const [showModal, setShowModal]   = useState(false)
  const [editItem, setEditItem]     = useState(null)
  const [showImport, setShowImport] = useState(false)

  const templateColumns = [
    {
      key: 'catg_name',
      label: 'Category Description',
      required: true,
      example: 'Ladies Footwear',
      example2: 'Mens Casual'
    },
    {
      key: 'dept_name',
      label: 'Stock Group Name',
      required: false,
      example: 'RAW MATERIAL',
      example2: 'FINISHED GOODS',
      note: 'Must match an existing Stock Group Name'
    },
    {
      key: 'discount',
      label: 'Discount %',
      required: false,
      example: '5',
      example2: '0',
      note: '0 to 100'
    }
  ]

  const { data: departments = [] } = useDepartments()
  const { data, isLoading, refetch } = useCategories({ all: 'true' })
  const updateMut = useUpdateCategory()

  const categories = Array.isArray(data) ? data : []

  // Multi-Filter logic
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      // 1. Search text filter (Code or Description)
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchName = (c.catg_name || '').toLowerCase().includes(q)
        const matchCode = (c.catg_code || '').toLowerCase().includes(q)
        if (!matchName && !matchCode) return false
      }

      // 2. Stock Group filter
      if (stockGroupFilter) {
        const matchesId = String(c.dept_id) === String(stockGroupFilter)
        const groupName = (c.stock_group || c.dept_name || '').toLowerCase()
        const matchesName = groupName === stockGroupFilter.toLowerCase()
        if (!matchesId && !matchesName) return false
      }

      // 3. Status filter
      if (statusFilter === 'ACTIVE' && !c.is_active) return false
      if (statusFilter === 'INACTIVE' && c.is_active) return false

      return true
    })
  }, [categories, search, stockGroupFilter, statusFilter])

  // Pagination calculations
  const totalItems = filteredCategories.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const paginatedCategories = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredCategories.slice(start, start + pageSize)
  }, [filteredCategories, safePage, pageSize])

  const isFiltered = search.trim() !== '' || stockGroupFilter !== '' || statusFilter !== 'ALL'

  const handleResetFilters = () => {
    setSearch('')
    setStockGroupFilter('')
    setStatusFilter('ALL')
    setPage(1)
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (c) => { setEditItem(c);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (cat) => {
    updateMut.mutate(
      { id: cat.id, data: { is_active: !cat.is_active } },
      {
        onSuccess: () => toast.success(`Category ${cat.is_active ? 'deactivated' : 'activated'}`),
        onError:   ()  => toast.error('Failed to update status')
      }
    )
  }

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Category Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage product categories — codes auto-generated (CATG-0001…)
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowImport(true)}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 14px',
                border:'0.5px solid #d1d5db',
                borderRadius:8, background:'white',
                fontSize:13, cursor:'pointer', color:'#374151'
              }}
            >
              ↑ Import CSV
            </button>
            <button
              id="btn-add-category"
              onClick={openCreate}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Category
            </button>
          </div>
        )}
      </div>

      {/* Multi-Filter Section */}
      <div className="card p-4 space-y-3 bg-white border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {/* 1. Search by name or code */}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                id="catg-search"
                className="input-field pl-9 pr-8"
                placeholder="Search by name or code…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setPage(1) }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                  title="Clear search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* 2. Stock Group Filter */}
            <div>
              <select
                id="catg-stock-group-filter"
                className="input-field"
                value={stockGroupFilter}
                onChange={e => { setStockGroupFilter(e.target.value); setPage(1) }}
              >
                <option value="">All Stock Groups</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.dept_name} {d.dept_code ? `(${d.dept_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Status Filter */}
            <div>
              <select
                id="catg-status-filter"
                className="input-field"
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              >
                <option value="ALL">All Status (Active & Inactive)</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors whitespace-nowrap self-start md:self-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          )}
        </div>

        {/* Filter Summary Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 gap-2">
          <span>
            Showing <strong className="text-gray-900 font-semibold">{filteredCategories.length}</strong> of{' '}
            <strong className="text-gray-900 font-semibold">{categories.length}</strong> total categories
            {isFiltered && <span className="ml-2 text-blue-600 font-medium">(Filtered)</span>}
          </span>
          <div className="flex gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {categories.filter(c => c.is_active).length} Active
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              {categories.filter(c => !c.is_active).length} Inactive
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-12 flex justify-center"><Loader /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Code</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Stock Group</th>
                  <th className="px-5 py-3">Discount %</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>
                          {isFiltered ? 'No categories match the selected filters.' : 'No categories found.'}
                          {isFiltered ? (
                            <button
                              onClick={handleResetFilters}
                              className="ml-2 text-blue-600 hover:underline font-semibold"
                            >
                              Clear filters
                            </button>
                          ) : (
                            canEdit && ' Click "Add Category" to get started.'
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedCategories.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50/60 transition-colors ${!c.is_active ? 'opacity-55' : ''}`}>
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-violet-700">
                      {c.catg_code || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {c.catg_name}
                    </td>
                    <td className="px-5 py-3">
                      {c.stock_group || c.dept_name || '—'}
                    </td>
                    <td className="px-5 py-3">
                      {c.discount ? `${c.discount}%` : '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">
                          Edit
                        </button>
                        <button onClick={() => handleToggle(c)} className={`text-xs font-semibold ${c.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {c.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 border-t border-gray-100 bg-gray-50/70">
            {/* Left: Summary & Page Size selector */}
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>
                Showing{' '}
                <strong className="text-gray-900 font-semibold">
                  {totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-gray-900 font-semibold">
                  {Math.min(safePage * pageSize, totalItems)}
                </strong>{' '}
                of <strong className="text-gray-900 font-semibold">{totalItems}</strong> categories
              </span>

              <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                <label htmlFor="catg-page-size" className="text-gray-500">Rows:</label>
                <select
                  id="catg-page-size"
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="bg-white border border-gray-200 text-gray-700 text-xs rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right: Page Navigation */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage <= 1}
                  className="px-2 py-1 text-xs border border-gray-200 bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  title="First Page"
                >
                  «
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-2.5 py-1 text-xs border border-gray-200 bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  title="Previous Page"
                >
                  ‹ Prev
                </button>

                <div className="flex items-center gap-1 mx-1">
                  {getPageNumbers().map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-md transition-colors ${
                        pageNum === safePage
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-2.5 py-1 text-xs border border-gray-200 bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  title="Next Page"
                >
                  Next ›
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="px-2 py-1 text-xs border border-gray-200 bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  title="Last Page"
                >
                  »
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <CategoryModal editItem={editItem} onClose={closeModal} />
      )}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="Category Master"
        templateColumns={templateColumns}
        importUrl="/categories/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
