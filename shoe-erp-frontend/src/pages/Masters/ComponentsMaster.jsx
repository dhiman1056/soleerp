import React, { useState, useEffect } from 'react'
import { useComponents, useCreateComponent, useUpdateComponent, useDeleteComponent } from '../../hooks/useComponents'
import { useDesigns } from '../../hooks/useDesigns'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

const EMPTY = { comp_name: '', description: '', design_id: '' }

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Design badge ──────────────────────────────────────────────────────────────
const DesignBadge = ({ design_no, design_name }) => {
  if (!design_no) return <span className="text-gray-400">—</span>
  return (
    <div className="flex items-center gap-1.5">
      <span className="px-1.5 py-0.5 bg-fuchsia-50 border border-fuchsia-100 text-fuchsia-700 rounded font-mono font-bold text-xs">
        {design_no}
      </span>
      {design_name && <span className="text-xs text-gray-500 truncate">{design_name}</span>}
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function ComponentModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateComponent()
  const updateMut = useUpdateComponent()
  const pending   = createMut.isPending || updateMut.isPending

  const { data: designData } = useDesigns({ is_active: 'true' })
  const designs = Array.isArray(designData) ? designData : []

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        comp_name:   editItem.comp_name   || '',
        description: editItem.description || '',
        design_id:   editItem.design_id ? String(editItem.design_id) : '',
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
    if (!form.comp_name.trim()) { setErrors({ comp_name: 'Component name is required' }); return }

    const payload = {
      comp_name:   form.comp_name.trim(),
      description: form.description || null,
      design_id:   form.design_id ? Number(form.design_id) : null,
    }

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('Component updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Component created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  // Selected design preview
  const selDesign = designs.find(d => String(d.id) === String(form.design_id))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Component' : 'Add New Component'}</h3>
            {isEdit && editItem.comp_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.comp_code}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Component Name" required error={errors.comp_name}>
            <input id="comp_name"
              className={`input-field ${errors.comp_name ? 'border-red-400' : ''}`}
              value={form.comp_name} onChange={set('comp_name')}
              placeholder="e.g. Outsole, Upper, Insole, Lining" autoFocus />
          </Field>

          <Field label="Description">
            <textarea id="comp_desc" className="input-field resize-none" rows={2}
              value={form.description} onChange={set('description')}
              placeholder="Optional — material, specs, notes…" />
          </Field>

          <Field label="Design (Optional)">
            <select id="comp_design" className="input-field" value={form.design_id} onChange={set('design_id')}>
              <option value="">— No Design —</option>
              {designs.map(d => (
                <option key={d.id} value={d.id}>{d.design_no} — {d.design_name}</option>
              ))}
            </select>
          </Field>

          {/* Design preview breadcrumb */}
          {selDesign && (
            <div className="flex items-center gap-2 px-3 py-2 bg-fuchsia-50 rounded-lg border border-fuchsia-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-fuchsia-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-fuchsia-700 font-semibold">{selDesign.design_no}</span>
              <span className="text-gray-300">›</span>
              <span className="text-xs text-fuchsia-600">{selDesign.design_name}</span>
              {selDesign.design_master_code && (
                <span className="ml-auto text-xs font-mono text-gray-400">{selDesign.design_master_code}</span>
              )}
            </div>
          )}

          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Code auto-generated on save (COMP-0001, COMP-0002…)</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Component' : 'Create Component'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ComponentsMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]           = useState('')
  const [filterDesign, setFilterDesign] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [editItem, setEditItem]       = useState(null)

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterDesign)        params.design_id = filterDesign
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading } = useComponents(params)
  const { data: designData } = useDesigns({ is_active: 'true' })
  const updateMut = useUpdateComponent()

  const components = Array.isArray(data)       ? data       : []
  const designs    = Array.isArray(designData) ? designData : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (c) => { setEditItem(c);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (c) => {
    updateMut.mutate({ id: c.id, data: { is_active: !c.is_active } }, {
      onSuccess: () => toast.success(`Component ${c.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Components Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage shoe components — codes auto-generated (COMP-0001…)</p>
        </div>
        {canEdit && (
          <button id="btn-add-component" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Component
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="comp-search" className="input-field pl-9" placeholder="Search by name or code…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="comp-design-filter" className="input-field w-auto min-w-[180px]"
          value={filterDesign} onChange={e => setFilterDesign(e.target.value)}>
          <option value="">All Designs</option>
          {designs.map(d => <option key={d.id} value={d.id}>{d.design_no} — {d.design_name}</option>)}
        </select>
        <select id="comp-status-filter" className="input-field w-auto min-w-[140px]"
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
                  <th className="px-5 py-3">Component Name</th>
                  <th className="px-5 py-3 hidden md:table-cell">Design</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Description</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {components.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>No components found.{canEdit && ' Click "Add Component" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : components.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50/60 transition-colors ${!c.is_active ? 'opacity-55' : ''}`}>
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-purple-700">{c.comp_code}</td>

                    {/* Component Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {c.comp_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{c.comp_name}</span>
                      </div>
                    </td>

                    {/* Design */}
                    <td className="px-5 py-3 hidden md:table-cell">
                      <DesignBadge design_no={c.design_no} design_name={c.design_name} />
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-gray-400 max-w-[200px]">
                      <span className="truncate block">{c.description || '—'}</span>
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
          {components.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{components.length} {components.length === 1 ? 'component' : 'components'} found</p>
            </div>
          )}
        </div>
      )}

      {showModal && <ComponentModal editItem={editItem} onClose={closeModal} />}
    </div>
  )
}
