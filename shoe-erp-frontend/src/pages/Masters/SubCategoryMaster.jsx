import React, { useState, useEffect } from 'react'
import {
  useSubCategories,
  useCreateSubCategory,
  useUpdateSubCategory,
  useDeleteSubCategory
} from '../../hooks/useSubCategories'
import { useCategories } from '../../hooks/useCategories'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

// ─── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  sub_category_name: '',
  description:       '',
  category_id:       '',
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

// ─── Breadcrumb hierarchy badge ───────────────────────────────────────────────
const HierarchyBadge = ({ dept, category }) => {
  if (!dept && !category) return null
  return (
    <div className="flex items-center gap-1.5 mt-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <span className="text-xs text-indigo-600 font-medium">
        {[dept, category].filter(Boolean).join(' → ')}
      </span>
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function SubCategoryModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateSubCategory()
  const updateMut = useUpdateSubCategory()
  const pending   = createMut.isPending || updateMut.isPending

  // Load active categories with their dept info
  const { data: catgData, isLoading: catgLoading } = useCategories({ is_active: 'true' })
  const categories = Array.isArray(catgData) ? catgData : []

  const [form, setForm]     = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  // Derive department name from selected category
  const selectedCategory = categories.find(c => String(c.id) === String(form.category_id))

  useEffect(() => {
    if (editItem) {
      setForm({
        sub_category_name: editItem.sub_category_name || '',
        description:       editItem.description       || '',
        category_id:       editItem.category_id ? String(editItem.category_id) : '',
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
    if (!form.category_id)              errs.category_id       = 'Category is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      sub_category_name: form.sub_category_name.trim(),
      description:       form.description || null,
      category_id:       Number(form.category_id),
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

          {/* Sub-category Name */}
          <Field label="Sub-Category Name" required error={errors.sub_category_name}>
            <input
              id="sub_category_name"
              className={`input-field ${errors.sub_category_name ? 'border-red-400 focus:ring-red-300' : ''}`}
              value={form.sub_category_name}
              onChange={set('sub_category_name')}
              placeholder="e.g. Formal, Casual, Sports"
              autoFocus
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              id="subcatg_description"
              className="input-field resize-none"
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Optional description…"
            />
          </Field>

          {/* Category dropdown */}
          <Field label="Category" required error={errors.category_id}>
            <select
              id="subcatg_category"
              className={`input-field ${errors.category_id ? 'border-red-400 focus:ring-red-300' : ''}`}
              value={form.category_id}
              onChange={set('category_id')}
              disabled={catgLoading}
            >
              <option value="">
                {catgLoading ? 'Loading categories…' : '— Select Category —'}
              </option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.category_name}
                  {c.catg_code ? ` (${c.catg_code})` : ''}
                </option>
              ))}
            </select>
            {categories.length === 0 && !catgLoading && (
              <p className="mt-1 text-xs text-amber-600">
                No active categories found. Please create a category first.
              </p>
            )}
          </Field>

          {/* Hierarchy preview — shows dept → category when a category is selected */}
          {selectedCategory && (
            <HierarchyBadge
              dept={selectedCategory.dept_name}
              category={selectedCategory.category_name}
            />
          )}

          {/* Auto-code info banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                Code auto-generated on save (SUBCATG-0001, SUBCATG-0002…)
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
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

  const [search, setSearch]           = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterActive, setFilterActive]     = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [editItem, setEditItem]       = useState(null)

  const params = {}
  if (search.trim())       params.search      = search.trim()
  if (filterCategory)      params.category_id = filterCategory
  if (filterActive !== '') params.is_active   = filterActive

  const { data, isLoading } = useSubCategories(params)
  const { data: catgData }  = useCategories({ is_active: 'true' })
  const updateMut = useUpdateSubCategory()

  const subCategories = Array.isArray(data)     ? data     : []
  const categories    = Array.isArray(catgData) ? catgData : []

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
            id="subcatg-search"
            className="input-field pl-9"
            placeholder="Search by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter */}
        <select
          id="subcatg-catg-filter"
          className="input-field w-auto min-w-[170px]"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.category_name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          id="subcatg-status-filter"
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
                  <th className="px-5 py-3">Sub-Category</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 hidden md:table-cell">Department</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Description</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subCategories.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span>
                          No sub-categories found.
                          {canEdit && ' Click "Add Sub-Category" to get started.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : subCategories.map(sc => (
                  <tr
                    key={sc.id}
                    className={`hover:bg-gray-50/60 transition-colors ${!sc.is_active ? 'opacity-55' : ''}`}
                  >
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-teal-700">
                      {sc.sub_catg_code || <span className="text-gray-300 italic">—</span>}
                    </td>

                    {/* Sub-Category Name */}
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {sc.sub_category_name}
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3">
                      {sc.category_name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                          <span className="text-gray-700 text-xs font-medium">{sc.category_name}</span>
                          {sc.catg_code && (
                            <span className="text-gray-400 text-xs font-mono">({sc.catg_code})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Department */}
                    <td className="px-5 py-3 hidden md:table-cell">
                      {sc.dept_name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                          <span className="text-gray-600 text-xs">{sc.dept_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3 text-gray-400 text-xs hidden lg:table-cell max-w-[200px]">
                      <span className="truncate block">{sc.description || '—'}</span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        sc.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {sc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button
                          onClick={() => openEdit(sc)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(sc)}
                          className={`text-xs font-semibold ${
                            sc.is_active
                              ? 'text-red-500 hover:text-red-700'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {sc.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {subCategories.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                {subCategories.length} {subCategories.length === 1 ? 'sub-category' : 'sub-categories'} found
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <SubCategoryModal editItem={editItem} onClose={closeModal} />
      )}
    </div>
  )
}
