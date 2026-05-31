import React, { useState, useEffect } from 'react'
import { useColors, useCreateColor, useUpdateColor, useDeleteColor } from '../../hooks/useColors'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'

const EMPTY = { color_code: '', color_name: '', hex_code: '#000000' }

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Modal ─────────────────────────────────────────────────────────────────────
function ColorModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateColor()
  const updateMut = useUpdateColor()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        color_code: editItem.color_code || '',
        color_name: editItem.color_name || '',
        hex_code: editItem.hex_code || '#000000'
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [editItem])

  const set = (key) => (e) => {
    let val = e.target.value
    if (key === 'color_code') {
      val = val.toUpperCase()
    }
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.color_code.trim()) { setErrors({ color_code: 'Color code is required' }); return }
    if (!form.color_name.trim()) { setErrors({ color_name: 'Color name is required' }); return }

    const payload = {
      color_code: form.color_code.trim().toUpperCase(),
      color_name: form.color_name.trim(),
      hex_code: form.hex_code ? form.hex_code.trim() : null
    }

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('Color updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Color created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Color' : 'Add New Color'}</h3>
            {isEdit && editItem.color_master_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.color_master_code}</p>
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
            <label className="label">Color Master Code</label>
            <input
              value={isEdit ? editItem.color_master_code : "Auto Generated (COLOR-0001)"}
              disabled
              className="input-field bg-gray-50 text-gray-500 font-mono"
            />
          </div>

          <Field label="Color Code" required error={errors.color_code}>
            <input
              type="text"
              maxLength={10}
              placeholder="e.g. BLK, WHT, RED"
              value={form.color_code}
              onChange={set('color_code')}
              className="input-field font-mono"
              autoFocus
            />
          </Field>

          <Field label="Color Name" required error={errors.color_name}>
            <input
              type="text"
              placeholder="e.g. Black, White, Red"
              value={form.color_name}
              onChange={set('color_name')}
              className="input-field"
            />
          </Field>

          <Field label="Hex Code (Optional)">
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.hex_code || '#000000'}
                onChange={set('hex_code')}
                className="w-10 h-10 rounded border cursor-pointer flex-shrink-0"
              />
              <input
                type="text"
                placeholder="#000000"
                maxLength={7}
                value={form.hex_code}
                onChange={set('hex_code')}
                className="input-field font-mono"
              />
            </div>
          </Field>

          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Code auto-generated on save (COLOR-0001, COLOR-0002…)</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Color' : 'Create Color'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ColorMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]             = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [showImport, setShowImport]     = useState(false)
  const [editItem, setEditItem]         = useState(null)

  const templateColumns = [
    {
      key: 'color_code',
      label: 'Color Code',
      required: true,
      example: 'BLK',
      example2: 'WHT',
      note: 'Short code e.g. BLK, WHT, RED, BLU'
    },
    {
      key: 'color_name',
      label: 'Color Name',
      required: true,
      example: 'Black',
      example2: 'White'
    },
    {
      key: 'hex_code',
      label: 'Hex Code',
      required: false,
      example: '#000000',
      example2: '#FFFFFF',
      note: 'Format: #RRGGBB e.g. #FF0000'
    }
  ]

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading, refetch } = useColors(params)
  const updateMut = useUpdateColor()

  const colors = Array.isArray(data) ? data : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (c) => { setEditItem(c);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (c) => {
    updateMut.mutate({ id: c.id, data: { is_active: !c.is_active } }, {
      onSuccess: () => toast.success(`Color ${c.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Color Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage color specifications — codes auto-generated (COLOR-0001…)</p>
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
            <button id="btn-add-color" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Color
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="color-search" className="input-field pl-9" placeholder="Search by name, code or master code…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="color-status-filter" className="input-field w-auto min-w-[140px]"
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
                  <th className="px-5 py-3 whitespace-nowrap">Master Code</th>
                  <th className="px-5 py-3 whitespace-nowrap">Color Code</th>
                  <th className="px-5 py-3">Color Name</th>
                  <th className="px-5 py-3">Color</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {colors.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>No colors found.{canEdit && ' Click "Add Color" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : colors.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50/60 transition-colors ${!c.is_active ? 'opacity-55' : ''}`}>
                    {/* Master Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-purple-700">{c.color_master_code || '-'}</td>

                    {/* Color Code */}
                    <td className="px-5 py-3 font-mono font-semibold text-xs whitespace-nowrap text-gray-700">{c.color_code}</td>

                    {/* Color Name */}
                    <td className="px-5 py-3">
                      <span className="font-semibold text-gray-900">{c.color_name}</span>
                    </td>

                    {/* Color Dot Preview */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {c.hex_code ? (
                          <>
                            <span
                              className="w-5 h-5 rounded-full border border-gray-200 inline-block shadow-sm"
                              style={{ backgroundColor: c.hex_code }}
                            />
                            <span className="text-xs font-mono text-gray-500">{c.hex_code}</span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No Hex</span>
                        )}
                      </div>
                    </td>

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
          {colors.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{colors.length} {colors.length === 1 ? 'color' : 'colors'} found</p>
            </div>
          )}
        </div>
      )}

      {showModal && <ColorModal editItem={editItem} onClose={closeModal} />}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="Color Master"
        templateColumns={templateColumns}
        importUrl="/api/colors/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
