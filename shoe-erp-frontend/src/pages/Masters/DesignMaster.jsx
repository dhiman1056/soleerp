import React, { useState, useEffect, useMemo } from 'react'
import { useDesigns, useCreateDesign, useUpdateDesign, useDeleteDesign } from '../../hooks/useDesigns'
import { useCategories } from '../../hooks/useCategories'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'
import SearchableSelect from '../../components/common/SearchableSelect'

const EMPTY = { design_no: '', category_id: '' }

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Modal ─────────────────────────────────────────────────────────────────────
function DesignModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateDesign()
  const updateMut = useUpdateDesign()
  const pending   = createMut.isPending || updateMut.isPending

  const { data: categories = [] } = useCategories()

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        design_no:   editItem.design_no   || '',
        category_id: editItem.category_id ? String(editItem.category_id) : '',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [editItem])

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.design_no.trim()) errs.design_no = 'Design No is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      design_no:   form.design_no.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
    }

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('Design updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Design created'); onClose() },
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
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Design' : 'Add New Design'}</h3>
            {isEdit && editItem.design_master_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.design_master_code}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div>
            <label className="label">Design Code</label>
            <input
              value={isEdit ? editItem.design_master_code : "Auto Generated (DESIGN-0001)"}
              disabled
              className="input-field bg-gray-50 text-gray-500 font-mono"
            />
          </div>

          <Field label="Design No" required error={errors.design_no}>
            <input
              type="text"
              required
              placeholder="e.g. D-001, WFL-003"
              value={form.design_no}
              onChange={set('design_no')}
              className="input-field font-mono"
              autoFocus={!isEdit}
            />
          </Field>

          <div>
            <label className="label">Category</label>
            <SearchableSelect
              value={form.category_id}
              onChange={(val) => setForm(f => ({ ...f, category_id: val }))}
              options={categories.map(c => ({
                value: String(c.id),
                label: c.catg_name || c.category_name,
                subLabel: c.dept_name || null,
                searchKey: `${c.catg_name || c.category_name} ${c.dept_name || ''}`
              }))}
              placeholder="— Select Category —"
              searchPlaceholder="Search category..."
            />
          </div>

          {/* Auto-code banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Master code auto-generated on save (DESIGN-0001, DESIGN-0002…)</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Design' : 'Create Design'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DesignMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]                 = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter]     = useState('ALL') // 'ALL', 'ACTIVE', 'INACTIVE'
  const [page, setPage]                     = useState(1)
  const [pageSize, setPageSize]             = useState(10)

  const [showModal, setShowModal]   = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const templateColumns = [
    {
      key: 'design_no',
      label: 'Design No',
      required: true,
      example: 'D-001',
      example2: 'WFL-003'
    },
    {
      key: 'catg_name',
      label: 'Category Name',
      required: false,
      example: 'Ladies Footwear',
      example2: 'Mens Casual',
      note: 'Must match existing Category Name'
    }
  ]

  const { data: categories = [] } = useCategories({ all: 'true' })
  const { data, isLoading, refetch } = useDesigns({ is_active: 'all' })
  const updateMut = useUpdateDesign()

  const designs = Array.isArray(data) ? data : []

  // Multi-Filter logic
  const filteredDesigns = useMemo(() => {
    return designs.filter((d) => {
      // 1. Search text filter (design no, category, or master code)
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchNo = (d.design_no || '').toLowerCase().includes(q)
        const matchCat = (d.catg_name || '').toLowerCase().includes(q)
        const matchMaster = (d.design_master_code || '').toLowerCase().includes(q)
        if (!matchNo && !matchCat && !matchMaster) return false
      }

      // 2. Category filter
      if (categoryFilter) {
        const matchesId = String(d.category_id) === String(categoryFilter)
        const matchesName = (d.catg_name || '').toLowerCase() === categoryFilter.toLowerCase()
        if (!matchesId && !matchesName) return false
      }

      // 3. Status filter
      if (statusFilter === 'ACTIVE' && !d.is_active) return false
      if (statusFilter === 'INACTIVE' && d.is_active) return false

      return true
    })
  }, [designs, search, categoryFilter, statusFilter])

  // Pagination calculations
  const totalItems = filteredDesigns.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const paginatedDesigns = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredDesigns.slice(start, start + pageSize)
  }, [filteredDesigns, safePage, pageSize])

  const isFiltered = search.trim() !== '' || categoryFilter !== '' || statusFilter !== 'ALL'

  const handleResetFilters = () => {
    setSearch('')
    setCategoryFilter('')
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
  const openEdit   = (d) => { setEditItem(d);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (d) => {
    updateMut.mutate({ id: d.id, data: { is_active: !d.is_active } }, {
      onSuccess: () => toast.success(`Design ${d.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Design Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage shoe designs — codes auto-generated (DESIGN-0001…)</p>
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
            <button id="btn-add-design" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Design
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
                id="design-search"
                className="input-field pl-9 pr-8"
                placeholder="Search by design no or category…"
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

            {/* 2. Category Filter */}
            <div>
              <select
                id="design-category-filter"
                className="input-field"
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.catg_name || c.category_name} {c.catg_code ? `(${c.catg_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Status Filter */}
            <div>
              <select
                id="design-status-filter"
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
            Showing <strong className="text-gray-900 font-semibold">{filteredDesigns.length}</strong> of{' '}
            <strong className="text-gray-900 font-semibold">{designs.length}</strong> total designs
            {isFiltered && <span className="ml-2 text-blue-600 font-medium">(Filtered)</span>}
          </span>
          <div className="flex gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {designs.filter(d => d.is_active).length} Active
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              {designs.filter(d => !d.is_active).length} Inactive
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
              {new Set(designs.map(d => d.category_id).filter(Boolean)).size} Categories
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
                  <th className="px-5 py-3">Design No</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedDesigns.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {isFiltered ? 'No designs match the selected filters.' : 'No designs found.'}
                          {isFiltered ? (
                            <button
                              onClick={handleResetFilters}
                              className="ml-2 text-blue-600 hover:underline font-semibold"
                            >
                              Clear filters
                            </button>
                          ) : (
                            canEdit && ' Click "Add Design" to get started.'
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedDesigns.map(d => (
                  <tr key={d.id} className={`hover:bg-gray-50/60 transition-colors ${!d.is_active ? 'opacity-55' : ''}`}>
                    {/* Master Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-fuchsia-700">
                      {d.design_master_code || <span className="text-gray-300 italic">—</span>}
                    </td>

                    {/* Design No */}
                    <td className="px-5 py-3 font-mono font-bold text-sm text-gray-900">
                      {d.design_no}
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3 font-semibold text-gray-700">
                      {d.catg_name || '—'}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button onClick={() => openEdit(d)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
                        <button onClick={() => handleToggle(d)} className={`text-xs font-semibold ${d.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {d.is_active ? 'Deactivate' : 'Activate'}
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
                of <strong className="text-gray-900 font-semibold">{totalItems}</strong> designs
              </span>

              <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                <label htmlFor="design-page-size" className="text-gray-500">Rows:</label>
                <select
                  id="design-page-size"
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

      {showModal && <DesignModal editItem={editItem} onClose={closeModal} />}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="Design Master"
        templateColumns={templateColumns}
        importUrl="/designs/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
