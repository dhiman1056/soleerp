import React, { useState, useEffect } from 'react'
import { useDivisions, useCreateDivision, useUpdateDivision, useDeleteDivision } from '../../hooks/useDivisions'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import api from '../../api/axiosInstance'
import { useQuery } from '@tanstack/react-query'

// Fetch active locations for dropdown
const useLocations = () => useQuery({
  queryKey: ['masters', 'locations'],
  queryFn: async () => {
    const res = await api.get('/locations', { params: { is_active: true } })
    return res.data?.data ?? []
  }
})

const EMPTY = { div_name: '', description: '', location_id: '' }

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Location badge ────────────────────────────────────────────────────────────
const LocationBadge = ({ location_name, location_code }) => {
  if (!location_name) return <span className="text-gray-400 text-xs">—</span>
  return (
    <div className="flex items-center gap-1.5">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span className="text-xs font-semibold text-gray-700">{location_name}</span>
      {location_code && (
        <span className="text-xs font-mono text-gray-400">({location_code})</span>
      )}
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function DivisionModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateDivision()
  const updateMut = useUpdateDivision()
  const pending   = createMut.isPending || updateMut.isPending

  const { data: locationData } = useLocations()
  const locations = Array.isArray(locationData) ? locationData : []

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        div_name:    editItem.div_name    || '',
        description: editItem.description || '',
        location_id: editItem.location_id ? String(editItem.location_id) : '',
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
    if (!form.div_name.trim())  errs.div_name    = 'Division name is required'
    if (!form.location_id)      errs.location_id = 'Location is required to save division'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      div_name:    form.div_name.trim(),
      description: form.description || null,
      location_id: Number(form.location_id),
    }

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('Division updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Division created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  const selLocation = locations.find(l => String(l.id) === String(form.location_id))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Division' : 'Add New Division'}</h3>
            {isEdit && editItem.div_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.div_code}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Division Name */}
          <Field label="Division Name" required error={errors.div_name}>
            <input id="div_name"
              className={`input-field ${errors.div_name ? 'border-red-400' : ''}`}
              value={form.div_name} onChange={set('div_name')}
              placeholder="e.g. Gents, Ladies, Kids, Export" autoFocus />
          </Field>

          {/* Location — required */}
          <Field label="Location" required error={errors.location_id}>
            <select id="div_location"
              className={`input-field ${errors.location_id ? 'border-red-400' : ''}`}
              value={form.location_id} onChange={set('location_id')}>
              <option value="">— Select Location —</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.location_name}</option>
              ))}
            </select>
          </Field>

          {/* Location preview */}
          {selLocation && (
            <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 rounded-lg border border-sky-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs text-sky-700 font-semibold">{selLocation.location_name}</span>
              {selLocation.location_code && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs font-mono text-sky-500">{selLocation.location_code}</span>
                </>
              )}
            </div>
          )}

          {/* Description */}
          <Field label="Description">
            <textarea id="div_desc" className="input-field resize-none" rows={2}
              value={form.description} onChange={set('description')}
              placeholder="Optional — scope, purpose, floor, shift…" />
          </Field>

          {/* Auto-code banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Code auto-generated on save (DIV-0001…). Location is mandatory.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Division' : 'Create Division'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DivisionMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]             = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [editItem, setEditItem]         = useState(null)

  const params = {}
  if (search.trim())       params.search      = search.trim()
  if (filterLocation)      params.location_id = filterLocation
  if (filterActive !== '') params.is_active   = filterActive

  const { data, isLoading } = useDivisions(params)
  const { data: locationData } = useLocations()
  const updateMut = useUpdateDivision()

  const divisions = Array.isArray(data)         ? data         : []
  const locations = Array.isArray(locationData) ? locationData : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (d) => { setEditItem(d);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (d) => {
    updateMut.mutate({ id: d.id, data: { is_active: !d.is_active } }, {
      onSuccess: () => toast.success(`Division ${d.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Division Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage production divisions — codes auto-generated (DIV-0001…)</p>
        </div>
        {canEdit && (
          <button id="btn-add-division" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Division
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="div-search" className="input-field pl-9" placeholder="Search by name or code…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="div-location-filter" className="input-field w-auto min-w-[180px]"
          value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
          <option value="">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.location_name}</option>)}
        </select>
        <select id="div-status-filter" className="input-field w-auto min-w-[140px]"
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
                  <th className="px-5 py-3">Division Name</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Description</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {divisions.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>No divisions found.{canEdit && ' Click "Add Division" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : divisions.map(d => (
                  <tr key={d.id} className={`hover:bg-gray-50/60 transition-colors ${!d.is_active ? 'opacity-55' : ''}`}>
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-sky-700">{d.div_code}</td>

                    {/* Division Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {d.div_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{d.div_name}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-3">
                      <LocationBadge location_name={d.location_name} location_code={d.location_code} />
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-gray-400 max-w-[200px]">
                      <span className="truncate block">{d.description || '—'}</span>
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
          {divisions.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{divisions.length} {divisions.length === 1 ? 'division' : 'divisions'} found</p>
            </div>
          )}
        </div>
      )}

      {showModal && <DivisionModal editItem={editItem} onClose={closeModal} />}
    </div>
  )
}
