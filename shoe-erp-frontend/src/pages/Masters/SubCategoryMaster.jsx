import React, { useState, useEffect } from 'react'
import {
  useSubCategories,
  useCreateSubCategory,
  useUpdateSubCategory,
  useDeleteSubCategory
} from '../../hooks/useSubCategories'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

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

  const [search, setSearch]           = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [editItem, setEditItem]       = useState(null)

  const params = {}
  if (search.trim()) params.search = search.trim()

  const { data, isLoading } = useSubCategories(params)
  const updateMut = useUpdateSubCategory()

  const subCategories = Array.isArray(data) ? data : []

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
                {subCategories.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="p-10 text-center text-gray-400">
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
        </div>
      )}

      {showModal && (
        <SubCategoryModal editItem={editItem} onClose={closeModal} />
      )}
    </div>
  )
}
