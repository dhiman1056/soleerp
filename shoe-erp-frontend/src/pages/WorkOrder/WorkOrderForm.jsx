import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Modal  from '../../components/common/Modal.jsx'
import Loader from '../../components/common/Loader.jsx'
import { useCreateWorkOrder }  from '../../hooks/useWorkOrders.js'
import { useStockSummaryQuery } from '../../hooks/useInventory.js'
import { useSizesQuery }        from '../../hooks/useSizes.js'
import { useBOMsQuery, useBOMQuery } from '../../hooks/useBOM.js'
import { formatCurrency }       from '../../utils/formatCurrency.js'
import { today }                from '../../utils/formatDate.js'
import { WO_TYPES, WO_TYPE_LABELS, WO_TO_BOM_TYPE } from '../../utils/constants.js'

const STORE_OPTIONS = [
  'Raw Material Store',
  'WIP Store',
  'Stitching & Cutting Floor',
  'Assembly Floor',
  'Finished Goods Warehouse',
]

export default function WorkOrderForm({ isOpen, onClose }) {
  const [selectedType, setSelectedType] = useState(null)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      bom_id:      '',
      wo_date:     today(),
      planned_qty: 50,
      from_store:  '',
      to_store:    '',
      notes:       '',
    },
  })

  const selectedBomId = watch('bom_id')
  const watchedQty    = watch('planned_qty')
  const createMut     = useCreateWorkOrder()

  // ── Sizes (now returns array directly) ───────────────────────────────────────
  const { data: sizesRaw } = useSizesQuery({ is_active: 'true' })
  const activeSizes = Array.isArray(sizesRaw) ? sizesRaw : []

  const [useSizeBreakup, setUseSizeBreakup] = useState(false)
  const [sizeBreakupMap, setSizeBreakupMap] = useState({})

  // ── BOMs filtered by selected WO type ────────────────────────────────────────
  // useBOMsQuery now returns the array directly (res.data.data extracted in queryFn)
  const bomType = selectedType ? (WO_TO_BOM_TYPE[selectedType] ?? null) : null

  const { data: bomsRaw, isLoading: bomsLoading } = useBOMsQuery(
    bomType
      ? { bom_type: bomType, is_active: 'true', limit: 200 }
      : {},
  )
  // Safe array — hook returns array directly, but guard defensively
  const boms = Array.isArray(bomsRaw) ? bomsRaw : []

  // ── Selected BOM detail ───────────────────────────────────────────────────────
  // useBOMQuery returns the BOM object directly (res.data.data)
  const { data: selectedBomRaw } = useBOMQuery(selectedBomId ? Number(selectedBomId) : null)
  const selectedBom = (selectedBomRaw && typeof selectedBomRaw === 'object' && !Array.isArray(selectedBomRaw))
    ? selectedBomRaw
    : null

  // ── Stock summary ─────────────────────────────────────────────────────────────
  // useStockSummaryQuery now returns array directly
  const { data: stockRaw } = useStockSummaryQuery()
  const stockSummary = Array.isArray(stockRaw) ? stockRaw : []

  // ── Computed planned qty ──────────────────────────────────────────────────────
  const plannedQty = useMemo(() => {
    if (useSizeBreakup) {
      return Object.values(sizeBreakupMap).reduce((sum, val) => sum + (parseInt(val) || 0), 0)
    }
    return Number(watchedQty) || 0
  }, [useSizeBreakup, sizeBreakupMap, watchedQty])

  // ── Stock check helper ────────────────────────────────────────────────────────
  const calcRequired = (l) => {
    if (useSizeBreakup && selectedBom?.sizeVariants && Object.keys(sizeBreakupMap).length > 0) {
      let req = 0
      Object.entries(sizeBreakupMap).forEach(([sCode, qty]) => {
        const vQty = selectedBom.sizeVariants[sCode]?.[l.input_sku]
        const unit = vQty !== undefined ? Number(vQty) : Number(l.consume_qty) || 0
        req += unit * (parseInt(qty) || 0)
      })
      return req
    }
    return (Number(l.consume_qty) || 0) * plannedQty
  }

  const bomLines = Array.isArray(selectedBom?.components) ? selectedBom.components : []

  const isInsufficient = bomLines.some(l => {
    const required  = calcRequired(l)
    const available = Number(stockSummary.find(s => s.sku_code === l.input_sku)?.current_qty) || 0
    return available < required
  })

  // ── Reset when modal opens ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setSelectedType(null)
      reset({ bom_id: '', wo_date: today(), planned_qty: 50, from_store: '', to_store: '', notes: '' })
      setUseSizeBreakup(false)
      setSizeBreakupMap({})
    }
  }, [isOpen, reset])

  // ── Submit ────────────────────────────────────────────────────────────────────
  const onSubmit = (values) => {
    const finalBreakup = []
    if (useSizeBreakup) {
      Object.entries(sizeBreakupMap).forEach(([sizeCode, qty]) => {
        if (parseInt(qty) > 0) finalBreakup.push({ sizeCode, plannedQty: parseInt(qty) })
      })
    }

    createMut.mutate(
      {
        bom_id:      parseInt(values.bom_id),
        wo_date:     values.wo_date,
        planned_qty: plannedQty,
        wo_type:     selectedType,
        from_store:  values.from_store,
        to_store:    values.to_store,
        notes:       values.notes || null,
        sizeBreakup: finalBreakup,
      },
      { onSuccess: onClose },
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Work Order"
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="submit"
            form="wo-form"
            className="btn-primary"
            disabled={!selectedType || createMut.isPending}
          >
            {createMut.isPending ? 'Creating…' : 'Create Work Order'}
          </button>
        </>
      }
    >
      {/* ── Step 1: Select WO Type ── */}
      <div className="mb-6">
        <p className="label mb-3">Step 1 — Select Work Order Type</p>
        <div className="grid grid-cols-3 gap-3">
          {(Array.isArray(WO_TYPES) ? WO_TYPES : []).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => { setSelectedType(type); setValue('bom_id', '') }}
              className={`p-4 rounded-xl border-2 text-center transition-all
                ${selectedType === type
                  ? 'border-gray-900 bg-gray-900 text-white shadow-lg'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                }`}
            >
              <p className="text-xs font-bold">{type.replace(/_/g, ' → ')}</p>
              <p className={`text-xs mt-1 ${selectedType === type ? 'text-gray-300' : 'text-gray-400'}`}>
                {WO_TYPE_LABELS[type]}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Step 2: Form details (shown only after type is selected) ── */}
      {selectedType && (
        <form id="wo-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="h-px bg-gray-100 my-2" />
          <p className="label">Step 2 — Fill Work Order Details</p>

          <div className="grid grid-cols-2 gap-4">
            {/* BOM select */}
            <div className="col-span-2">
              <label className="label">Select BOM *</label>
              {bomsLoading ? (
                <Loader size="sm" label="Loading BOMs…" />
              ) : boms.length === 0 ? (
                <p className="text-xs text-amber-600 py-2">
                  No active BOMs found for type "{WO_TO_BOM_TYPE[selectedType]}". Create a BOM first.
                </p>
              ) : (
                <select
                  {...register('bom_id', { required: 'Please select a BOM' })}
                  className={`input-field ${errors.bom_id ? 'input-error' : ''}`}
                >
                  <option value="">— Choose BOM —</option>
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bom_code} — {b.product_name} ({b.output_sku})
                    </option>
                  ))}
                </select>
              )}
              {errors.bom_id && <p className="text-red-500 text-xs mt-1">{errors.bom_id.message}</p>}
            </div>

            {/* Date */}
            <div>
              <label className="label">WO Date *</label>
              <input type="date" {...register('wo_date', { required: true })} className="input-field" />
            </div>

            {/* Production Quantity */}
            <div className="col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="label m-0 text-gray-700">Production Quantity Details</label>
                <div className="flex items-center gap-2 bg-white rounded-md p-1 shadow-sm border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setUseSizeBreakup(false)}
                    className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${!useSizeBreakup ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Total Qty
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseSizeBreakup(true)}
                    className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${useSizeBreakup ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Size Breakup
                  </button>
                </div>
              </div>

              {!useSizeBreakup ? (
                <div className="w-1/3">
                  <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold tracking-wide">Overall Planned Qty</p>
                  <input
                    type="number" min="1" step="1"
                    {...register('planned_qty', {
                      required:      !useSizeBreakup,
                      min:           { value: 1, message: 'Must be > 0' },
                      valueAsNumber: true,
                    })}
                    className={`input-field ${errors.planned_qty ? 'input-error' : ''}`}
                  />
                  {errors.planned_qty && <p className="text-red-500 text-xs mt-1">{errors.planned_qty.message}</p>}
                </div>
              ) : activeSizes.length === 0 ? (
                <p className="text-xs text-amber-600">No active sizes configured. Add sizes in Settings → Sizes.</p>
              ) : (
                <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {activeSizes.map(s => (
                          <th key={s.size_code} className="px-2 py-2 text-center text-xs text-gray-600 font-bold uppercase">
                            {s.size_code}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right text-xs bg-gray-100 font-bold uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {activeSizes.map(s => (
                          <td key={s.size_code} className="px-2 py-2 border-r border-gray-100 last:border-0">
                            <input
                              type="number" min="0" step="1" placeholder="0"
                              value={sizeBreakupMap[s.size_code] || ''}
                              onChange={(e) => setSizeBreakupMap(p => ({ ...p, [s.size_code]: e.target.value }))}
                              className="w-full px-2 py-1 text-xs text-center border-b-2 border-transparent focus:border-blue-500 focus:outline-none transition-colors"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-bold text-gray-800 bg-gray-50 tabular-nums">
                          {plannedQty}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* From Store */}
            <div>
              <label className="label">From Store *</label>
              <select
                {...register('from_store', { required: 'From store is required' })}
                className={`input-field ${errors.from_store ? 'input-error' : ''}`}
              >
                <option value="">— Select —</option>
                {STORE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              {errors.from_store && <p className="text-red-500 text-xs mt-1">{errors.from_store.message}</p>}
            </div>

            {/* To Store */}
            <div>
              <label className="label">To Store *</label>
              <select
                {...register('to_store', { required: 'To store is required' })}
                className={`input-field ${errors.to_store ? 'input-error' : ''}`}
              >
                <option value="">— Select —</option>
                {STORE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              {errors.to_store && <p className="text-red-500 text-xs mt-1">{errors.to_store.message}</p>}
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="label">Notes</label>
              <input {...register('notes')} placeholder="Optional notes…" className="input-field" />
            </div>
          </div>

          {/* ── BOM Component Stock Preview ── */}
          {bomLines.length > 0 && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <p className="text-xs font-semibold text-blue-700 mb-3 uppercase tracking-wide">
                Stock Check — Component Preview for {selectedBom?.bom_code}
              </p>

              {isInsufficient && (
                <div className="mb-3 px-3 py-2 bg-amber-100 text-amber-800 text-xs font-semibold rounded border border-amber-200">
                  ⚠️ Some materials are low — Work Order can still be created, but inventory will show a deficit.
                </div>
              )}

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left pb-2">Material SKU</th>
                    <th className="text-left pb-2">Description</th>
                    <th className="text-right pb-2">Required Qty</th>
                    <th className="text-right pb-2">Available Qty</th>
                    <th className="text-center pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bomLines.map((l, i) => {
                    const required  = calcRequired(l)
                    const available = Number(stockSummary.find(s => s.sku_code === l.input_sku)?.current_qty) || 0
                    const isOk      = available >= required
                    return (
                      <tr key={i} className="border-t border-blue-100">
                        <td className="py-2 pr-2 font-mono font-semibold text-gray-800">{l.input_sku}</td>
                        <td className="py-2 pr-2 text-gray-600 line-clamp-1">{l.description}</td>
                        <td className="py-2 text-right tabular-nums">{required.toFixed(3)}</td>
                        <td className="py-2 text-right tabular-nums">{available.toFixed(3)}</td>
                        <td className="py-2 text-center">
                          {isOk
                            ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">OK</span>
                            : <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">Insufficient</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="mt-2 pt-2 border-t border-blue-100 flex justify-end">
                <span className="text-xs font-bold text-blue-900">
                  Est. Total Cost: {formatCurrency((Number(selectedBom?.total_cost) || 0) * plannedQty)}
                </span>
              </div>
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}
