import React, { useState, useEffect } from 'react'
import { useGST, useCreateGST, useUpdateGST, useDeleteGST } from '../../hooks/useGST'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'

// ─── GST slab quick-fill chips ────────────────────────────────────────────────
const GST_SLABS = [0, 5, 12, 18, 28]

const EMPTY = { description: '', gst_rate: '' }

// ─── Live rate preview ─────────────────────────────────────────────────────────
function RatePreview({ rate }) {
  const r = parseFloat(rate)
  if (isNaN(r) || rate === '') return null
  const sgst = r / 2, cgst = r / 2, igst = r

  const color =
    r === 0  ? 'from-gray-50 border-gray-200 text-gray-600' :
    r <= 5   ? 'from-green-50 border-green-200 text-green-700' :
    r <= 12  ? 'from-blue-50 border-blue-200 text-blue-700' :
    r <= 18  ? 'from-amber-50 border-amber-200 text-amber-700' :
               'from-red-50 border-red-200 text-red-700'

  return (
    <div className={`rounded-xl border bg-gradient-to-br ${color} p-4 space-y-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">Rate Breakdown</span>
        <span className="text-lg font-black">{r}%</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[['SGST', sgst], ['CGST', cgst], ['IGST', igst]].map(([label, val]) => (
          <div key={label} className="bg-white/70 rounded-lg p-2 text-center border border-white">
            <p className="text-xs font-bold opacity-60 uppercase">{label}</p>
            <p className="text-base font-black mt-0.5">{val}%</p>
          </div>
        ))}
      </div>
      <p className="text-xs opacity-60 text-center">
        SGST + CGST = Intra-state &nbsp;|&nbsp; IGST = Inter-state
      </p>
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function GSTModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateGST()
  const updateMut = useUpdateGST()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        description: editItem.description || '',
        gst_rate:    editItem.gst_rate != null ? String(editItem.gst_rate) : '',
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

  const fillSlab = (rate) => {
    setForm({ description: `GST ${rate}%`, gst_rate: String(rate) })
    setErrors({})
  }

  const validate = () => {
    const errs = {}
    if (!form.description.trim())   errs.description = 'Description is required'
    if (form.gst_rate === '')       errs.gst_rate    = 'GST rate is required'
    if (parseFloat(form.gst_rate) < 0) errs.gst_rate = 'Rate cannot be negative'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = { description: form.description.trim(), gst_rate: parseFloat(form.gst_rate) }

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('GST record updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('GST record created'); onClose() },
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
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit GST Record' : 'Add New GST Slab'}</h3>
            {isEdit && editItem.gst_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.gst_code}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Quick slab chips */}
          {!isEdit && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">Quick fill — standard GST slabs:</p>
              <div className="flex gap-2 flex-wrap">
                {GST_SLABS.map(s => (
                  <button key={s} type="button" onClick={() => fillSlab(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${
                      String(form.gst_rate) === String(s)
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {s}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="label">Description<span className="text-red-500 ml-0.5">*</span></label>
            <input id="gst_desc" className={`input-field ${errors.description ? 'border-red-400' : ''}`}
              value={form.description} onChange={set('description')} placeholder="e.g. GST 12%" autoFocus={!isEdit} />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
          </div>

          {/* GST Rate */}
          <div>
            <label className="label">GST Rate (%)<span className="text-red-500 ml-0.5">*</span></label>
            <input id="gst_rate" type="number" step="0.01" min="0" max="100"
              className={`input-field ${errors.gst_rate ? 'border-red-400' : ''}`}
              value={form.gst_rate} onChange={set('gst_rate')} placeholder="e.g. 12" autoFocus={isEdit} />
            {errors.gst_rate && <p className="mt-1 text-xs text-red-500">{errors.gst_rate}</p>}
          </div>

          {/* Live rate preview */}
          <RatePreview rate={form.gst_rate} />

          {/* Auto-code banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                Code auto-generated on save (GST-0001…). SGST, CGST and IGST auto-calculated.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update GST' : 'Create GST Slab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Rate badge helper ─────────────────────────────────────────────────────────
const RateBadge = ({ rate, label }) => {
  const r = parseFloat(rate)
  const color =
    r === 0  ? 'bg-gray-100 text-gray-600' :
    r <= 5   ? 'bg-green-100 text-green-700' :
    r <= 12  ? 'bg-blue-100 text-blue-700' :
    r <= 18  ? 'bg-amber-100 text-amber-700' :
               'bg-red-100 text-red-700'
  return (
    <div className="flex flex-col items-center">
      {label && <span className="text-gray-400 text-xs mb-0.5">{label}</span>}
      <span className={`px-2 py-0.5 rounded font-bold text-xs ${color}`}>{r}%</span>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function GSTMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]         = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const templateColumns = [
    {
      key: 'description',
      label: 'Description',
      required: true,
      example: 'GST 5%',
      example2: 'GST 12%'
    },
    {
      key: 'gst_rate',
      label: 'GST Rate %',
      required: true,
      example: '5',
      example2: '12',
      note: 'SGST, CGST, IGST auto-calculated'
    }
  ]

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading, refetch } = useGST(params)
  const updateMut = useUpdateGST()

  const gstList = Array.isArray(data) ? data : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (g) => { setEditItem(g);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (g) => {
    updateMut.mutate({ id: g.id, data: { is_active: !g.is_active } }, {
      onSuccess: () => toast.success(`GST ${g.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">GST Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage GST slabs — SGST, CGST & IGST auto-calculated from GST rate
          </p>
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
            <button id="btn-add-gst" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add GST Slab
            </button>
          </div>
        )}
      </div>

      {/* Standard slab reference bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <span className="text-xs text-gray-400 font-medium">Standard slabs:</span>
        {GST_SLABS.map(s => (
          <div key={s} className="flex items-center gap-1.5 text-xs">
            <RateBadge rate={s} />
            <span className="text-gray-400 hidden sm:inline">
              → SGST {s/2}% + CGST {s/2}%
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="gst-search" className="input-field pl-9" placeholder="Search by code or description…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="gst-status-filter" className="input-field w-auto min-w-[140px]"
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
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-center">GST Rate</th>
                  <th className="px-5 py-3 text-center">SGST</th>
                  <th className="px-5 py-3 text-center">CGST</th>
                  <th className="px-5 py-3 text-center">IGST</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gstList.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                        </svg>
                        <span>No GST records found.{canEdit && ' Click "Add GST Slab" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : gstList.map(g => (
                  <tr key={g.id} className={`hover:bg-gray-50/60 transition-colors ${!g.is_active ? 'opacity-55' : ''}`}>
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-emerald-700">{g.gst_code}</td>
                    {/* Description */}
                    <td className="px-5 py-3 font-semibold text-gray-900">{g.description}</td>
                    {/* GST Rate — large badge */}
                    <td className="px-5 py-3 text-center">
                      <RateBadge rate={g.gst_rate} />
                    </td>
                    {/* SGST */}
                    <td className="px-5 py-3 text-center">
                      <span className="font-mono text-xs text-blue-700 font-semibold">{g.sgst_rate}%</span>
                    </td>
                    {/* CGST */}
                    <td className="px-5 py-3 text-center">
                      <span className="font-mono text-xs text-indigo-700 font-semibold">{g.cgst_rate}%</span>
                    </td>
                    {/* IGST */}
                    <td className="px-5 py-3 text-center">
                      <span className="font-mono text-xs text-violet-700 font-semibold">{g.igst_rate}%</span>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${g.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {g.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button onClick={() => openEdit(g)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
                        <button onClick={() => handleToggle(g)} className={`text-xs font-semibold ${g.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {g.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {gstList.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{gstList.length} GST {gstList.length === 1 ? 'record' : 'records'} found</p>
            </div>
          )}
        </div>
      )}

      {showModal && <GSTModal editItem={editItem} onClose={closeModal} />}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="GST Master"
        templateColumns={templateColumns}
        importUrl="/api/gst/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
