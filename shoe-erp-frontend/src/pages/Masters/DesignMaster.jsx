import React, { useState, useEffect } from 'react'
import { useDesigns, useCreateDesign, useUpdateDesign, useDeleteDesign } from '../../hooks/useDesigns'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

const EMPTY = { design_no: '', design_name: '', description: '' }

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Modal ─────────────────────────────────────────────────────────────────────
function DesignModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateDesign()
  const updateMut = useUpdateDesign()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        design_no:   editItem.design_no   || '',
        design_name: editItem.design_name || '',
        description: editItem.description || '',
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
    if (!form.design_no.trim())   errs.design_no   = 'Design No is required'
    if (!form.design_name.trim()) errs.design_name = 'Design Name is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      design_no:   form.design_no.trim(),
      design_name: form.design_name.trim(),
      description: form.description || null,
    }

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('Design updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Design created'); onClose() },
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
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Design' : 'Add New Design'}</h3>
            {isEdit && editItem.design_master_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.design_master_code}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Design No + Name side by side */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Design No" required error={errors.design_no}>
              <input id="design_no"
                className={`input-field font-mono font-bold ${errors.design_no ? 'border-red-400' : ''}`}
                value={form.design_no} onChange={set('design_no')}
                placeholder="e.g. D-001" autoFocus={!isEdit} />
            </Field>
            <Field label="Design Name" required error={errors.design_name}>
              <input id="design_name"
                className={`input-field ${errors.design_name ? 'border-red-400' : ''}`}
                value={form.design_name} onChange={set('design_name')}
                placeholder="e.g. Classic Oxford" autoFocus={isEdit} />
            </Field>
          </div>

          {/* Description */}
          <Field label="Description">
            <textarea id="design_desc" className="input-field resize-none" rows={3}
              value={form.description} onChange={set('description')}
              placeholder="Optional — style notes, season, target market…" />
          </Field>

          {/* Auto-code banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Master code auto-generated on save (DESIGN-0001, DESIGN-0002…)</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Design' : 'Create Design'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Colour avatar (design no → deterministic colour) ─────────────────────────
const PALETTE = [
  'from-pink-400 to-rose-500',
  'from-violet-400 to-purple-600',
  'from-sky-400 to-blue-600',
  'from-teal-400 to-emerald-500',
  'from-orange-400 to-amber-500',
  'from-indigo-400 to-blue-600',
  'from-fuchsia-400 to-pink-600',
]
const avatarGradient = (str = '') => PALETTE[str.charCodeAt(0) % PALETTE.length] || PALETTE[0]

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DesignMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]         = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading } = useDesigns(params)
  const updateMut = useUpdateDesign()

  const designs = Array.isArray(data) ? data : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (d) => { setEditItem(d);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (d) => {
    updateMut.mutate({ id: d.id, data: { is_active: !d.is_active } }, {
      onSuccess: () => toast.success(`Design ${d.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Design Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage shoe designs — codes auto-generated (DESIGN-0001…)</p>
        </div>
        {canEdit && (
          <button id="btn-add-design" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Design
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="design-search" className="input-field pl-9" placeholder="Search by design no or name…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="design-status-filter" className="input-field w-auto min-w-[140px]"
          value={filterActive} onChange={e => setFilterActive(e.target.value)}>
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table / Cards */}
      {isLoading ? (
        <div className="p-12 flex justify-center"><Loader /></div>
      ) : designs.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <div className="flex flex-col items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="font-semibold text-gray-500">No designs found</p>
              {canEdit && <p className="text-sm mt-1">Click "Add Design" to get started</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Master Code</th>
                  <th className="px-5 py-3">Design No</th>
                  <th className="px-5 py-3">Design Name</th>
                  <th className="px-5 py-3 hidden md:table-cell">Description</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {designs.map(d => (
                  <tr key={d.id} className={`hover:bg-gray-50/60 transition-colors ${!d.is_active ? 'opacity-55' : ''}`}>
                    {/* Master Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-fuchsia-700">
                      {d.design_master_code || <span className="text-gray-300 italic">—</span>}
                    </td>

                    {/* Design No chip */}
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded font-mono font-bold text-xs bg-gradient-to-r ${avatarGradient(d.design_no)} text-white`}>
                        {d.design_no}
                      </span>
                    </td>

                    {/* Design Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${avatarGradient(d.design_no)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {d.design_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{d.design_name}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3 hidden md:table-cell text-xs text-gray-400 max-w-[240px]">
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
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">{designs.length} {designs.length === 1 ? 'design' : 'designs'} found</p>
          </div>
        </div>
      )}

      {showModal && <DesignModal editItem={editItem} onClose={closeModal} />}
    </div>
  )
}
