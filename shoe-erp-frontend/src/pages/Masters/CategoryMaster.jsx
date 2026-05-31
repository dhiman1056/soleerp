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
import ImportModal from '../../components/shared/ImportModal'

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

          {/* Department */}
          <div>
            <label className="label">Department</label>
            <select
              value={form.dept_id}
              onChange={set('dept_id')}
              className="input-field"
            >
              <option value="">— Select Department —</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.dept_code} — {d.dept_name}
                </option>
              ))}
            </select>
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

  const [search, setSearch]         = useState('')
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
      label: 'Department Name',
      required: false,
      example: 'Production',
      example2: 'Sales',
      note: 'Must exactly match an existing Department Name'
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

  const params = {}
  if (search.trim()) params.search = search.trim()

  const { data, isLoading, refetch } = useCategories(params)
  const updateMut = useUpdateCategory()

  const categories = Array.isArray(data) ? data : []

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
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Discount %</th>
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
                  <tr key={c.id} className={`hover:bg-gray-50/60 transition-colors ${!c.is_active ? 'opacity-55' : ''}`}>
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-violet-700">
                      {c.catg_code || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {c.catg_name}
                    </td>
                    <td className="px-5 py-3">
                      {c.dept_code ? `${c.dept_code} — ${c.dept_name}` : '—'}
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
