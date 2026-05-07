import React, { useState, useEffect } from 'react'
import { useUOMs, useCreateUOM, useUpdateUOM, useDeleteUOM } from '../../hooks/useUOM'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

// ─── Common footwear UOM chips (quick-reference) ──────────────────────────────
const COMMON_UOMS = [
  { code: 'PCS',  name: 'Pieces' },
  { code: 'PAIR', name: 'Pair' },
  { code: 'MTR',  name: 'Meter' },
  { code: 'KG',   name: 'Kilogram' },
  { code: 'LTR',  name: 'Litre' },
  { code: 'SQF',  name: 'Sq. Feet' },
  { code: 'SQMT', name: 'Sq. Meter' },
  { code: 'SET',  name: 'Set' },
  { code: 'BOX',  name: 'Box' },
  { code: 'DOZ',  name: 'Dozen' },
  { code: 'ROLL', name: 'Roll' },
  { code: 'GRAM', name: 'Gram' },
]

const EMPTY = { uom_code: '', uom_name: '', description: '', pack_size: '1', pack_size_unit: '' }

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Modal ─────────────────────────────────────────────────────────────────────
function UOMModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateUOM()
  const updateMut = useUpdateUOM()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        uom_code:       editItem.uom_code       || '',
        uom_name:       editItem.uom_name        || '',
        description:    editItem.description     || '',
        pack_size:      editItem.pack_size != null ? String(editItem.pack_size) : '1',
        pack_size_unit: editItem.pack_size_unit  || '',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [editItem])

  const set = (key) => (e) => {
    const val = key === 'uom_code' ? e.target.value.toUpperCase() : e.target.value
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: '' }))
  }

  // Quick-fill from common UOM chip
  const fillFromChip = (chip) => {
    setForm(f => ({ ...f, uom_code: chip.code, uom_name: chip.name }))
    setErrors({})
  }

  const validate = () => {
    const errs = {}
    if (!form.uom_code.trim()) errs.uom_code = 'UOM code is required'
    if (!form.uom_name.trim()) errs.uom_name = 'UOM name is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      uom_code:       form.uom_code.trim().toUpperCase(),
      uom_name:       form.uom_name.trim(),
      description:    form.description || null,
      pack_size:      parseFloat(form.pack_size) || 1,
      pack_size_unit: form.pack_size_unit || null,
    }

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('UOM updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('UOM created'); onClose() },
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
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit UOM' : 'Add New UOM'}</h3>
            {isEdit && editItem.uom_master_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.uom_master_code}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Quick-fill chips (create only) */}
          {!isEdit && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">Quick fill from common UOMs:</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_UOMS.map(c => (
                  <button
                    key={c.code} type="button"
                    onClick={() => fillFromChip(c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                      form.uom_code === c.code
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* UOM Code + UOM Name side by side */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="UOM Code" required error={errors.uom_code}>
              <input id="uom_code" className={`input-field font-mono font-bold uppercase ${errors.uom_code ? 'border-red-400' : ''}`}
                value={form.uom_code} onChange={set('uom_code')} placeholder="PAIR" />
            </Field>
            <Field label="UOM Name" required error={errors.uom_name}>
              <input id="uom_name" className={`input-field ${errors.uom_name ? 'border-red-400' : ''}`}
                value={form.uom_name} onChange={set('uom_name')} placeholder="Pair" autoFocus={!isEdit} />
            </Field>
          </div>

          {/* Description */}
          <Field label="Description">
            <textarea id="uom_desc" className="input-field resize-none" rows={2}
              value={form.description} onChange={set('description')} placeholder="Optional description…" />
          </Field>

          {/* Pack Size + Unit side by side */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pack Size">
              <input id="uom_pack_size" type="number" step="0.0001" min="0" className="input-field"
                value={form.pack_size} onChange={set('pack_size')} placeholder="1" />
            </Field>
            <Field label="Pack Size Unit">
              <input id="uom_pack_size_unit" className="input-field"
                value={form.pack_size_unit} onChange={set('pack_size_unit')} placeholder="e.g. pieces per pair" />
            </Field>
          </div>

          {/* Auto-code banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Master code auto-generated on save (UOM-0001, UOM-0002…)</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update UOM' : 'Create UOM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function UOMMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]         = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading } = useUOMs(params)
  const updateMut = useUpdateUOM()

  const uoms = Array.isArray(data) ? data : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (u) => { setEditItem(u);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (u) => {
    updateMut.mutate({ id: u.id, data: { is_active: !u.is_active } }, {
      onSuccess: () => toast.success(`UOM ${u.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">UOM Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage units of measure — codes auto-generated (UOM-0001…)</p>
        </div>
        {canEdit && (
          <button id="btn-add-uom" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add UOM
          </button>
        )}
      </div>

      {/* Common UOM reference bar */}
      <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <span className="text-xs text-gray-400 font-medium self-center mr-1">Common:</span>
        {COMMON_UOMS.map(c => (
          <span key={c.code}
            className="px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-600"
            title={c.name}
          >
            {c.code}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="uom-search" className="input-field pl-9" placeholder="Search by code or name…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="uom-status-filter" className="input-field w-auto min-w-[140px]"
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
                  <th className="px-5 py-3">UOM Code</th>
                  <th className="px-5 py-3">UOM Name</th>
                  <th className="px-5 py-3 hidden md:table-cell text-center">Pack Size</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Description</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {uoms.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 7h.01M9 11h6" />
                        </svg>
                        <span>No UOMs found.{canEdit && ' Click "Add UOM" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : uoms.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50/60 transition-colors ${!u.is_active ? 'opacity-55' : ''}`}>
                    {/* Master Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-violet-700">
                      {u.uom_master_code || <span className="text-gray-300 italic">—</span>}
                    </td>

                    {/* UOM Code chip */}
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded font-mono font-bold text-xs">
                        {u.uom_code}
                      </span>
                    </td>

                    {/* UOM Name */}
                    <td className="px-5 py-3 font-semibold text-gray-900">{u.uom_name}</td>

                    {/* Pack Size */}
                    <td className="px-5 py-3 hidden md:table-cell text-center">
                      {u.pack_size != null && u.pack_size !== 1 ? (
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-semibold text-gray-800 text-xs">{u.pack_size}</span>
                          {u.pack_size_unit && <span className="text-xs text-gray-400">{u.pack_size_unit}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">1</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-gray-400 max-w-[200px]">
                      <span className="truncate block">{u.description || '—'}</span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
                        <button onClick={() => handleToggle(u)} className={`text-xs font-semibold ${u.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {uoms.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{uoms.length} {uoms.length === 1 ? 'UOM' : 'UOMs'} found</p>
            </div>
          )}
        </div>
      )}

      {showModal && <UOMModal editItem={editItem} onClose={closeModal} />}
    </div>
  )
}
