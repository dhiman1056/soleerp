import React, { useState, useEffect } from 'react'
import { useHSN, useCreateHSN, useUpdateHSN, useDeleteHSN } from '../../hooks/useHSN'
import { useGST } from '../../hooks/useGST'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'

const EMPTY = { hsn_code: '', description: '', gst_id: '' }

// ─── GST Rate preview box ──────────────────────────────────────────────────────
function GSTPreview({ gstRecord }) {
  if (!gstRecord) return null
  const r = parseFloat(gstRecord.gst_rate)
  const color =
    r === 0  ? 'from-gray-50 border-gray-200 text-gray-700' :
    r <= 5   ? 'from-green-50 border-green-200 text-green-700' :
    r <= 12  ? 'from-blue-50 border-blue-200 text-blue-700' :
    r <= 18  ? 'from-amber-50 border-amber-200 text-amber-700' :
               'from-red-50 border-red-200 text-red-700'

  return (
    <div className={`rounded-xl border bg-gradient-to-br ${color} p-4 space-y-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">Auto-filled from GST Master</span>
        <span className="text-lg font-black">{r}%</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[['SGST', gstRecord.sgst_rate], ['CGST', gstRecord.cgst_rate], ['IGST', gstRecord.igst_rate]].map(([lbl, val]) => (
          <div key={lbl} className="bg-white/70 rounded-lg p-2 text-center border border-white">
            <p className="text-xs font-bold opacity-60 uppercase">{lbl}</p>
            <p className="text-base font-black mt-0.5">{val}%</p>
          </div>
        ))}
      </div>
      <p className="text-xs opacity-60 text-center">SGST + CGST = Intra-state &nbsp;|&nbsp; IGST = Inter-state</p>
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function HSNModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateHSN()
  const updateMut = useUpdateHSN()
  const pending   = createMut.isPending || updateMut.isPending

  const { data: gstData } = useGST({ is_active: 'true' })
  const gstList = Array.isArray(gstData) ? gstData : []

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  // Derived: selected GST record for preview
  const selectedGST = gstList.find(g => String(g.id) === String(form.gst_id)) || null

  useEffect(() => {
    if (editItem) {
      setForm({
        hsn_code:    editItem.hsn_code    || '',
        description: editItem.description || '',
        gst_id:      editItem.gst_id ? String(editItem.gst_id) : '',
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
    if (!form.hsn_code.trim())    errs.hsn_code    = 'HSN code is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      hsn_code:    form.hsn_code.trim(),
      description: form.description.trim(),
      gst_id:      form.gst_id ? Number(form.gst_id) : null,
    }

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('HSN record updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('HSN record created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit HSN Record' : 'Add HSN Code'}</h3>
            {isEdit && editItem.hsn_master_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.hsn_master_code}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* HSN Code + Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">HSN Code<span className="text-red-500 ml-0.5">*</span></label>
              <input id="hsn_code" className={`input-field font-mono font-bold ${errors.hsn_code ? 'border-red-400' : ''}`}
                value={form.hsn_code} onChange={set('hsn_code')} placeholder="6401" />
              {errors.hsn_code && <p className="mt-1 text-xs text-red-500">{errors.hsn_code}</p>}
            </div>
            <div>
              <label className="label">GST Rate</label>
              <select id="hsn_gst" className="input-field" value={form.gst_id} onChange={set('gst_id')}>
                <option value="">— No GST —</option>
                {gstList.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.description} ({g.gst_rate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description<span className="text-red-500 ml-0.5">*</span></label>
            <input id="hsn_desc" className={`input-field ${errors.description ? 'border-red-400' : ''}`}
              value={form.description} onChange={set('description')} placeholder="e.g. Waterproof footwear" />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
          </div>

          {/* Live GST preview */}
          <GSTPreview gstRecord={selectedGST} />

          {/* Auto-code banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Master code auto-generated (HSN-0001…). GST rates synced from GST Master.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update HSN' : 'Create HSN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Rate chip helper ──────────────────────────────────────────────────────────
const RateChip = ({ rate, color = 'gray' }) => {
  const r = parseFloat(rate)
  const cls = isNaN(r) || r === 0 ? 'bg-gray-100 text-gray-500' :
    r <= 5  ? 'bg-green-100 text-green-700' :
    r <= 12 ? 'bg-blue-100 text-blue-700' :
    r <= 18 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
  return <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-xs ${cls}`}>{r}%</span>
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HSNMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]         = useState('')
  const [filterGST, setFilterGST]   = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const templateColumns = [
    {
      key: 'hsn_code',
      label: 'HSN Code',
      required: true,
      example: '6401',
      example2: '6402'
    },
    {
      key: 'description',
      label: 'Description',
      required: true,
      example: 'Waterproof footwear',
      example2: 'Sports footwear'
    },
    {
      key: 'gst_rate',
      label: 'GST Rate %',
      required: false,
      example: '5',
      example2: '12',
      note: 'Must match existing GST Master rate. Leave blank for no GST.'
    }
  ]

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterGST)           params.gst_id   = filterGST
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading, refetch } = useHSN(params)
  const { data: gstData }   = useGST({ is_active: 'true' })
  const updateMut = useUpdateHSN()

  const hsnList = Array.isArray(data)    ? data    : []
  const gstList = Array.isArray(gstData) ? gstData : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (h) => { setEditItem(h);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (h) => {
    updateMut.mutate({ id: h.id, data: { is_active: !h.is_active } }, {
      onSuccess: () => toast.success(`HSN ${h.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">HSN Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Harmonised System of Nomenclature — GST rates auto-synced from GST Master
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
            <button id="btn-add-hsn" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add HSN Code
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="hsn-search" className="input-field pl-9" placeholder="Search by code or description…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="hsn-gst-filter" className="input-field w-auto min-w-[160px]"
          value={filterGST} onChange={e => setFilterGST(e.target.value)}>
          <option value="">All GST Rates</option>
          {gstList.map(g => <option key={g.id} value={g.id}>{g.description} ({g.gst_rate}%)</option>)}
        </select>
        <select id="hsn-status-filter" className="input-field w-auto min-w-[140px]"
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
                  <th className="px-5 py-3">HSN Code</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-center">GST%</th>
                  <th className="px-5 py-3 text-center hidden md:table-cell">SGST</th>
                  <th className="px-5 py-3 text-center hidden md:table-cell">CGST</th>
                  <th className="px-5 py-3 text-center hidden md:table-cell">IGST</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hsnList.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 9 : 8} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>No HSN records found.{canEdit && ' Click "Add HSN Code" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : hsnList.map(h => (
                  <tr key={h.id} className={`hover:bg-gray-50/60 transition-colors ${!h.is_active ? 'opacity-55' : ''}`}>
                    {/* Master Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-teal-700">
                      {h.hsn_master_code || <span className="text-gray-300 italic">—</span>}
                    </td>
                    {/* HSN Code */}
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 bg-teal-50 border border-teal-100 text-teal-800 rounded font-mono font-bold text-xs">
                        {h.hsn_code}
                      </span>
                    </td>
                    {/* Description */}
                    <td className="px-5 py-3 text-gray-700 max-w-[220px]">
                      <span className="truncate block">{h.description}</span>
                      {h.gst_description && (
                        <span className="text-xs text-gray-400">{h.gst_description}</span>
                      )}
                    </td>
                    {/* GST Rate */}
                    <td className="px-5 py-3 text-center"><RateChip rate={h.gst_rate} /></td>
                    {/* SGST */}
                    <td className="px-5 py-3 text-center hidden md:table-cell">
                      <span className="font-mono text-xs text-blue-700 font-semibold">{h.sgst_rate ?? 0}%</span>
                    </td>
                    {/* CGST */}
                    <td className="px-5 py-3 text-center hidden md:table-cell">
                      <span className="font-mono text-xs text-indigo-700 font-semibold">{h.cgst_rate ?? 0}%</span>
                    </td>
                    {/* IGST */}
                    <td className="px-5 py-3 text-center hidden md:table-cell">
                      <span className="font-mono text-xs text-violet-700 font-semibold">{h.igst_rate ?? 0}%</span>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${h.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {h.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button onClick={() => openEdit(h)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
                        <button onClick={() => handleToggle(h)} className={`text-xs font-semibold ${h.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {h.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hsnList.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{hsnList.length} HSN {hsnList.length === 1 ? 'record' : 'records'} found</p>
            </div>
          )}
        </div>
      )}

      {showModal && <HSNModal editItem={editItem} onClose={closeModal} />}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="HSN Master"
        templateColumns={templateColumns}
        importUrl="/api/hsn/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
