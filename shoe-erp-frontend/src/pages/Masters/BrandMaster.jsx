import React, { useState, useEffect } from 'react'
import {
  useBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand
} from '../../hooks/useBrands'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

// ─── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = { brand_name: '', description: '' }

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
function BrandModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateBrand()
  const updateMut = useUpdateBrand()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]     = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(editItem
      ? { brand_name: editItem.brand_name || '', description: editItem.description || '' }
      : EMPTY_FORM
    )
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

    const payload = { brand_name: form.brand_name.trim(), description: form.description || null }

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

          {/* Brand Name */}
          <Field label="Brand Name" required error={errors.brand_name}>
            <input
              id="brand_name"
              className={`input-field ${errors.brand_name ? 'border-red-400 focus:ring-red-300' : ''}`}
              value={form.brand_name}
              onChange={set('brand_name')}
              placeholder="e.g. Nike, Adidas, Bata"
              autoFocus
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              id="brand_description"
              className="input-field resize-none"
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Optional description…"
            />
          </Field>

          {/* Auto-code info */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                Brand code auto-generated on save (BRAND-0001, BRAND-0002…)
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
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
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [editItem, setEditItem]         = useState(null)

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading } = useBrands(params)
  const updateMut = useUpdateBrand()

  const brands = Array.isArray(data) ? data : []

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
            id="brand-search"
            className="input-field pl-9"
            placeholder="Search by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <select
          id="brand-status-filter"
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
                  <th className="px-5 py-3">Brand Name</th>
                  <th className="px-5 py-3 hidden md:table-cell">Description</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {brands.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span>No brands found.{canEdit && ' Click "Add Brand" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : brands.map(b => (
                  <tr
                    key={b.id}
                    className={`hover:bg-gray-50/60 transition-colors ${!b.is_active ? 'opacity-55' : ''}`}
                  >
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-orange-700">
                      {b.brand_code || <span className="text-gray-300 italic">—</span>}
                    </td>

                    {/* Brand Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        {/* Brand initial avatar */}
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {b.brand_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{b.brand_name}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3 text-gray-400 text-xs hidden md:table-cell max-w-[260px]">
                      <span className="truncate block">{b.description || '—'}</span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
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

          {/* Footer */}
          {brands.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                {brands.length} {brands.length === 1 ? 'brand' : 'brands'} found
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && <BrandModal editItem={editItem} onClose={closeModal} />}
    </div>
  )
}
