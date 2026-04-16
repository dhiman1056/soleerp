import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Modal  from '../../components/common/Modal.jsx'
import Loader from '../../components/common/Loader.jsx'
import { useCreateWorkOrder }  from '../../hooks/useWorkOrders.js'
import { useStockSummaryQuery } from '../../hooks/useInventory.js'
import { useSizesQuery }        from '../../hooks/useSizes.js'
import { useBOMsQuery, useBOMQuery } from '../../hooks/useBOM.js'
import { useLocations }         from '../../hooks/useLocations.js'
import { formatCurrency }       from '../../utils/formatCurrency.js'
import { today }                from '../../utils/formatDate.js'
import { WO_TYPES, WO_TYPE_LABELS, WO_TO_BOM_TYPE } from '../../utils/constants.js'

// ── BOM Row component (one row in the multi-BOM table) ─────────────────────────
function BomRow({ index, row, boms, bomsLoading, onUpdate, onRemove, canRemove }) {
  const selectedBom = boms.find(b => String(b.id) === String(row.bom_id))
  return (
    <tr className="border-b border-gray-100 last:border-none">
      <td className="px-3 py-2">
        {bomsLoading ? (
          <span className="text-xs text-gray-400">Loading BOMs…</span>
        ) : (
          <select
            value={row.bom_id}
            onChange={e => onUpdate(index, 'bom_id', e.target.value)}
            className="input-field py-1.5 text-sm"
          >
            <option value="">— Choose BOM —</option>
            {boms.map(b => (
              <option key={b.id} value={b.id}>
                {b.bom_code} — {b.product_name} ({b.output_sku})
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-gray-500 font-mono">
        {selectedBom?.product_name || '—'}
      </td>
      <td className="px-3 py-2 w-28">
        <input
          type="number"
          min="1"
          step="1"
          value={row.planned_qty}
          onChange={e => onUpdate(index, 'planned_qty', e.target.value)}
          className="input-field py-1.5 text-sm text-right tabular-nums"
          placeholder="0"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="text-red-400 hover:text-red-600 disabled:opacity-30 text-lg leading-none"
          title="Remove row"
        >×</button>
      </td>
    </tr>
  )
}

// ── Main WorkOrderForm ──────────────────────────────────────────────────────────
export default function WorkOrderForm({ isOpen, onClose }) {
  const [selectedType, setSelectedType] = useState(null)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: { wo_date: today(), notes: '' },
  })

  const watchedDate = watch('wo_date')
  const createMut   = useCreateWorkOrder()

  // ── Multi-BOM state ───────────────────────────────────────────────────────────
  const [bomLines, setBomLines] = useState([{ bom_id: '', planned_qty: 50 }])

  const addBomLine    = () => setBomLines(prev => [...prev, { bom_id: '', planned_qty: 0 }])
  const removeBomLine = (i) => setBomLines(prev => prev.filter((_, idx) => idx !== i))
  const updateBomLine = (i, field, value) =>
    setBomLines(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))

  // ── Location dropdowns ────────────────────────────────────────────────────────
  const { data: locationsRaw } = useLocations()
  const allLocations = Array.isArray(locationsRaw) ? locationsRaw : []
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId,   setToLocationId]   = useState('')

  // ── WO Type → Location auto-mapping ──────────────────────────────────────────
  const WO_TYPE_LOCATIONS = {
    RM_TO_SF: { from: 'Raw Material Store', to: 'SF-WIP Store' },
    SF_TO_FG: { from: 'Semi-Finished Store', to: 'FG-WIP Store' },
    RM_TO_FG: { from: 'Raw Material Store', to: 'FG-WIP Store' },
  }

  useEffect(() => {
    if (selectedType && allLocations.length > 0) {
      const locMap = WO_TYPE_LOCATIONS[selectedType]
      if (locMap) {
        const fromLoc = allLocations.find(l => l.location_name === locMap.from)
        const toLoc   = allLocations.find(l => l.location_name === locMap.to)
        if (fromLoc) setFromLocationId(String(fromLoc.id))
        if (toLoc)   setToLocationId(String(toLoc.id))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, allLocations.length])

  // ── Sizes ─────────────────────────────────────────────────────────────────────
  const { data: sizesRaw } = useSizesQuery({ is_active: 'true' })
  const activeSizes = Array.isArray(sizesRaw) ? sizesRaw : []
  const [useSizeBreakup, setUseSizeBreakup] = useState(false)
  const [sizeBreakupMap, setSizeBreakupMap] = useState({})

  // ── BOMs filtered by WO type ──────────────────────────────────────────────────
  const bomType = selectedType ? (WO_TO_BOM_TYPE[selectedType] ?? null) : null
  const { data: bomsRaw, isLoading: bomsLoading } = useBOMsQuery(
    bomType ? { bom_type: bomType, is_active: 'true', limit: 200 } : {}
  )
  const boms = Array.isArray(bomsRaw) ? bomsRaw : []

  // ── Stock summary ─────────────────────────────────────────────────────────────
  const { data: stockRaw } = useStockSummaryQuery()
  const stockSummary = Array.isArray(stockRaw) ? stockRaw : []

  // ── Fetch detail for each selected BOM (for stock check) ──────────────────────
  // Only check first BOM for stock (multi-BOM stock check is aggregated below)
  const firstBomId = bomLines[0]?.bom_id ? Number(bomLines[0].bom_id) : null
  const { data: firstBomDetail } = useBOMQuery(firstBomId)
  // Support both .components (new) and .lines (legacy) field names
  const firstBomComponents = Array.isArray(firstBomDetail?.components)
    ? firstBomDetail.components
    : Array.isArray(firstBomDetail?.lines)
    ? firstBomDetail.lines
    : []

  // ── Total planned qty ─────────────────────────────────────────────────────────
  const totalPlannedQty = useMemo(() => {
    if (useSizeBreakup) {
      return Object.values(sizeBreakupMap).reduce((s, v) => s + (parseInt(v) || 0), 0)
    }
    return bomLines.reduce((s, row) => s + (parseFloat(row.planned_qty) || 0), 0)
  }, [useSizeBreakup, sizeBreakupMap, bomLines])

  // ── Stock check (first BOM components × their planned qty) ───────────────────
  const firstBomQty = useSizeBreakup
    ? Object.values(sizeBreakupMap).reduce((s, v) => s + (parseInt(v) || 0), 0)
    : parseFloat(bomLines[0]?.planned_qty) || 0

  const isInsufficient = firstBomComponents.some(l => {
    const required  = (Number(l.consume_qty) || 0) * firstBomQty
    const available = Number(stockSummary.find(s => s.sku_code === l.input_sku)?.current_qty) || 0
    return available < required
  })

  // ── Reset when modal opens ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setSelectedType(null)
      reset({ wo_date: today(), notes: '' })
      setBomLines([{ bom_id: '', planned_qty: 50 }])
      setFromLocationId('')
      setToLocationId('')
      setUseSizeBreakup(false)
      setSizeBreakupMap({})
    }
  }, [isOpen, reset])

  // Reset BOM lines when type changes
  useEffect(() => {
    setBomLines([{ bom_id: '', planned_qty: 50 }])
  }, [selectedType])

  // ── Submit ────────────────────────────────────────────────────────────────────
  const onSubmit = (values) => {
    const validBoms = bomLines
      .filter(row => row.bom_id && parseFloat(row.planned_qty) > 0)
      .map(row => ({ bom_id: parseInt(row.bom_id), planned_qty: parseFloat(row.planned_qty) }))

    if (validBoms.length === 0) {
      alert('Please add at least one BOM with a planned quantity.')
      return
    }

    const finalBreakup = []
    if (useSizeBreakup) {
      Object.entries(sizeBreakupMap).forEach(([sizeCode, qty]) => {
        if (parseInt(qty) > 0) finalBreakup.push({ sizeCode, plannedQty: parseInt(qty) })
      })
    }

    const fromLoc = allLocations.find(l => String(l.id) === String(fromLocationId))
    const toLoc   = allLocations.find(l => String(l.id) === String(toLocationId))

    createMut.mutate(
      {
        boms:             validBoms,
        wo_date:          values.wo_date,
        wo_type:          selectedType,
        from_location_id: fromLocationId ? parseInt(fromLocationId) : undefined,
        to_location_id:   toLocationId   ? parseInt(toLocationId)   : undefined,
        from_store:       fromLoc?.location_name || '',
        to_store:         toLoc?.location_name   || '',
        notes:            values.notes || null,
        sizeBreakup:      finalBreakup,
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
      size="xl"
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
          {WO_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                selectedType === type
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

      {/* ── Step 2 onwards: shown only after type selected ── */}
      {selectedType && (
        <form id="wo-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="h-px bg-gray-100" />
          <p className="label">Step 2 — Add BOMs (multiple allowed)</p>

          {/* Multi-BOM table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">BOM</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 w-28">Planned Qty</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {bomLines.map((row, i) => (
                  <BomRow
                    key={i}
                    index={i}
                    row={row}
                    boms={boms}
                    bomsLoading={bomsLoading}
                    onUpdate={updateBomLine}
                    onRemove={removeBomLine}
                    canRemove={bomLines.length > 1}
                  />
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={addBomLine}
                      className="text-xs text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1"
                    >
                      <span className="text-base leading-none">+</span> Add BOM Row
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-gray-600 col-span-2">
                    Total Planned Qty:
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900 tabular-nums text-sm">
                    {useSizeBreakup
                      ? Object.values(sizeBreakupMap).reduce((s, v) => s + (parseInt(v) || 0), 0)
                      : bomLines.reduce((s, r) => s + (parseFloat(r.planned_qty) || 0), 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* No BOMs found warning */}
          {!bomsLoading && boms.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No active BOMs found for type "{WO_TO_BOM_TYPE[selectedType]}". Create a BOM first.
            </p>
          )}

          {/* Production Qty — size breakup (for single BOM mode) */}
          {bomLines.length === 1 && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <label className="label m-0 text-gray-700 text-xs uppercase tracking-wide">Qty Mode</label>
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
              {useSizeBreakup && (
                activeSizes.length === 0 ? (
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
                                onChange={e => setSizeBreakupMap(p => ({ ...p, [s.size_code]: e.target.value }))}
                                className="w-full px-2 py-1 text-xs text-center border-b-2 border-transparent focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right font-bold text-gray-800 bg-gray-50 tabular-nums">
                            {Object.values(sizeBreakupMap).reduce((s, v) => s + (parseInt(v) || 0), 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}

          <div className="h-px bg-gray-100" />
          <p className="label">Step 3 — Locations &amp; Date</p>

          <div className="grid grid-cols-2 gap-4">
            {/* From Location */}
            <div>
              <label className="label">From Location</label>
              <select
                value={fromLocationId}
                onChange={e => setFromLocationId(e.target.value)}
                className="input-field"
              >
                <option value="">— Select —</option>
                {allLocations.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.location_name}
                  </option>
                ))}
              </select>
              {fromLocationId && (
                <p className="text-xs text-blue-600 mt-1">
                  Auto-set based on WO type. Override if needed.
                </p>
              )}
            </div>

            {/* To Location */}
            <div>
              <label className="label">To Location</label>
              <select
                value={toLocationId}
                onChange={e => setToLocationId(e.target.value)}
                className="input-field"
              >
                <option value="">— Select —</option>
                {allLocations.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.location_name}
                  </option>
                ))}
              </select>
            </div>

            {/* WO Date */}
            <div>
              <label className="label">WO Date *</label>
              <input type="date" {...register('wo_date', { required: true })} className="input-field" />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes</label>
              <input {...register('notes')} placeholder="Optional notes…" className="input-field" />
            </div>
          </div>

          {/* ── Stock Check preview (first BOM) ── */}
          {firstBomComponents.length > 0 && (
            <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <p className="text-xs font-semibold text-blue-700 mb-3 uppercase tracking-wide">
                Stock Check — {firstBomDetail?.bom_code} Components
              </p>

              {isInsufficient && (
                <div className="mb-3 px-3 py-2 bg-amber-100 text-amber-800 text-xs font-semibold rounded border border-amber-200">
                  ⚠️ Some materials are low — WO can still be created, but inventory will show a deficit.
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
                  {firstBomComponents.map((l, i) => {
                    const required  = (Number(l.consume_qty) || 0) * firstBomQty
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
                            : <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">Low</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="mt-2 pt-2 border-t border-blue-100 flex justify-end">
                <span className="text-xs font-bold text-blue-900">
                  Est. Cost: {formatCurrency((Number(firstBomDetail?.total_cost) || 0) * firstBomQty)}
                </span>
              </div>
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}
