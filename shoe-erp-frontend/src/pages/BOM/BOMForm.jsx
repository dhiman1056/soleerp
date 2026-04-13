import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import Loader from '../../components/common/Loader.jsx'
import { useBOMQuery, useCreateBOM, useUpdateBOM } from '../../hooks/useBOM.js'
import { useProductsQuery }      from '../../hooks/useProducts.js'
import { useRawMaterialsQuery }  from '../../hooks/useRawMaterials.js'
import { useSizesQuery }         from '../../hooks/useSizes.js'
import { formatCurrency }        from '../../utils/formatCurrency.js'
import { BOM_TYPES, BOM_TYPE_LABELS, BOM_OUTPUT_PRODUCT_TYPE, UOM_OPTIONS } from '../../utils/constants.js'

const emptyLine = { input_sku: '', description: '', consume_qty: 1, uom: 'PCS', rate_at_bom: 0 }

export default function BOMForm() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const isEdit   = !!id

  // ── Data fetching ────────────────────────────────────────────────────────────
  // All hooks return the actual array/object directly (res.data.data extracted in queryFn)
  const { data: bomData,      isLoading: bomLoading }  = useBOMQuery(id)
  const { data: productsRaw,  isLoading: prodsLoading } = useProductsQuery({ limit: 500, is_active: 'true' })
  const { data: rmRaw,        isLoading: rmLoading }    = useRawMaterialsQuery({ limit: 500, is_active: 'true' })
  const { data: sizesRaw,     isLoading: sizesLoading } = useSizesQuery({ is_active: 'true', limit: 100 })

  // Safe array extraction — hooks return arrays directly, but guard defensively
  const allProducts = Array.isArray(productsRaw) ? productsRaw
    : Array.isArray(productsRaw?.data) ? productsRaw.data
    : []
  const allRMs = Array.isArray(rmRaw) ? rmRaw
    : Array.isArray(rmRaw?.data) ? rmRaw.data
    : []
  const activeSizes = Array.isArray(sizesRaw) ? sizesRaw
    : Array.isArray(sizesRaw?.data) ? sizesRaw.data
    : []

  // ── Size variant state ───────────────────────────────────────────────────────
  const [useSizeVariants, setUseSizeVariants] = useState(false)
  const [sizeVariantsMap, setSizeVariantsMap] = useState({})

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMut = useCreateBOM()
  const updateMut = useUpdateBOM()
  const isBusy    = createMut.isPending || updateMut.isPending

  // ── Form setup ───────────────────────────────────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      bom_code:   '',
      output_sku: '',
      bom_type:   'SF',
      output_qty: 1,
      output_uom: 'PAIR',
      remarks:    '',
      lines: [{ ...emptyLine }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const watchedBomType = watch('bom_type')
  const watchedLines   = watch('lines')
  const safeLines      = Array.isArray(watchedLines) ? watchedLines : []

  // ── Output product dropdown — filtered by BOM type ───────────────────────────
  const outputProducts = useMemo(() => {
    const expectedType = BOM_OUTPUT_PRODUCT_TYPE?.[watchedBomType]
    if (!expectedType) return allProducts
    return allProducts.filter((p) => p.product_type === expectedType)
  }, [allProducts, watchedBomType])

  // Combined SKU list for component lines dropdown (products + raw materials)
  const allInputSKUs = useMemo(() => {
    const seen = new Set()
    const merged = []
    ;[...allProducts, ...allRMs].forEach(item => {
      if (item.sku_code && !seen.has(item.sku_code)) {
        seen.add(item.sku_code)
        merged.push(item)
      }
    })
    return merged
  }, [allProducts, allRMs])

  // ── Total material cost (live) ───────────────────────────────────────────────
  const totalCost = useMemo(() => {
    return safeLines.reduce((sum, l) => {
      return sum + (Number(l.consume_qty) || 0) * (Number(l.rate_at_bom) || 0)
    }, 0)
  }, [safeLines])

  // ── Pre-fill form when editing ───────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !bomData) return
    // useBOMQuery returns the BOM object directly (not { data: bomObj })
    const b = bomData
    reset({
      bom_code:   b.bom_code   || '',
      output_sku: b.output_sku || '',
      bom_type:   b.bom_type   || 'SF',
      output_qty: b.output_qty || 1,
      output_uom: b.output_uom || 'PAIR',
      remarks:    b.remarks    || '',
      lines: Array.isArray(b.lines) && b.lines.length
        ? b.lines.map((l) => ({
            input_sku:   l.input_sku   || '',
            description: l.input_description || '',
            consume_qty: l.consume_qty || 1,
            uom:         l.uom        || 'PCS',
            rate_at_bom: l.rate_at_bom || 0,
          }))
        : [{ ...emptyLine }],
    })

    if (b.sizeVariants && Object.keys(b.sizeVariants).length > 0) {
      setUseSizeVariants(true)
      setSizeVariantsMap(b.sizeVariants)
    } else {
      setUseSizeVariants(false)
      setSizeVariantsMap({})
    }
  }, [isEdit, bomData, reset])

  // ── Auto-fill description, UOM, rate when input_sku is chosen ───────────────
  const handleInputSkuChange = (index, sku) => {
    const rm = allRMs.find((r) => r.sku_code === sku)
    const pm = allProducts.find((p) => p.sku_code === sku)
    if (rm) {
      setValue(`lines.${index}.description`, rm.description || '')
      setValue(`lines.${index}.uom`,         rm.uom         || 'PCS')
      setValue(`lines.${index}.rate_at_bom`, Number(rm.rate) || 0)
    } else if (pm) {
      setValue(`lines.${index}.description`, pm.description || '')
      setValue(`lines.${index}.uom`,         pm.uom         || 'PCS')
      setValue(`lines.${index}.rate_at_bom`, 0)
    }
  }

  // ── Size variant cell change ─────────────────────────────────────────────────
  const handleVariantChange = (sizeCode, sku, val) => {
    setSizeVariantsMap(prev => {
      const cloned = { ...prev }
      if (!cloned[sizeCode]) cloned[sizeCode] = {}
      if (val === '' || isNaN(Number(val))) {
        delete cloned[sizeCode][sku]
      } else {
        cloned[sizeCode][sku] = Number(val)
      }
      return cloned
    })
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit = (values) => {
    const finalSizeVariants = []
    if (useSizeVariants) {
      Object.entries(sizeVariantsMap).forEach(([sizeCode, skusMap]) => {
        Object.entries(skusMap).forEach(([componentSku, consumeQty]) => {
          finalSizeVariants.push({ sizeCode, componentSku, consumeQty })
        })
      })
    }

    const payload = {
      bom_code:   (values.bom_code || '').trim().toUpperCase(),
      output_sku:  values.output_sku,
      bom_type:    values.bom_type,
      output_qty:  Number(values.output_qty) || 1,
      output_uom:  values.output_uom,
      remarks:     values.remarks || null,
      lines: (Array.isArray(values.lines) ? values.lines : []).map((l) => ({
        input_sku:   l.input_sku,
        consume_qty: Number(l.consume_qty)  || 1,
        uom:         l.uom,
        rate_at_bom: Number(l.rate_at_bom) || 0,
      })),
      sizeVariants: finalSizeVariants,
    }

    if (isEdit) {
      updateMut.mutate({ id, ...payload }, { onSuccess: () => navigate('/bom') })
    } else {
      createMut.mutate(payload, { onSuccess: () => navigate('/bom') })
    }
  }

  if (isEdit && bomLoading) return <div className="py-16"><Loader /></div>

  const dropdownsLoading = prodsLoading || rmLoading

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl">

      {/* ── Header section ── */}
      <div className="card p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">BOM Header</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">

          {/* BOM Code */}
          <div>
            <label className="label">BOM Code *</label>
            <input
              {...register('bom_code', {
                required:  'BOM Code is required',
                maxLength: { value: 20, message: 'Max 20 chars' },
              })}
              disabled={isEdit}
              placeholder="e.g. BOM-0001"
              className={`input-field uppercase ${errors.bom_code ? 'input-error' : ''} ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
            />
            {errors.bom_code && <p className="text-red-500 text-xs mt-1">{errors.bom_code.message}</p>}
          </div>

          {/* BOM Type */}
          <div>
            <label className="label">BOM Type *</label>
            <select {...register('bom_type', { required: true })} className="input-field">
              {(Array.isArray(BOM_TYPES) ? BOM_TYPES : []).map((t) => (
                <option key={t} value={t}>{BOM_TYPE_LABELS?.[t] || t}</option>
              ))}
            </select>
          </div>

          {/* Output Product */}
          <div>
            <label className="label">Output Product SKU *</label>
            <select
              {...register('output_sku', { required: 'Output SKU is required' })}
              className={`input-field ${errors.output_sku ? 'input-error' : ''}`}
              disabled={dropdownsLoading}
            >
              <option value="">
                {dropdownsLoading ? 'Loading products…' : '— Select product —'}
              </option>
              {outputProducts.map((p) => (
                <option key={p.sku_code} value={p.sku_code}>
                  {p.sku_code} — {p.description}
                </option>
              ))}
            </select>
            {errors.output_sku && <p className="text-red-500 text-xs mt-1">{errors.output_sku.message}</p>}
            {!dropdownsLoading && outputProducts.length === 0 && (
              <p className="text-amber-600 text-xs mt-1">
                No products found for this BOM type.
              </p>
            )}
          </div>

          {/* Output Qty */}
          <div>
            <label className="label">Output Qty *</label>
            <input
              type="number" step="0.01" min="0.01"
              {...register('output_qty', {
                required:      true,
                min:           { value: 0.01, message: 'Must be > 0' },
                valueAsNumber: true,
              })}
              className={`input-field ${errors.output_qty ? 'input-error' : ''}`}
            />
            {errors.output_qty && <p className="text-red-500 text-xs mt-1">{errors.output_qty.message}</p>}
          </div>

          {/* Output UOM */}
          <div>
            <label className="label">Output UOM *</label>
            <select {...register('output_uom', { required: true })} className="input-field">
              {(Array.isArray(UOM_OPTIONS) ? UOM_OPTIONS : []).map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Remarks */}
          <div>
            <label className="label">Remarks</label>
            <input {...register('remarks')} placeholder="Optional notes…" className="input-field" />
          </div>
        </div>
      </div>

      {/* ── Component Lines ── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Component Lines</h2>
          <button
            type="button"
            onClick={() => append({ ...emptyLine })}
            className="btn-secondary text-xs"
          >
            + Add Row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2 text-left   text-xs font-semibold text-gray-500 uppercase">Input SKU *</th>
                <th className="px-3 py-2 text-left   text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-3 py-2 text-right  text-xs font-semibold text-gray-500 uppercase">Consume Qty *</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">UOM</th>
                <th className="px-3 py-2 text-right  text-xs font-semibold text-gray-500 uppercase">Rate (₹)</th>
                <th className="px-3 py-2 text-right  text-xs font-semibold text-gray-500 uppercase">Value</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const lineVal =
                  (Number(safeLines[index]?.consume_qty) || 0) *
                  (Number(safeLines[index]?.rate_at_bom) || 0)
                return (
                  <tr key={field.id} className="border-b border-gray-50">
                    {/* Input SKU dropdown */}
                    <td className="px-3 py-2">
                      <Controller
                        name={`lines.${index}.input_sku`}
                        control={control}
                        rules={{ required: 'Required' }}
                        render={({ field: f }) => (
                          <select
                            {...f}
                            onChange={(e) => { f.onChange(e); handleInputSkuChange(index, e.target.value) }}
                            disabled={dropdownsLoading}
                            className={`input-field text-xs font-mono ${errors?.lines?.[index]?.input_sku ? 'input-error' : ''}`}
                          >
                            <option value="">
                              {dropdownsLoading ? 'Loading…' : '— Select —'}
                            </option>
                            {/* Raw materials group */}
                            {allRMs.length > 0 && (
                              <optgroup label="Raw Materials">
                                {allRMs.map((r) => (
                                  <option key={r.sku_code} value={r.sku_code}>
                                    {r.sku_code} — {r.description}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {/* Semi-finished products group */}
                            {allProducts.filter(p => p.product_type === 'SEMI_FINISHED').length > 0 && (
                              <optgroup label="Semi-Finished Products">
                                {allProducts
                                  .filter(p => p.product_type === 'SEMI_FINISHED')
                                  .map((p) => (
                                    <option key={p.sku_code} value={p.sku_code}>
                                      {p.sku_code} — {p.description}
                                    </option>
                                  ))}
                              </optgroup>
                            )}
                          </select>
                        )}
                      />
                    </td>
                    {/* Description (auto-filled, read-only) */}
                    <td className="px-3 py-2">
                      <input
                        {...register(`lines.${index}.description`)}
                        readOnly
                        className="input-field text-xs bg-gray-50 text-gray-500 cursor-default"
                        placeholder="Auto-filled"
                      />
                    </td>
                    {/* Consume Qty */}
                    <td className="px-3 py-2">
                      <input
                        type="number" step="0.0001" min="0.0001"
                        {...register(`lines.${index}.consume_qty`, {
                          required:      true,
                          min:           0.0001,
                          valueAsNumber: true,
                        })}
                        className="input-field text-xs text-right tabular-nums"
                      />
                    </td>
                    {/* UOM (auto-filled) */}
                    <td className="px-3 py-2">
                      <select {...register(`lines.${index}.uom`)} className="input-field text-xs text-center font-mono">
                        {(Array.isArray(UOM_OPTIONS) ? UOM_OPTIONS : []).map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                    {/* Rate */}
                    <td className="px-3 py-2">
                      <input
                        type="number" step="0.01" min="0"
                        {...register(`lines.${index}.rate_at_bom`, { valueAsNumber: true })}
                        className="input-field text-xs text-right tabular-nums"
                      />
                    </td>
                    {/* Computed value */}
                    <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums text-gray-700">
                      {formatCurrency(lineVal)}
                    </td>
                    {/* Remove row */}
                    <td className="px-2 py-2">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Remove row"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={5} className="px-3 py-3 text-right text-sm font-bold text-gray-700">Total Material Cost</td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(totalCost)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Size-wise Quantity Variants ── */}
      <div className="card p-6 space-y-4 border border-blue-100 bg-blue-50/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Size-wise Quantity Variants</h2>
            <p className="text-xs text-gray-500 mt-1">Override material consumption for specific shoe sizes.</p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={() => setUseSizeVariants(false)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${!useSizeVariants ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Same for all sizes
            </button>
            <button
              type="button"
              onClick={() => setUseSizeVariants(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${useSizeVariants ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Size-specific Quantities
            </button>
          </div>
        </div>

        {useSizeVariants && (
          sizesLoading ? (
            <div className="py-4 text-center text-sm text-gray-400">Loading sizes…</div>
          ) : activeSizes.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-400">No active sizes found. Add sizes in Settings → Sizes.</div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-3 text-left   text-xs font-semibold text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 w-48">Component SKU</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase w-24">Default Qty</th>
                    {activeSizes.map(s => (
                      <th key={s.size_code} className="px-3 py-3 text-center text-xs font-bold text-blue-700 uppercase min-w-[90px]">
                        {s.size_code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {safeLines.filter(l => l.input_sku).map((l, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="px-3 py-2 text-xs font-mono font-semibold text-gray-800 sticky left-0 bg-white line-clamp-1">
                        {l.input_sku}
                        <span className="text-[10px] text-gray-400 block truncate">{l.description}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-center text-gray-500 tabular-nums">
                        {(Number(l.consume_qty) || 0).toFixed(3)}
                      </td>
                      {activeSizes.map(s => {
                        const vQty = sizeVariantsMap[s.size_code]?.[l.input_sku]
                        return (
                          <td key={s.size_code} className="px-2 py-2">
                            <input
                              type="number" step="0.0001" min="0.0001"
                              placeholder={(Number(l.consume_qty) || 0).toFixed(3)}
                              value={vQty !== undefined ? vQty : ''}
                              onChange={(e) => handleVariantChange(s.size_code, l.input_sku, e.target.value)}
                              className="input-field text-xs text-right tabular-nums py-1 px-2 w-full border-dashed focus:border-solid focus:border-blue-500"
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {safeLines.filter(l => l.input_sku).length === 0 && (
                    <tr>
                      <td colSpan={2 + activeSizes.length} className="px-3 py-4 text-center text-xs text-gray-400">
                        Add component lines above first.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50/50">
                    <td colSpan={2} className="px-3 py-2 text-right text-xs font-bold text-gray-700">Effective Size Cost (₹)</td>
                    {activeSizes.map(s => {
                      let sizeCost = 0
                      safeLines.filter(l => l.input_sku).forEach(l => {
                        const vQty = sizeVariantsMap[s.size_code]?.[l.input_sku]
                        const qty = vQty !== undefined ? Number(vQty) : Number(l.consume_qty || 0)
                        sizeCost += qty * (Number(l.rate_at_bom) || 0)
                      })
                      return (
                        <td key={s.size_code} className="px-3 py-2 text-center text-xs font-bold text-gray-900 tabular-nums border-t border-blue-100">
                          {formatCurrency(sizeCost)}
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Form Actions ── */}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => navigate('/bom')} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={isBusy}>
          {isBusy ? 'Saving…' : isEdit ? 'Update BOM' : 'Create BOM'}
        </button>
      </div>
    </form>
  )
}
