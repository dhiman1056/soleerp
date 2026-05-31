import React, { useState, useEffect } from 'react'
import { useLocations, useCreateLocation, useUpdateLocation } from '../../hooks/useLocations'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

const EMPTY = { location_name: '', location_type: '', description: '' }

const LOCATION_TYPES = [
  'Raw Material Store',
  'Semi-Finished Store',
  'Finished Goods Warehouse',
  'WIP Store',
  'Rejection Store',
  'Dispatch Area',
  'Other'
]

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

// Helper for type badge colors
const getTypeBadgeClass = (type) => {
  switch (type) {
    case 'Raw Material Store':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    case 'Semi-Finished Store':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'Finished Goods Warehouse':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'WIP Store':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'Rejection Store':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'Dispatch Area':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function LocationModal({ editItem, onClose }) {
  const anonymity = !!editItem
  const isEdit = anonymity
  const createMut = useCreateLocation()
  const updateMut = useUpdateLocation()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        location_name: editItem.location_name || '',
        location_type: editItem.location_type || '',
        description: editItem.description || ''
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

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.location_name.trim()) errs.location_name = 'Location name is required'
    if (!form.location_type.trim()) errs.location_type = 'Location type is required'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const payload = {
      location_name: form.location_name.trim(),
      location_type: form.location_type.trim(),
      description: form.description ? form.description.trim() : null
    }

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, ...payload }, {
        onSuccess: () => onClose(),
        onError: (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => onClose(),
        onError: (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Location' : 'Add New Location'}</h3>
            {isEdit && editItem.loc_master_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.loc_master_code}</p>
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
            <label className="label">Location Code</label>
            <input
              value={isEdit ? editItem.loc_master_code : "Auto Generated (LOC-0001)"}
              disabled
              className="input-field bg-gray-50 text-gray-500 font-mono"
            />
          </div>

          <Field label="Location Name" required error={errors.location_name}>
            <input
              type="text"
              placeholder="e.g. Raw Material Store A"
              className={`input-field ${errors.location_name ? 'border-red-400' : ''}`}
              value={form.location_name}
              onChange={set('location_name')}
              autoFocus
            />
          </Field>

          <Field label="Location Type" required error={errors.location_type}>
            <select
              className={`input-field ${errors.location_type ? 'border-red-400' : ''}`}
              value={form.location_type}
              onChange={set('location_type')}
            >
              <option value="">— Select Location Type —</option>
              {LOCATION_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <textarea
              placeholder="Write a brief location description (optional)..."
              className="input-field min-h-[80px]"
              value={form.description}
              onChange={set('description')}
            />
          </Field>

          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Code auto-generated on save (LOC-0001, LOC-0002…)</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Location' : 'Create Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function LocationMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]             = useState('')
  const [filterType, setFilterType]     = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [editItem, setEditItem]         = useState(null)

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterType !== '')   params.location_type = filterType
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading } = useLocations(params)
  const updateMut = useUpdateLocation()

  const locations = Array.isArray(data) ? data : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (c) => { setEditItem(c);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (c) => {
    updateMut.mutate({ id: c.id, is_active: !c.is_active }, {
      onSuccess: () => toast.success(`Location ${c.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Location Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage storage locations — codes auto-generated (LOC-0001…)</p>
        </div>
        {canEdit && (
          <button id="btn-add-location" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Location
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="loc-search" className="input-field pl-9" placeholder="Search by name, code or master code…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="loc-type-filter" className="input-field w-auto min-w-[160px]"
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {LOCATION_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select id="loc-status-filter" className="input-field w-auto min-w-[140px]"
          value={filterActive} onChange={e => setFilterActive(e.target.value)}>
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
                  <th className="px-5 py-3">Location Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {locations.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>No locations found.{canEdit && ' Click "Add Location" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : locations.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50/60 transition-colors ${!c.is_active ? 'opacity-55' : ''}`}>
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-purple-700">{c.loc_master_code || c.location_code}</td>

                    {/* Location Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {c.location_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{c.location_name}</span>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getTypeBadgeClass(c.location_type)}`}>
                        {c.location_type}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{c.description || '-'}</td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
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
          {locations.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{locations.length} {locations.length === 1 ? 'location' : 'locations'} found</p>
            </div>
          )}
        </div>
      )}

      {showModal && <LocationModal editItem={editItem} onClose={closeModal} />}
    </div>
  )
}
