import React, { useState, useEffect, useMemo } from 'react'
import {
  useSubCategories,
  useCreateSubCategory,
  useUpdateSubCategory,
  useDeleteSubCategory
} from '../../hooks/useSubCategories'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'

// ─── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  sub_category_name: '',
  discount: '',
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function SubCategoryModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateSubCategory()
  const updateMut = useUpdateSubCategory()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]     = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        sub_category_name: editItem.sub_category_name || '',
        discount:          editItem.discount || '',
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
    if (!form.sub_category_name.trim()) errs.sub_category_name = 'Sub-category name is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      sub_category_name: form.sub_category_name.trim(),
      discount:          form.discount || null,
    }

    if (isEdit) {
      updateMut.mutate(
        { id: editItem.id, data: payload },
        {
          onSuccess: () => { toast.success('Sub-category updated'); onClose() },
          onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Sub-category created'); onClose() },
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
              {isEdit ? 'Edit Sub-Category' : 'Add New Sub-Category'}
            </h3>
            {isEdit && editItem.sub_catg_code && (
              <p className="text-xs text-gray-500 mt-0.5 font-mono font-semibold tracking-wide">
                {editItem.sub_catg_code}
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

          {/* Sub Category Code (auto-generated, read-only) */}
          <div>
            <label className="label">Sub Category Code</label>
            <input
              value={isEdit ? editItem.sub_catg_code : "Auto Generated (SUBCATG-0001)"}
              disabled
              className="input-field bg-gray-50 text-gray-500 font-mono"
            />
          </div>

          {/* Sub Category Description * */}
          <div>
            <label className="label">Sub Category Description *</label>
            <input
              type="text"
              required
              placeholder="Enter sub category description"
              value={form.sub_category_name}
              onChange={set('sub_category_name')}
              className={`input-field ${errors.sub_category_name ? 'border-red-400 focus:ring-red-300' : ''}`}
              autoFocus
            />
            {errors.sub_category_name && <p className="mt-1 text-xs text-red-500">{errors.sub_category_name}</p>}
          </div>

          {/* Discount % */}
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
              {pending ? 'Saving…' : isEdit ? 'Update' : 'Create Sub-Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SubCategoryMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]                 = useState('')
  const [statusFilter, setStatusFilter]     = useState('ALL') // 'ALL', 'ACTIVE', 'INACTIVE'
  const [discountFilter, setDiscountFilter] = useState('ALL') // 'ALL', 'WITH_DISCOUNT', 'NO_DISCOUNT'
  const [page, setPage]                     = useState(1)
  const [pageSize, setPageSize]             = useState(10)

  const [showModal, setShowModal]   = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const templateColumns = [
    {
      key: 'sub_category_name',
      label: 'Sub Category Description',
      required: true,
      example: 'Sandals',
      example2: 'Sports Shoes'
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

  const { data, isLoading, refetch } = useSubCategories({ all: 'true' })
  const updateMut = useUpdateSubCategory()

  const subCategories = Array.isArray(data) ? data : []

  // Multi-Filter logic
  const filteredSubCategories = useMemo(() => {
    return subCategories.filter((sc) => {
      // 1. Search text filter (Code or Description)
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchName = (sc.sub_category_name || '').toLowerCase().includes(q)
        const matchCode = (sc.sub_catg_code || '').toLowerCase().includes(q)
        if (!matchName && !matchCode) return false
      }

      // 2. Status filter
      if (statusFilter === 'ACTIVE' && !sc.is_active) return false
      if (statusFilter === 'INACTIVE' && sc.is_active) return false

      // 3. Discount filter
      const disc = parseFloat(sc.discount) || 0
      if (discountFilter === 'WITH_DISCOUNT' && disc <= 0) return false
      if (discountFilter === 'NO_DISCOUNT' && disc > 0) return false

      return true
    })
  }, [subCategories, search, statusFilter, discountFilter])

  // Pagination calculations
  const totalItems = filteredSubCategories.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const paginatedSubCategories = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredSubCategories.slice(start, start + pageSize)
  }, [filteredSubCategories, safePage, pageSize])

  const isFiltered = search.trim() !== '' || statusFilter !== 'ALL' || discountFilter !== 'ALL'

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setDiscountFilter('ALL')
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
  const openEdit   = (sc) => { setEditItem(sc); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (sc) => {
    updateMut.mutate(
      { id: sc.id, data: { is_active: !sc.is_active } },
      {
        onSuccess: () => toast.success(`Sub-category ${sc.is_active ? 'deactivated' : 'activated'}`),
        onError:   ()  => toast.error('Failed to update status')
      }
    )
  }

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sub-Category Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage product sub-categories — codes auto-generated (SUBCATG-0001…)
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
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
              id="btn-add-subcategory"
              onClick={openCreate}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Sub-Category
            </button>
          </div>
        )}
      </div>

      {/* Multi-Filter Section */}
      <div className="card p-4 space-y-3 bg-white border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {/* 1. Search */}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                id="subcatg-search"
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

            {/* 2. Status Filter */}
            <div>
              <select
                id="subcatg-status-filter"
                className="input-field"
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              >
                <option value="ALL">All Status (Active & Inactive)</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>

            {/* 3. Discount Filter */}
            <div>
              <select
                id="subcatg-discount-filter"
                className="input-field"
                value={discountFilter}
                onChange={e => { setDiscountFilter(e.target.value); setPage(1) }}
              >
                <option value="ALL">All Discounts</option>
                <option value="WITH_DISCOUNT">With Discount Only (&gt; 0%)</option>
                <option value="NO_DISCOUNT">No Discount (0%)</option>
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
            Showing <strong className="text-gray-900 font-semibold">{filteredSubCategories.length}</strong> of{' '}
            <strong className="text-gray-900 font-semibold">{subCategories.length}</strong> total sub-categories
            {isFiltered && <span className="ml-2 text-blue-600 font-medium">(Filtered)</span>}
          </span>
          <div className="flex gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {subCategories.filter(sc => sc.is_active).length} Active
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              {subCategories.filter(sc => !sc.is_active).length} Inactive
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              {subCategories.filter(sc => parseFloat(sc.discount) > 0).length} with Discount
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
                  <th className="px-5 py-3">Discount %</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedSubCategories.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span>
                          {isFiltered ? 'No sub-categories match the selected filters.' : 'No sub-categories found.'}
                          {isFiltered ? (
                            <button
                              onClick={handleResetFilters}
                              className="ml-2 text-blue-600 hover:underline font-semibold"
                            >
                              Clear filters
                            </button>
                          ) : (
                            canEdit && ' Click "Add Sub-Category" to get started.'
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedSubCategories.map(sc => (
                  <tr key={sc.id} className={`hover:bg-gray-50/60 transition-colors ${!sc.is_active ? 'opacity-55' : ''}`}>
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-teal-700">
                      {sc.sub_catg_code || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {sc.sub_category_name}
                    </td>
                    <td className="px-5 py-3">
                      {sc.discount ? `${sc.discount}%` : '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        sc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {sc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button onClick={() => openEdit(sc)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">
                          Edit
                        </button>
                        <button onClick={() => handleToggle(sc)} className={`text-xs font-semibold ${sc.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {sc.is_active ? 'Deactivate' : 'Activate'}
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
                of <strong className="text-gray-900 font-semibold">{totalItems}</strong> sub-categories
              </span>

              <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                <label htmlFor="subcatg-page-size" className="text-gray-500">Rows:</label>
                <select
                  id="subcatg-page-size"
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
        <SubCategoryModal editItem={editItem} onClose={closeModal} />
      )}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="Sub-Category Master"
        templateColumns={templateColumns}
        importUrl="/sub-categories/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
