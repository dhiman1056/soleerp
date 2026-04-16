import React, { useState, useEffect } from 'react'
import { useLocations, useCreateLocation, useUpdateLocation } from '../../hooks/useLocations'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

const LOCATION_TYPES = ['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOODS', 'WIP', 'OTHER']
const TYPE_LABELS = {
  RAW_MATERIAL:   'Raw Material',
  SEMI_FINISHED:  'Semi-Finished',
  FINISHED_GOODS: 'Finished Goods',
  WIP:            'WIP / Production',
  OTHER:          'Other',
}
const TYPE_COLORS = {
  RAW_MATERIAL:   'bg-blue-100 text-blue-700',
  SEMI_FINISHED:  'bg-purple-100 text-purple-700',
  FINISHED_GOODS: 'bg-green-100 text-green-700',
  WIP:            'bg-amber-100 text-amber-700',
  OTHER:          'bg-gray-100 text-gray-700',
}

const EMPTY_FORM = { location_code: '', location_name: '', location_type: 'WIP', description: '' }

export default function LocationMaster() {
  const { user } = useAuth()
  const { data, isLoading } = useLocations({ all: '1' })
  const createMut = useCreateLocation()
  const updateMut = useUpdateLocation()

  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)   // null = create, obj = edit
  const [form, setForm]         = useState(EMPTY_FORM)

  const locations = Array.isArray(data) ? data : []
  const canEdit   = ['admin', 'manager'].includes(user?.role)

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit   = (loc) => {
    setEditItem(loc)
    setForm({
      location_code: loc.location_code,
      location_name: loc.location_name,
      location_type: loc.location_type,
      description:   loc.description || '',
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.location_code || !form.location_name || !form.location_type) {
      toast.error('Code, Name and Type are required')
      return
    }
    if (editItem) {
      updateMut.mutate(
        { id: editItem.id, location_name: form.location_name, location_type: form.location_type, description: form.description },
        { onSuccess: () => setShowForm(false) }
      )
    } else {
      createMut.mutate(form, { onSuccess: () => setShowForm(false) })
    }
  }

  const handleToggle = (loc) => {
    updateMut.mutate({ id: loc.id, is_active: !loc.is_active })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Location Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage store and floor locations used in Work Orders and Receipts</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="btn-primary text-sm">
            + New Location
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="p-8"><Loader /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3 text-center">Status</th>
                {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {locations.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No locations found. Create one above.</td></tr>
              ) : locations.map(loc => (
                <tr key={loc.id} className={`hover:bg-gray-50/50 ${!loc.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3 font-mono font-bold text-gray-800 text-xs">{loc.location_code}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">{loc.location_name}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[loc.location_type] || 'bg-gray-100 text-gray-700'}`}>
                      {TYPE_LABELS[loc.location_type] || loc.location_type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{loc.description || '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${loc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {loc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-5 py-3 text-right space-x-3">
                      <button onClick={() => openEdit(loc)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                      <button
                        onClick={() => handleToggle(loc)}
                        className={`text-xs font-medium ${loc.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                      >
                        {loc.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-5">
              {editItem ? 'Edit Location' : 'New Location'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Location Code *</label>
                <input
                  className="input-field font-mono uppercase"
                  value={form.location_code}
                  onChange={e => setForm(f => ({ ...f, location_code: e.target.value.toUpperCase() }))}
                  disabled={!!editItem}
                  placeholder="e.g. LOC-WIP-002"
                />
              </div>
              <div>
                <label className="label">Location Name *</label>
                <input
                  className="input-field"
                  value={form.location_name}
                  onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))}
                  placeholder="e.g. Assembly Floor B"
                />
              </div>
              <div>
                <label className="label">Location Type *</label>
                <select
                  className="input-field"
                  value={form.location_type}
                  onChange={e => setForm(f => ({ ...f, location_type: e.target.value }))}
                >
                  {LOCATION_TYPES.map(t => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  className="input-field"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary">
                  {createMut.isPending || updateMut.isPending ? 'Saving…' : editItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
