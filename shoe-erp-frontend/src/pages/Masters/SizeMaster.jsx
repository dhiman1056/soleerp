import React, { useState, useEffect } from 'react'
import {
  useSizes,
  useCreateSize,
  useUpdateSize,
  useDeleteSize
} from '../../hooks/useSizes'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'

// ─── Size chart data ───────────────────────────────────────────────────────────
const SIZE_CHARTS = ['INFANT', 'KIDS', 'LADIES', 'MEN']

const CHART_DATA = {
  INFANT: {
    uk:   ['2',  '3',  '5',  '6',  '7',  '8',  '9',  '10', '11', '12'],
    euro: ['19', '20', '21', '22', '23', '24', '25', '26', '27', '28'],
  },
  KIDS: {
    uk:   ['6',  '7',  '8',  '9',  '10', '11', '11.5','12', '12.5','13', '1',  '2',  '3',  '4',  '5',  '6'],
    euro: ['24', '25', '26', '27', '28', '29', '30',  '31', '32', '33', '34', '35', '36', '37', '38', '39'],
  },
  LADIES: {
    uk:   ['3',  '4',  '5',  '6',  '7',  '8',  '9'],
    euro: ['36', '37', '38', '39', '40', '41', '42'],
  },
  MEN: {
    uk:   ['6',  '7',  '8',  '9',  '10', '11', '12'],
    euro: ['40', '41', '42', '43', '44', '45', '46'],
  },
}

const CHART_COLORS = {
  INFANT: 'bg-pink-100 text-pink-700 border-pink-200',
  KIDS:   'bg-amber-100 text-amber-700 border-amber-200',
  LADIES: 'bg-purple-100 text-purple-700 border-purple-200',
  MEN:    'bg-blue-100 text-blue-700 border-blue-200',
}

const CHART_HEADER_COLORS = {
  INFANT: 'bg-pink-50 border-pink-100',
  KIDS:   'bg-amber-50 border-amber-100',
  LADIES: 'bg-purple-50 border-purple-100',
  MEN:    'bg-blue-50 border-blue-100',
}

