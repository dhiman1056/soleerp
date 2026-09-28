import React, { useState, useEffect, useMemo } from 'react'
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment
} from '../../hooks/useDepartments'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'

// ─── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  sg_code:        '',
  dept_name:      '',
  stock_type:     'INVENTORY',
  bom_applicable: false,
  discount:       '',
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function StockGroupModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateDepartment()
  const updateMut = useUpdateDepartment()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]     = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        sg_code:        editItem.sg_code || '',
        dept_name:      editItem.stock_group || editItem.dept_name || '',
        stock_type:     editItem.stock_type || 'INVENTORY',
        bom_applicable: Boolean(editItem.bom_applicable),
        discount:       editItem.discount || '',
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
    if (!form.dept_name.trim()) errs.dept_name = 'Stock Group name is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      sg_code:        form.sg_code.trim() || undefined,
      dept_name:      form.dept_name.trim(),
      stock_group:    form.dept_name.trim(),
      stock_type:     form.stock_type,
      bom_applicable: Boolean(form.bom_applicable),
      discount:       form.discount || null,
    }

    if (isEdit) {
      updateMut.mutate(
        { id: editItem.id, data: payload },
        {
          onSuccess: () => { toast.success('Stock Group updated'); onClose() },
          onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Stock Group created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Edit Stock Group' : 'Add New Stock Group'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEdit ? `Editing SG Code: ${editItem.sg_code || editItem.dept_code || editItem.id}` : 'Define stock categorization and BOM applicability'}
            </p>
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
          <div className="grid grid-cols-2 gap-4">
            {/* SG Code */}
            <div>
              <label className="label">SG Code</label>
              <input
                type="text"
                className="input-field font-mono font-semibold"
                placeholder={isEdit ? (editItem.sg_code || 'e.g. 1') : 'Auto (e.g. 1, 2…)'}
                value={form.sg_code}
                onChange={set('sg_code')}
              />
            </div>

            {/* Stock Types */}
            <div>
              <label className="label">Stock Types *</label>
              <select
                value={form.stock_type}
                onChange={set('stock_type')}
                className="input-field font-medium"
              >
                <option value="INVENTORY">INVENTORY</option>
                <option value="NON-INVENTORY">NON-INVENTORY</option>
              </select>
            </div>
          </div>

          {/* Stock Group Name */}
          <div>
            <label className="label">Stock Group Name *</label>
            <input
              type="text"
              required
              className={`input-field font-semibold ${errors.dept_name ? 'border-red-400 focus:ring-red-300' : ''}`}
              placeholder="e.g. RAW MATERIAL, FINISHED GOODS, SOLE"
              value={form.dept_name}
              onChange={set('dept_name')}
              autoFocus
            />
            {errors.dept_name && <p className="mt-1 text-xs text-red-500">{errors.dept_name}</p>}
          </div>

          {/* Types or BOM Applicable Checkbox */}
          <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.bom_applicable}
                onChange={e => setForm(f => ({ ...f, bom_applicable: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
              />
              <div>
                <span className="text-sm font-semibold text-gray-800">Types or BOM Applicable</span>
                <p className="text-xs text-gray-500">Check if this group requires Bill of Materials (e.g., Finished Goods, Semi Finished)</p>
              </div>
            </label>
          </div>

          {/* Discount */}
          <div>
            <label className="label">Discount % (Optional)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="input-field"
              placeholder="0.00"
              value={form.discount}
              onChange={set('discount')}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Stock Group' : 'Create Stock Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DepartmentMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [showModal, setShowModal]   = useState(false)
  const [editItem, setEditItem]     = useState(null)
  const [showImport, setShowImport] = useState(false)

  const templateColumns = [
    {
      key: 'sg_code',
      label: 'SG CODE',
      required: false,
      example: '1',
      example2: '4',
      note: 'Code/Number (e.g. 1, 2, 3)'
    },
    {
      key: 'stock_group',
      label: 'STOCK GROUP',
      required: true,
      example: 'RAW MATERIAL',
      example2: 'FINISHED GOODS',
      note: 'Stock Group description'
    },
    {
      key: 'stock_type',
      label: 'STOCK TYPES',
      required: true,
      example: 'INVENTORY',
      example2: 'NON-INVENTORY',
      note: 'INVENTORY or NON-INVENTORY'
    },
    {
      key: 'bom_applicable',
      label: 'TYPES OR BOM APLICABLE',
      required: false,
      example: '',
      example2: 'BOM (CHECK BOX)',
      note: 'BOM (CHECK BOX) or leave empty'
    },
    {
      key: 'discount',
      label: 'Discount %',
      required: false,
      example: '0',
      example2: '0',
      note: '0 to 100'
    }
  ]

  const [search, setSearch]                 = useState('')
  const [filterStockType, setFilterStockType] = useState('ALL')
  const [filterBOM, setFilterBOM]             = useState('ALL') // 'ALL', 'BOM_ONLY', 'NON_BOM'
  const [statusFilter, setStatusFilter]       = useState('ALL') // 'ALL', 'ACTIVE', 'INACTIVE'
  const [page, setPage]                       = useState(1)
  const [pageSize, setPageSize]               = useState(10)

  const { data, isLoading, refetch } = useDepartments({ all: 'true' })
  const updateMut = useUpdateDepartment()

  const rawGroups = Array.isArray(data) ? data : []

  // Multi-Filter logic
  const filteredStockGroups = useMemo(() => {
    return rawGroups.filter((g) => {
      // 1. Search text filter
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchName = (g.stock_group || g.dept_name || '').toLowerCase().includes(q)
        const matchCode = (g.sg_code || g.dept_code || '').toLowerCase().includes(q)
        if (!matchName && !matchCode) return false
      }

      // 2. Stock Type filter
      if (filterStockType !== 'ALL' && g.stock_type !== filterStockType) return false

      // 3. BOM Applicable filter
      if (filterBOM === 'BOM_ONLY' && !g.bom_applicable) return false
      if (filterBOM === 'NON_BOM' && g.bom_applicable) return false

      // 4. Status filter
      if (statusFilter === 'ACTIVE' && !g.is_active) return false
      if (statusFilter === 'INACTIVE' && g.is_active) return false

      return true
    })
  }, [rawGroups, search, filterStockType, filterBOM, statusFilter])

  // Pagination calculations
  const totalItems = filteredStockGroups.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const paginatedStockGroups = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredStockGroups.slice(start, start + pageSize)
  }, [filteredStockGroups, safePage, pageSize])

  const isFiltered = search.trim() !== '' || filterStockType !== 'ALL' || filterBOM !== 'ALL' || statusFilter !== 'ALL'

  const handleResetFilters = () => {
    setSearch('')
    setFilterStockType('ALL')
    setFilterBOM('ALL')
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

  const handleToggle = (dept) => {
    updateMut.mutate(
      { id: dept.id, data: { is_active: !dept.is_active } },
      {
        onSuccess: () => toast.success(`Stock Group ${dept.is_active ? 'deactivated' : 'activated'}`),
        onError:   ()  => toast.error('Failed to update status')
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Stock Group Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage stock groups, inventory categorization (Inventory / Non-Inventory), and BOM applicability.
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
              id="btn-add-department"
              onClick={openCreate}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Stock Group
            </button>
          </div>
        )}
      </div>

      {/* Multi-Filter Section */}
      <div className="card p-4 space-y-3 bg-white border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
            {/* 1. Search */}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                id="dept-search"
                className="input-field pl-9 pr-8"
                placeholder="Search by stock group or SG code…"
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

            {/* 2. Stock Type Filter */}
            <div>
              <select
                id="dept-stock-type-filter"
                className="input-field"
                value={filterStockType}
                onChange={e => { setFilterStockType(e.target.value); setPage(1) }}
              >
                <option value="ALL">All Stock Types</option>
                <option value="INVENTORY">Inventory</option>
                <option value="NON-INVENTORY">Non-Inventory</option>
              </select>
            </div>

            {/* 3. BOM Applicable Filter */}
            <div>
              <select
                id="dept-bom-filter"
                className="input-field"
                value={filterBOM}
                onChange={e => { setFilterBOM(e.target.value); setPage(1) }}
              >
                <option value="ALL">All BOM Status</option>
                <option value="BOM_ONLY">BOM Applicable Only</option>
                <option value="NON_BOM">Non-BOM Only</option>
              </select>
            </div>

            {/* 4. Status Filter */}
            <div>
              <select
                id="dept-status-filter"
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
            Showing <strong className="text-gray-900 font-semibold">{filteredStockGroups.length}</strong> of{' '}
            <strong className="text-gray-900 font-semibold">{rawGroups.length}</strong> total stock groups
            {isFiltered && <span className="ml-2 text-blue-600 font-medium">(Filtered)</span>}
          </span>
          <div className="flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {rawGroups.filter(d => d.is_active).length} Active
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              {rawGroups.filter(d => !d.is_active).length} Inactive
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {rawGroups.filter(d => d.stock_type !== 'NON-INVENTORY').length} Inventory
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              {rawGroups.filter(d => d.bom_applicable).length} BOM Applicable
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
                  <th className="px-5 py-3 whitespace-nowrap">SG Code</th>
                  <th className="px-5 py-3">Stock Group</th>
                  <th className="px-5 py-3">Stock Types</th>
                  <th className="px-5 py-3 text-center">Types or BOM Applicable</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedStockGroups.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>
                          {isFiltered ? 'No stock groups match the selected filters.' : 'No stock groups found.'}
                          {isFiltered ? (
                            <button
                              onClick={handleResetFilters}
                              className="ml-2 text-blue-600 hover:underline font-semibold"
                            >
                              Clear filters
                            </button>
                          ) : (
                            canEdit && ' Click "Add Stock Group" to get started.'
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedStockGroups.map(d => (
                  <tr
                    key={d.id}
                    className={`hover:bg-gray-50/60 transition-colors ${!d.is_active ? 'opacity-55' : ''}`}
                  >
                    {/* SG Code */}
                    <td className="px-5 py-3 font-mono font-bold text-indigo-700 text-sm whitespace-nowrap">
                      {d.sg_code || d.dept_code}
                    </td>

                    {/* Stock Group */}
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {d.stock_group || d.dept_name}
                    </td>

                    {/* Stock Types */}
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        d.stock_type === 'NON-INVENTORY'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {d.stock_type === 'NON-INVENTORY' ? 'NON-INVENTORY' : 'INVENTORY'}
                      </span>
                    </td>

                    {/* Types or BOM Applicable */}
                    <td className="px-5 py-3 text-center whitespace-nowrap">
                      {d.bom_applicable ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          BOM Applicable
                        </span>
                      ) : (
                        <span className="text-gray-300 font-medium">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        d.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button
                          onClick={() => openEdit(d)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(d)}
                          className={`text-xs font-semibold ${
                            d.is_active
                              ? 'text-red-500 hover:text-red-700'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
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
                of <strong className="text-gray-900 font-semibold">{totalItems}</strong> stock groups
              </span>

              <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                <label htmlFor="dept-page-size" className="text-gray-500">Rows:</label>
                <select
                  id="dept-page-size"
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

      {/* Modal */}
      {showModal && (
        <StockGroupModal editItem={editItem} onClose={closeModal} />
      )}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="Stock Group Master"
        templateColumns={templateColumns}
        importUrl="/departments/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
