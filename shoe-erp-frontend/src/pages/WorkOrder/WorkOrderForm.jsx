import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Modal  from '../../components/common/Modal.jsx'
import { useCreateWorkOrder }  from '../../hooks/useWorkOrders.js'
import { useStockSummaryQuery } from '../../hooks/useInventory.js'
import { useProductsWithBom } from '../../hooks/useBOM.js'
import { useLocations }         from '../../hooks/useLocations.js'
import { formatCurrency }       from '../../utils/formatCurrency.js'
import { today }                from '../../utils/formatDate.js'

const WO_TYPE_OPTIONS = [
  { value: 'RM_TO_SF', label: 'Semi-Finished', sub: 'RM → SF' },
  { value: 'SF_TO_FG', label: 'Finished Goods', sub: 'SF → FG' },
]

const WO_TYPE_LOCATIONS = {
  RM_TO_SF: { from: 'Raw Material Store', to: 'SF-WIP Store' },
  SF_TO_FG: { from: 'Semi-Finished Store', to: 'FG-WIP Store' },
}

const SIZE_CHART_SIZES = {
  INFANT: ['2','3','5','6','7','8','9','10','11','12'],
  KIDS: ['6','7','8','9','10','11','11.5','12','12.5','13','1','2','3','4','5','6'],
  LADIES: ['3','4','5','6','7','8','9'],
  MEN: ['6','7','8','9','10','11','12'],
}