// ─── Size chart reference table ───────────────────────────────────────────────
function SizeChartTable({ chart, selectedUK, onSelectUK }) {
  if (!chart || !CHART_DATA[chart]) return null
  const { uk, euro } = CHART_DATA[chart]

  return (
    <div className={`rounded-xl border overflow-hidden ${CHART_HEADER_COLORS[chart]}`}>
      <div className={`px-3 py-2 border-b ${CHART_HEADER_COLORS[chart]}`}>
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
          {chart} Size Chart — click a UK size to select
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="px-3 py-2 font-bold text-gray-500 whitespace-nowrap w-16 bg-gray-50">UK</td>
              {uk.map((u, i) => (
                <td
                  key={i}
                  onClick={() => onSelectUK(u, euro[i])}
                  className={`px-2.5 py-2 text-center font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    selectedUK === u
                      ? 'bg-gray-900 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {u}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 font-bold text-gray-500 whitespace-nowrap bg-gray-50">EURO</td>
              {euro.map((e, i) => (
                <td
                  key={i}
                  className={`px-2.5 py-2 text-center text-gray-500 whitespace-nowrap ${
                    selectedUK === uk[i] ? 'bg-gray-900 text-white font-semibold' : ''
                  }`}
                >
                  {e}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  size_label:  '',
  description: '',
  size_chart:  '',
  uk_size:     '',
  euro_size:   '',
  sort_order:  '',
}

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
function SizeModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateSize()
  const updateMut = useUpdateSize()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]     = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        size_label:  editItem.size_label  || '',
        description: editItem.description || '',
        size_chart:  editItem.size_chart  || '',
        uk_size:     editItem.uk_size     || '',
        euro_size:   editItem.euro_size   || '',
        sort_order:  editItem.sort_order != null ? String(editItem.sort_order) : '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
  }, [editItem])

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: '' }))
  }

  const handleChartChange = (e) => {
    setForm(f => ({ ...f, size_chart: e.target.value, uk_size: '', euro_size: '' }))
    if (errors.size_chart) setErrors(er => ({ ...er, size_chart: '' }))
  }

  const handleSelectUK = (uk, euro) => {
    setForm(f => ({ ...f, uk_size: uk, euro_size: euro }))
  }

  const validate = () => {
    const errs = {}
    if (!form.size_label.trim()) errs.size_label = 'Size label is required'
    if (!form.size_chart)        errs.size_chart  = 'Size chart is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      size_label:  form.size_label.trim(),
      description: form.description || null,
      size_chart:  form.size_chart,
      uk_size:     form.uk_size   || null,
      euro_size:   form.euro_size || null,
      sort_order:  form.sort_order !== '' ? Number(form.sort_order) : 0,
    }

    if (isEdit) {
      updateMut.mutate(
        { id: editItem.id, data: payload },
        {
          onSuccess: () => { toast.success('Size updated'); onClose() },
          onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Size created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Edit Size' : 'Add New Size'}
            </h3>
            {isEdit && editItem.size_master_code && (
              <p className="text-xs text-gray-500 mt-0.5 font-mono font-semibold tracking-wide">
                {editItem.size_master_code}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Size Label */}
          <Field label="Size Label" required error={errors.size_label}>
            <input
              id="size_label"
              className={`input-field ${errors.size_label ? 'border-red-400 focus:ring-red-300' : ''}`}
              value={form.size_label}
              onChange={set('size_label')}
              placeholder="e.g. Size 6 Kids, Size 8 Men"
              autoFocus
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              id="size_description"
              className="input-field resize-none"
              rows={2}
              value={form.description}
              onChange={set('description')}
              placeholder="Optional description…"
            />
          </Field>

          {/* Size Chart dropdown */}
          <Field label="Size Chart" required error={errors.size_chart}>
            <select
              id="size_chart"
              className={`input-field ${errors.size_chart ? 'border-red-400 focus:ring-red-300' : ''}`}
              value={form.size_chart}
              onChange={handleChartChange}
            >
              <option value="">— Select Size Chart —</option>
              {SIZE_CHARTS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          {/* Interactive size chart table */}
          {form.size_chart && (
            <SizeChartTable
              chart={form.size_chart}
              selectedUK={form.uk_size}
              onSelectUK={handleSelectUK}
            />
          )}

          {/* UK + Euro Size (side by side) */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="UK Size">
              <input
                id="uk_size"
                className="input-field"
                value={form.uk_size}
                onChange={set('uk_size')}
                placeholder="e.g. 8"
              />
            </Field>
            <Field label="Euro Size">
              <input
                id="euro_size"
                className={`input-field ${form.euro_size ? 'bg-green-50 border-green-200 text-green-800 font-semibold' : ''}`}
                value={form.euro_size}
                onChange={set('euro_size')}
                placeholder="Auto-filled"
              />
            </Field>
          </div>

          {/* Sort Order */}
          <Field label="Sort Order">
            <input
              id="sort_order"
              type="number"
              className="input-field"
              value={form.sort_order}
              onChange={set('sort_order')}
              placeholder="0"
              min={0}
            />
          </Field>

          {/* Auto-code info */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                Master code auto-generated on save (SIZE-0001, SIZE-0002…)
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Size' : 'Create Size'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SizeMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]         = useState('')
  const [filterChart, setFilterChart]   = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const templateColumns = [
    { key: 'size_label', label: 'Size Label', required: true, example: '8', example2: '9' },
    { key: 'size_chart', label: 'Size Chart', required: true, example: 'UK', example2: 'EURO', note: 'IND | UK | EURO | US | KIDS' },
    { key: 'uk_size', label: 'UK Size', required: false, example: '8' },
    { key: 'euro_size', label: 'Euro Size', required: false, example: '42' },
    { key: 'sort_order', label: 'Sort Order', required: false, example: '1' },
    { key: 'description', label: 'Description', required: false, example: '' }
  ]

  const params = {}
  if (search.trim())       params.search     = search.trim()
  if (filterChart)         params.size_chart = filterChart
  if (filterActive !== '') params.is_active  = filterActive

  const { data, isLoading, refetch } = useSizes(params)
  const updateMut = useUpdateSize()

  const sizes = Array.isArray(data) ? data : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (s) => { setEditItem(s);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (s) => {
    updateMut.mutate(
      { id: s.id, data: { is_active: !s.is_active } },
      {
        onSuccess: () => toast.success(`Size ${s.is_active ? 'deactivated' : 'activated'}`),
        onError:   ()  => toast.error('Failed to update status')
      }
    )
  }

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Size Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage footwear sizes — codes auto-generated (SIZE-0001…)
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
            <button
              id="btn-add-size"
              onClick={openCreate}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Size
            </button>
          </div>
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
            id="size-search"
            className="input-field pl-9"
            placeholder="Search by label or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Size Chart filter */}
        <select
          id="size-chart-filter"
          className="input-field w-auto min-w-[150px]"
          value={filterChart}
          onChange={e => setFilterChart(e.target.value)}
        >
          <option value="">All Charts</option>
          {SIZE_CHARTS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Status filter */}
        <select
          id="size-status-filter"
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
                  <th className="px-5 py-3">Size Label</th>
                  <th className="px-5 py-3">Size Chart</th>
                  <th className="px-5 py-3 text-center">UK Size</th>
                  <th className="px-5 py-3 text-center">Euro Size</th>
                  <th className="px-5 py-3 hidden md:table-cell text-center">Sort</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sizes.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>No sizes found.{canEdit && ' Click "Add Size" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : sizes.map(s => (
                  <tr
                    key={s.id}
                    className={`hover:bg-gray-50/60 transition-colors ${!s.is_active ? 'opacity-55' : ''}`}
                  >
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-cyan-700">
                      {s.size_master_code || (
                        <span className="text-gray-400 font-mono text-xs">{s.size_code}</span>
                      )}
                    </td>

                    {/* Label */}
                    <td className="px-5 py-3 font-semibold text-gray-900">{s.size_label}</td>

                    {/* Size Chart badge */}
                    <td className="px-5 py-3">
                      {s.size_chart ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${CHART_COLORS[s.size_chart] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {s.size_chart}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* UK Size */}
                    <td className="px-5 py-3 text-center">
                      {s.uk_size
                        ? <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs">{s.uk_size}</span>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>

                    {/* Euro Size */}
                    <td className="px-5 py-3 text-center">
                      {s.euro_size
                        ? <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">{s.euro_size}</span>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>

                    {/* Sort */}
                    <td className="px-5 py-3 text-center text-gray-500 hidden md:table-cell text-xs">
                      {s.sort_order ?? 0}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button
                          onClick={() => openEdit(s)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(s)}
                          className={`text-xs font-semibold ${
                            s.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {s.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {sizes.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {sizes.length} {sizes.length === 1 ? 'size' : 'sizes'} found
              </p>
              {/* Mini chart legend */}
              <div className="flex items-center gap-2">
                {SIZE_CHARTS.map(c => (
                  <span key={c} className={`px-2 py-0.5 rounded text-xs font-semibold border ${CHART_COLORS[c]}`}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && <SizeModal editItem={editItem} onClose={closeModal} />}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="Size Master"
        templateColumns={templateColumns}
        importUrl="/api/sizes/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
