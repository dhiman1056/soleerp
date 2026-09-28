import React, { useState, useEffect, useMemo } from 'react'
import {
  useBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand
} from '../../hooks/useBrands'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'

// ─── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  brand_name: '',
  discount: '',
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function BrandModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateBrand()
  const updateMut = useUpdateBrand()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]     = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        brand_name: editItem.brand_name || '',
        discount:   editItem.discount || '',
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
    if (!form.brand_name.trim()) errs.brand_name = 'Brand name is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      brand_name: form.brand_name.trim(),
      discount:   form.discount !== '' && form.discount !== null ? Number(form.discount) : null,
    }

    if (isEdit) {
      updateMut.mutate(
        { id: editItem.id, data: payload },
        {
          onSuccess: () => { toast.success('Brand updated'); onClose() },
          onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Brand created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Edit Brand' : 'Add New Brand'}
            </h3>
            {isEdit && editItem.brand_code && (
              <p className="text-xs text-gray-500 mt-0.5 font-mono font-semibold tracking-wide">
                {editItem.brand_code}
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

          {/* Brand Code (auto-generated, read-only) */}
          <div>
            <label className="label">Brand Code</label>
            <input
              value={isEdit ? editItem.brand_code : "Auto Generated (BRAND-0001)"}
              disabled
              className="input-field bg-gray-50 text-gray-500 font-mono"
            />
          </div>

          {/* Brand Name * */}
          <div>
            <label className="label">Brand Description *</label>
            <input
              type="text"
              required
              placeholder="Enter brand description"
              value={form.brand_name}
              onChange={set('brand_name')}
              className={`input-field ${errors.brand_name ? 'border-red-400 focus:ring-red-300' : ''}`}
              autoFocus
            />
            {errors.brand_name && <p className="mt-1 text-xs text-red-500">{errors.brand_name}</p>}
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
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Brand' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function BrandMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL', 'ACTIVE', 'INACTIVE'
  const [discountFilter, setDiscountFilter] = useState('ALL') // 'ALL', 'WITH_DISCOUNT', 'NO_DISCOUNT'
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(10)
  const [showModal, setShowModal]       = useState(false)
  const [editItem, setEditItem]         = useState(null)
  const [showImport, setShowImport]     = useState(false)

  const templateColumns = [
    {
      key: 'brand_name',
      label: 'Brand Description',
      required: true,
      example: 'Kazarmax',
      example2: 'Metro Shoes'
    },
    {
      key: 'discount',
      label: 'Discount %',
      required: false,
      example: '5',
      example2: '10',
      note: '0 to 100'
    }
  ]

  const { data, isLoading, refetch } = useBrands({ all: 'true' })
  const updateMut = useUpdateBrand()

  const rawBrands = Array.isArray(data) ? data : []

  // Multi-Filter logic
  const filteredBrands = useMemo(() => {
    return rawBrands.filter((b) => {
      // 1. Search text filter
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchName = (b.brand_name || '').toLowerCase().includes(q)
        const matchCode = (b.brand_code || '').toLowerCase().includes(q)
        if (!matchName && !matchCode) return false
      }

      // 2. Discount filter
      if (discountFilter === 'WITH_DISCOUNT') {
        const d = Number(b.discount || 0)
        if (d <= 0) return false
      } else if (discountFilter === 'NO_DISCOUNT') {
        const d = Number(b.discount || 0)
        if (d > 0) return false
      }

      // 3. Status filter
      if (statusFilter === 'ACTIVE' && !b.is_active) return false
      if (statusFilter === 'INACTIVE' && b.is_active) return false

      return true
    })
  }, [rawBrands, search, discountFilter, statusFilter])

  // Pagination calculation
  const totalItems = filteredBrands.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage   = Math.min(page, totalPages)

  const paginatedBrands = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredBrands.slice(start, start + pageSize)
  }, [filteredBrands, safePage, pageSize])

  const isFiltered = search.trim() !== '' || statusFilter !== 'ALL' || discountFilter !== 'ALL'

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setDiscountFilter('ALL')
    setPage(1)
  }

  // Helper for pagination page numbers (window of up to 5 around current)
  const getPageNumbers = () => {
    const delta = 2
    const range = []
    for (let i = Math.max(1, safePage - delta); i <= Math.min(totalPages, safePage + delta); i++) {
      range.push(i)
    }
    return range
  }

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (b) => { setEditItem(b);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (brand) => {
    updateMut.mutate(
      { id: brand.id, data: { is_active: !brand.is_active } },
      {
        onSuccess: () => toast.success(`Brand ${brand.is_active ? 'deactivated' : 'activated'}`),
        onError:   ()  => toast.error('Failed to update status')
      }
    )
  }

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Brand Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage footwear brands — codes auto-generated (BRAND-0001…)
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
              id="btn-add-brand"
              onClick={openCreate}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Brand
            </button>
          </div>
        )}
      </div>

      {/* Multi-Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* 1. Search */}
          <div className="relative lg:col-span-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              id="brand-search"
              className="input-field pl-9 pr-8"
              placeholder="Search by brand name or code…"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* 2. Discount Filter */}
          <div className="lg:col-span-3">
            <select
              id="brand-discount-filter"
              value={discountFilter}
              onChange={e => {
                setDiscountFilter(e.target.value)
                setPage(1)
              }}
              className="input-field bg-white"
            >
              <option value="ALL">All Discounts</option>
              <option value="WITH_DISCOUNT">With Discount (&gt; 0%)</option>
              <option value="NO_DISCOUNT">No Discount (0%)</option>
            </select>
          </div>

          {/* 3. Status Filter */}
          <div className="lg:col-span-3">
            <select
              id="brand-status-filter"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="input-field bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Quick Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-gray-800">{filteredBrands.length}</strong> of{' '}
              <strong className="text-gray-800">{rawBrands.length}</strong> brands
            </span>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium ml-2 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                ✕ Clear filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {rawBrands.filter(b => b.is_active).length} Active
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              {rawBrands.filter(b => !b.is_active).length} Inactive
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              {rawBrands.filter(b => Number(b.discount || 0) > 0).length} Discounted
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
                  <th className="px-5 py-3">Brand Name</th>
                  <th className="px-5 py-3">Discount %</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedBrands.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span>
                          {isFiltered ? 'No brands match the selected filters.' : 'No brands found.'}
                          {isFiltered ? (
                            <button
                              onClick={handleResetFilters}
                              className="ml-2 text-blue-600 hover:underline font-semibold"
                            >
                              Clear filters
                            </button>
                          ) : (
                            canEdit && ' Click "Add Brand" to get started.'
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedBrands.map(b => (
                  <tr
                    key={b.id}
                    className={`hover:bg-gray-50/60 transition-colors ${!b.is_active ? 'opacity-55' : ''}`}
                  >
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-orange-700">
                      {b.brand_code || <span className="text-gray-300 italic">—</span>}
                    </td>

                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {b.brand_name}
                    </td>

                    <td className="px-5 py-3 font-medium text-gray-700">
                      {b.discount !== null && b.discount !== undefined && b.discount !== '' ? `${Number(b.discount).toFixed(2)}%` : '0.00%'}
                    </td>

                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button
                          onClick={() => openEdit(b)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(b)}
                          className={`text-xs font-semibold ${
                            b.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {b.is_active ? 'Deactivate' : 'Activate'}
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
                of <strong className="text-gray-900 font-semibold">{totalItems}</strong> brands
              </span>

              <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                <label htmlFor="brand-page-size" className="text-gray-500">Rows:</label>
                <select
                  id="brand-page-size"
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

      {showModal && <BrandModal editItem={editItem} onClose={closeModal} />}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="Brand Master"
        templateColumns={templateColumns}
        importUrl="/brands/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
