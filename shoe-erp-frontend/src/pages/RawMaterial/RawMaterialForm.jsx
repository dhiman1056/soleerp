import React, { useState, useEffect } from 'react'
import { useForm }   from 'react-hook-form'
import Modal         from '../../components/common/Modal.jsx'
import { useCreateRawMaterial, useUpdateRawMaterial } from '../../hooks/useRawMaterials.js'
import { useAddOpeningStock } from '../../hooks/useInventory.js'
import { UOM_OPTIONS } from '../../utils/constants.js'
import { today }     from '../../utils/formatDate.js'

// ── Opening Stock Mini-Modal ──────────────────────────────────────
function OpeningStockModal({ sku, description, uom, onClose }) {
  const addOS  = useAddOpeningStock()
  const [qty,  setQty]  = useState('')
  const [rate, setRate] = useState('')
  const [date, setDate] = useState(today())
  const [rem,  setRem]  = useState('Opening Stock Entry')

  const handleSubmit = (e) => {
    e.preventDefault()
    const q = parseFloat(qty)
    const r = parseFloat(rate)
    if (!q || q <= 0) { alert('Qty must be > 0'); return }
    addOS.mutate(
      { sku_code: sku, opening_qty: q, rate: r || 0, opening_date: date, remarks: rem },
      { onSuccess: onClose }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Opening Stock</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-mono font-semibold text-gray-800">{sku}</span> — {description}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Opening Qty ({uom}) *</label>
              <input
                type="number" min="0.001" step="0.001" required
                value={qty} onChange={e => setQty(e.target.value)}
                className="input-field text-right tabular-nums"
                placeholder="0.000"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Rate per {uom} (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={rate} onChange={e => setRate(e.target.value)}
                className="input-field text-right tabular-nums"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="label">Opening Date *</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="input-field" />
          </div>

          <div>
            <label className="label">Remarks</label>
            <input value={rem} onChange={e => setRem(e.target.value)} className="input-field" placeholder="Opening Stock Entry" />
          </div>

          {qty && rate && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Value</span>
                <span className="font-bold text-blue-800">
                  ₹{(parseFloat(qty || 0) * parseFloat(rate || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={addOS.isPending}
              className="btn-primary flex-1"
            >
              {addOS.isPending ? 'Saving…' : 'Add Opening Stock'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Skip</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Ask user if they want to add opening stock ─────────────────────
function OpeningStockPrompt({ sku, description, uom, onYes, onNo }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Material Created!</h3>
        <p className="text-sm text-gray-500 mb-1">
          <span className="font-mono font-semibold text-gray-800">{sku}</span>
        </p>
        <p className="text-sm text-gray-600 mb-6">
          Would you like to add opening stock for this material?
        </p>
        <div className="flex gap-3">
          <button onClick={onYes} className="btn-primary flex-1">Yes, Add Stock</button>
          <button onClick={onNo}  className="btn-secondary flex-1">Skip</button>
        </div>
      </div>
    </div>
  )
}

// ── Main RawMaterialForm ───────────────────────────────────────────
export default function RawMaterialForm({ isOpen, onClose, existing = null }) {
  const isEdit = !!existing?.sku_code

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { sku_code: '', description: '', uom: 'PCS', rate: 0 },
  })

  const createMut = useCreateRawMaterial()
  const updateMut = useUpdateRawMaterial()
  const isBusy    = createMut.isPending || updateMut.isPending

  // Opening stock flow states
  const [createdSku, setCreatedSku] = useState(null)   // { sku_code, description, uom }
  const [showPrompt, setShowPrompt] = useState(false)
  const [showOS,     setShowOS]     = useState(false)

  useEffect(() => {
    if (isOpen) {
      reset(
        isEdit
          ? { sku_code: existing.sku_code, description: existing.description, uom: existing.uom, rate: existing.rate }
          : { sku_code: '', description: '', uom: 'PCS', rate: 0 }
      )
      setCreatedSku(null)
      setShowPrompt(false)
      setShowOS(false)
    }
  }, [isOpen, isEdit, existing, reset])

  const onSubmit = (values) => {
    const payload = { ...values, rate: parseFloat(values.rate) }
    if (isEdit) {
      updateMut.mutate({ sku: existing.sku_code, ...payload }, { onSuccess: onClose })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          // After create: prompt for opening stock
          setCreatedSku({ sku_code: values.sku_code, description: values.description, uom: values.uom })
          setShowPrompt(true)
        },
      })
    }
  }

  const handleOSClose = () => {
    setShowOS(false)
    setShowPrompt(false)
    onClose()
  }

  return (
    <>
      <Modal
        isOpen={isOpen && !showPrompt && !showOS}
        onClose={onClose}
        title={isEdit ? `Edit: ${existing.sku_code}` : 'Add Raw Material'}
        size="sm"
        footer={
          <>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isBusy}>Cancel</button>
            <button type="submit" form="rm-form" className="btn-primary" disabled={isBusy}>
              {isBusy ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="rm-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">SKU Code *</label>
            <input
              {...register('sku_code', {
                required: 'SKU Code is required',
                maxLength: { value: 50, message: 'Max 50 characters' },
              })}
              disabled={isEdit}
              placeholder="e.g. RM-LEA-001"
              className={`input-field uppercase ${errors.sku_code ? 'input-error' : ''} ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
            />
            {errors.sku_code && <p className="text-red-500 text-xs mt-1">{errors.sku_code.message}</p>}
          </div>

          <div>
            <label className="label">Description *</label>
            <input
              {...register('description', { required: 'Description is required', maxLength: { value: 255, message: 'Max 255 characters' } })}
              placeholder="e.g. Full Grain Leather — Black"
              className={`input-field ${errors.description ? 'input-error' : ''}`}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unit of Measure *</label>
              <select {...register('uom', { required: true })} className="input-field">
                {UOM_OPTIONS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Rate per Unit (₹) *</label>
              <input
                type="number" step="0.01" min="0"
                {...register('rate', { required: 'Rate is required', min: { value: 0, message: 'Must be ≥ 0' }, valueAsNumber: true })}
                className={`input-field ${errors.rate ? 'input-error' : ''}`}
              />
              {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate.message}</p>}
            </div>
          </div>
        </form>
      </Modal>

      {/* Opening Stock Prompt */}
      {showPrompt && createdSku && (
        <OpeningStockPrompt
          sku={createdSku.sku_code}
          description={createdSku.description}
          uom={createdSku.uom}
          onYes={() => { setShowPrompt(false); setShowOS(true) }}
          onNo={onClose}
        />
      )}

      {/* Opening Stock Form */}
      {showOS && createdSku && (
        <OpeningStockModal
          sku={createdSku.sku_code}
          description={createdSku.description}
          uom={createdSku.uom}
          onClose={handleOSClose}
        />
      )}
    </>
  )
}