function BomRow({ index, row, productsWithBom, bomsLoading, onUpdate, onRemove, canRemove }) {
  const selectedProduct = productsWithBom.find(p => p.sku_code === row.sku_code)
  const sizes = SIZE_CHART_SIZES[row.size_chart] || []
  const totalQty = Object.values(row.size_breakup || {}).reduce((s,v) => s + (parseInt(v)||0), 0)

  return (
    <>
      <tr className="border-b border-gray-100 last:border-none hover:bg-gray-50/50">
        <td className="px-3 py-3">
          {bomsLoading ? (
            <span className="text-xs text-gray-400">Loading Products…</span>
          ) : (
            <select
              value={row.sku_code}
              onChange={e => {
                const product = productsWithBom.find(p => p.sku_code === e.target.value)
                onUpdate(index, 'sku_code', e.target.value)
                onUpdate(index, 'bom_id', product?.bom_id || '')
                onUpdate(index, 'bom_code', product?.bom_code || '')
                onUpdate(index, 'size_chart', product?.size_chart || '')
                onUpdate(index, 'total_cost', product?.total_cost || 0)
                onUpdate(index, 'components', product?.components || [])
                onUpdate(index, 'size_breakup', {})
              }}
              className="input-field py-1.5 text-sm"
            >
              <option value="">— Choose Product SKU —</option>
              {productsWithBom.map(p => (
                <option key={p.sku_code} value={p.sku_code}>
                  {p.sku_code} — {p.description}
                </option>
              ))}
            </select>
          )}
        </td>
        <td className="px-3 py-3 text-xs text-gray-500 font-mono">
          {selectedProduct?.description || '—'}
        </td>
        <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-800">
          {totalQty}
        </td>
        <td className="px-3 py-3 text-center">
          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={!canRemove}
            className="text-red-400 hover:text-red-600 disabled:opacity-30 text-xl leading-none font-bold"
            title="Remove row"
          >×</button>
        </td>
      </tr>
      {sizes.length > 0 && (
        <tr className="border-b-2 border-gray-200">
          <td colSpan={4} className="px-3 py-3 bg-blue-50/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-blue-700">
                Size Breakup ({row.size_chart})
              </p>
              <p className="text-[11px] font-bold text-gray-600">
                Row Total: <span className="text-gray-900 tabular-nums">{totalQty}</span> pairs
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {sizes.map(size => (
                <div key={size} className="text-center bg-white border border-gray-200 rounded-md p-1 shadow-sm">
                  <p className="text-[10px] text-gray-500 mb-1 font-bold">UK {size}</p>
                  <input
                    type="number" min="0" step="1" placeholder="0"
                    value={row.size_breakup?.[size] || ''}
                    onChange={e => {
                      const updated = {...row.size_breakup, [size]: e.target.value}
                      onUpdate(index, 'size_breakup', updated)
                    }}
                    className="w-14 px-1 py-1 text-xs text-center border rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function WorkOrderForm({ isOpen, onClose }) {
  const [selectedType, setSelectedType] = useState(null)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: { wo_date: today(), notes: '' },
  })

  const createMut   = useCreateWorkOrder()

  const [bomLines, setBomLines] = useState([{ 
    sku_code: '', bom_id: '', bom_code: '', 
    size_chart: '', total_cost: 0, components: [],
    size_breakup: {}
  }])

  const addBomLine    = () => setBomLines(prev => [...prev, { sku_code: '', bom_id: '', bom_code: '', size_chart: '', total_cost: 0, components: [], size_breakup: {} }])
  const removeBomLine = (i) => setBomLines(prev => prev.filter((_, idx) => idx !== i))
  const updateBomLine = (i, field, value) =>
    setBomLines(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))

  const { data: locationsRaw } = useLocations()
  const allLocations = Array.isArray(locationsRaw) ? locationsRaw : []
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId,   setToLocationId]   = useState('')

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

  const bomTypeForQuery = selectedType === 'RM_TO_SF' ? 'SF' : selectedType === 'SF_TO_FG' ? 'FG' : null
  const { data: productsWithBomRaw = [], isLoading: bomsLoading } = useProductsWithBom(bomTypeForQuery)
  const productsWithBom = Array.isArray(productsWithBomRaw) ? productsWithBomRaw : []

  const { data: stockRaw } = useStockSummaryQuery()
  const stockSummary = Array.isArray(stockRaw) ? stockRaw : []

  const totalPlannedQty = useMemo(() => {
    return bomLines.reduce((total, row) => {
      const rowQty = Object.values(row.size_breakup || {}).reduce((s, v) => s + (parseInt(v) || 0), 0)
      return total + rowQty
    }, 0)
  }, [bomLines])

  const totalEstCost = useMemo(() => {
    return bomLines.reduce((total, row) => {
      const rowQty = Object.values(row.size_breakup || {}).reduce((s, v) => s + (parseInt(v) || 0), 0)
      return total + (parseFloat(row.total_cost) || 0) * rowQty
    }, 0)
  }, [bomLines])

  const insufficientItems = useMemo(() => {
    const requiredMap = {}
    bomLines.forEach(row => {
      const rowQty = Object.values(row.size_breakup || {}).reduce((s, v) => s + (parseInt(v) || 0), 0)
      if (rowQty > 0 && Array.isArray(row.components)) {
        row.components.forEach(comp => {
          if (!requiredMap[comp.input_sku]) {
            requiredMap[comp.input_sku] = {
              sku_code: comp.input_sku,
              required: 0,
              uom: comp.uom,
              supplier_name: comp.supplier_name
            }
          }
          requiredMap[comp.input_sku].required += (Number(comp.consume_qty) || 0) * rowQty
        })
      }
    })

    const shortfalls = []
    Object.values(requiredMap).forEach(item => {
      const available = stockSummary.find(s => s.sku_code === item.sku_code)?.current_qty || 0
      const shortfall = item.required - available
      if (shortfall > 0) {
        shortfalls.push({ ...item, shortfall })
      }
    })
    return shortfalls
  }, [bomLines, stockSummary])

  useEffect(() => {
    if (isOpen) {
      setSelectedType(null)
      reset({ wo_date: today(), notes: '' })
      setBomLines([{ sku_code: '', bom_id: '', bom_code: '', size_chart: '', total_cost: 0, components: [], size_breakup: {} }])
      setFromLocationId('')
      setToLocationId('')
    }
  }, [isOpen, reset])

  useEffect(() => {
    setBomLines([{ sku_code: '', bom_id: '', bom_code: '', size_chart: '', total_cost: 0, components: [], size_breakup: {} }])
  }, [selectedType])

  const onSubmit = (values) => {
    const validBoms = bomLines
      .filter(row => row.bom_id && Object.values(row.size_breakup || {}).reduce((s,v) => s + (parseInt(v)||0), 0) > 0)
      .map(row => ({
        bom_id: parseInt(row.bom_id),
        sku_code: row.sku_code,
        planned_qty: Object.values(row.size_breakup || {}).reduce((s,v) => s + (parseInt(v)||0), 0),
        size_breakup: row.size_breakup
      }))

    if (validBoms.length === 0) {
      alert('Please add at least one Product with a planned quantity > 0.')
      return
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
      },
      { onSuccess: onClose }
    )
  }

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
      <div className="mb-6">
        <p className="label mb-3">Step 1 — Select Work Order Type</p>
        <div className="grid grid-cols-2 gap-4">
          {WO_TYPE_OPTIONS.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => setSelectedType(type.value)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                selectedType === type.value
                  ? 'border-gray-900 bg-gray-900 text-white shadow-lg border-transparent transform scale-[1.02]'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:shadow-sm'
              }`}
            >
              <p className="text-sm font-bold">{type.label}</p>
              <p className="text-xs mt-1 opacity-60 font-mono">{type.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedType && (
        <form id="wo-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="h-px bg-gray-100" />
          <p className="label">Step 2 — Add Products & Size Quantities</p>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 tracking-wide uppercase">Product SKU</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 tracking-wide uppercase">Description</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-gray-600 w-28 tracking-wide uppercase">Total Qty</th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {bomLines.map((row, i) => (
                  <BomRow
                    key={i}
                    index={i}
                    row={row}
                    productsWithBom={productsWithBom}
                    bomsLoading={bomsLoading}
                    onUpdate={updateBomLine}
                    onRemove={removeBomLine}
                    canRemove={bomLines.length > 1}
                  />
                ))}
              </tbody>
              <tfoot className="bg-white border-t border-gray-200">
                <tr>
                  <td className="px-3 py-3" colSpan={2}>
                    <button
                      type="button"
                      onClick={addBomLine}
                      className="text-xs text-blue-600 font-bold hover:text-blue-800 hover:underline flex items-center gap-1 transition-all"
                    >
                      <span className="text-lg leading-none">+</span> Add Product
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-gray-900 tabular-nums text-base bg-blue-50/50">
                    {totalPlannedQty}
                  </td>
                  <td className="px-3 py-3 bg-blue-50/50" />
                </tr>
              </tfoot>
            </table>
          </div>

          {!bomsLoading && productsWithBom.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-lg">⚠️</span> No products found with active BOMs for this workflow. Create a BOM first.
            </p>
          )}

          {insufficientItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm animate-fade-in">
              <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                <span className="text-lg">🚨</span> Insufficient Stock — Create Purchase Orders:
              </p>
              <div className="space-y-1 mt-3">
                {insufficientItems.map(item => (
                  <div key={item.sku_code} className="text-xs text-red-600 flex justify-between border-b border-red-100 pb-1 last:border-0">
                    <span>
                      <span className="font-bold text-red-800">{item.supplier_name || 'Unknown Supplier'}</span>
                      <span className="mx-2 text-red-300">|</span>
                      {item.sku_code}
                    </span>
                    <span className="font-semibold">Needs {item.shortfall.toFixed(3)} {item.uom} more</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-px bg-gray-100" />
          <div className="flex items-center justify-between">
            <p className="label m-0">Step 3 — Locations & Date</p>
            <span className="text-xs font-bold text-blue-900 bg-blue-50 px-3 py-1.5 rounded-full shadow-sm border border-blue-100">
              Est. Total Cost: {formatCurrency(totalEstCost)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="label text-gray-600">From Location</label>
              <select
                value={fromLocationId}
                onChange={e => setFromLocationId(e.target.value)}
                className="input-field border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— Select —</option>
                {allLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.location_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-gray-600">To Location</label>
              <select
                value={toLocationId}
                onChange={e => setToLocationId(e.target.value)}
                className="input-field border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— Select —</option>
                {allLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.location_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-gray-600">WO Date *</label>
              <input type="date" {...register('wo_date', { required: true })} className="input-field shadow-sm" />
            </div>

            <div>
              <label className="label text-gray-600">Notes</label>
              <input {...register('notes')} placeholder="Optional notes…" className="input-field shadow-sm" />
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
