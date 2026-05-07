import React, { useState, useEffect } from 'react'
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

// ─── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  category_name: '',
  description:   '',
  dept_id:       '',
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────
const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Modal ─────────────────────────────────────────────────────────────────────
function CategoryModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateCategory()
  const updateMut = useUpdateCategory()
  const pending   = createMut.isPending || updateMut.isPending

  const { data: deptData, isLoading: deptLoading } = useDepartments({ is_active: 'true' })
  const departments = Array.isArray(deptData) ? deptData : []

  const [form, setForm]     = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        category_name: editItem.category_name || '',
        description:   editItem.description   || '',
        dept_id:       editItem.dept_id ? String(editItem.dept_id) : '',
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
    if (!form.category_name.trim()) errs.category_name = 'Category name is required'
    if (!form.dept_id)              errs.dept_id        = 'Department is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      category_name: form.category_name.trim(),
      description:   form.description || null,
      dept_id:       Number(form.dept_id),
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

          {/* Category Name */}
          <Field label="Category Name" required error={errors.category_name}>
            <input
              id="category_name"
              className={`input-field uppercase ${errors.category_name ? 'border-red-400 focus:ring-red-300' : ''}`}
              value={form.category_name}
              onChange={e => {
                setForm(f => ({ ...f, category_name: e.target.value.toUpperCase() }))
                if (errors.category_name) setErrors(er => ({ ...er, category_name: '' }))
              }}
              placeholder="e.g. GENTS, LADIES, KIDS"
              autoFocus
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              id="catg_description"
              className="input-field resize-none"
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Optional description for this category…"
            />
          </Field>

          {/* Department dropdown */}
          <Field label="Department" required error={errors.dept_id}>
            <select
              id="catg_dept"
              className={`input-field ${errors.dept_id ? 'border-red-400 focus:ring-red-300' : ''}`}
              value={form.dept_id}
              onChange={set('dept_id')}
              disabled={deptLoading}
            >
              <option value="">
                {deptLoading ? 'Loading departments…' : '— Select Department —'}
              </option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.dept_name}
                  {d.dept_code ? ` (${d.dept_code})` : ''}
                </option>
              ))}
            </select>
            {departments.length === 0 && !deptLoading && (
              <p className="mt-1 text-xs text-amber-600">
                No active departments found. Please create a department first.
              </p>
            )}
          </Field>

          {/* Auto-code info banner for new records */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                Category code will be auto-generated (CATG-0001, CATG-0002…)
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
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

  const [search, setSearch]         = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterDept)          params.dept_id   = filterDept
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading } = useCategories(params)
  const { data: deptData }  = useDepartments({ is_active: 'true' })
  const updateMut = useUpdateCategory()

  const categories  = Array.isArray(data)     ? data     : []
  const departments = Array.isArray(deptData) ? deptData : []

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
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            id="catg-search"
            className="input-field pl-9"
            placeholder="Search by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Department filter */}
        <select
          id="catg-dept-filter"
          className="input-field w-auto min-w-[170px]"
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.dept_name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          id="catg-status-filter"
          className="input-field w-auto min-w-[140px]"
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
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
                  <th className="px-5 py-3">Category Name</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3 hidden md:table-cell">Description</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>
                          No categories found.
                          {canEdit && ' Click "Add Category" to get started.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : categories.map(c => (
                  <tr
                    key={c.id}
                    className={`hover:bg-gray-50/60 transition-colors ${!c.is_active ? 'opacity-55' : ''}`}
                  >
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-violet-700">
                      {c.catg_code || <span className="text-gray-300 italic">—</span>}
                    </td>

                    {/* Name */}
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {c.category_name}
                    </td>

                    {/* Department */}
                    <td className="px-5 py-3">
                      {c.dept_name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                          <span className="text-gray-700 text-xs font-medium">{c.dept_name}</span>
                          {c.dept_code && (
                            <span className="text-gray-400 text-xs font-mono">({c.dept_code})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3 text-gray-400 text-xs hidden md:table-cell max-w-[220px]">
                      <span className="truncate block">{c.description || '—'}</span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        c.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(c)}
                          className={`text-xs font-semibold ${
                            c.is_active
                              ? 'text-red-500 hover:text-red-700'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {c.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer row count */}
          {categories.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                {categories.length} {categories.length === 1 ? 'category' : 'categories'} found
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CategoryModal editItem={editItem} onClose={closeModal} />
      )}
    </div>
  )
}
