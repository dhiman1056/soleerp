import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal.jsx'
import SearchableSelect from '../../components/common/SearchableSelect.jsx'

import {
  useCreateProduct, useUpdateProduct, useProductById, useNextSku
} from '../../hooks/useProducts.js'
import { useUOMs } from '../../hooks/useUOM.js'
import { useColors } from '../../hooks/useMasters.js'
import { useBrands } from '../../hooks/useBrands.js'
import { useCategories } from '../../hooks/useCategories.js'
import { useSubCategoriesByCategory } from '../../hooks/useSubCategories.js'
import { useDesigns } from '../../hooks/useDesigns.js'
import { useHSN } from '../../hooks/useHSN.js'
import { useGST } from '../../hooks/useGST.js'
import { useSuppliers } from '../../hooks/useSuppliers.js'

const STEPS = [
  { id: 0, title: 'Basic Details', subtitle: 'Type, SKU & Supplier', icon: '📝' },
  { id: 1, title: 'Classification', subtitle: 'Category, Design & Sizes', icon: '🏷️' },
  { id: 2, title: 'Pricing & Taxes', subtitle: 'Cost, GST & Margins', icon: '💰' },
  { id: 3, title: 'Media & Gallery', subtitle: 'Product Photos', icon: '🖼️' },
]

const SIZE_PREVIEWS = {
  'INFANT': 'UK (2, 3, 5, 6, 7, 8, 9, 10, 11, 12) | EURO (19-28)',
  'KIDS': 'UK (6, 7, 8, 9, 10, 11, 11.5, 12, 12.5, 13, 1, 2, 3, 4, 5, 6) | EURO (24-39)',
  'LADIES': 'UK (3, 4, 5, 6, 7, 8, 9) | EURO (36-42)',
  'MEN': 'UK (6, 7, 8, 9, 10, 11, 12) | EURO (40-46)',
  'UNIVERSAL': 'Universal standard sizing (no size variant breakdown)'
}

// ── Image Uploader ─────────────────────────────────────────────────────────────
function ImageUploader({ images, onChange }) {
  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    const readers = files.map(
      (f) =>
        new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(f)
        })
    )
    Promise.all(readers).then((base64s) => onChange([...images, ...base64s].slice(0, 5)))
  }

  const remove = (idx) => onChange(images.filter((_, i) => i !== idx))

  return (
    <div className="space-y-4">
      {/* Thumbnails Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {images.map((src, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
              <img
                src={src}
                alt={`Product photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {i === 0 && (
                <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600/90 text-white rounded-full text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow hover:bg-red-700"
                title="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Drag & Drop Zone */}
      {images.length < 5 && (
        <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl cursor-pointer bg-slate-50/60 hover:bg-indigo-50/20 transition-all group p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors mb-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-slate-700 group-hover:text-indigo-700">
            Click or drag & drop to upload images
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            PNG, JPG, WEBP up to 5MB (Max 5 photos, {5 - images.length} remaining)
          </p>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        </label>
      )}
    </div>
  )
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="pb-3 border-b border-slate-100 mb-4">
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export default function ProductForm({ isOpen, onClose, editSku }) {
  const routeParams = useParams()
  const navigate = useNavigate()

  const effectiveOpen  = isOpen !== undefined ? isOpen : true
  const effectiveSku   = editSku !== undefined ? editSku : routeParams?.sku
  const effectiveClose = onClose || (() => navigate('/products'))

  const isEdit = !!effectiveSku
  const sku = effectiveSku

  const [activeStep, setActiveStep] = useState(0)
  const [skuMode, setSkuMode] = useState('AUTO') // 'AUTO' or 'MANUAL'
  const [manualSku, setManualSku] = useState('')
  const [images, setImages] = useState([])
  const [skuType, setSkuType] = useState('parent')

  const { data: existing, isLoading: isLoadingExisting } = useProductById(sku)
  const createMut = useCreateProduct()
  const updateMut = useUpdateProduct()
  const isBusy = createMut.isPending || updateMut.isPending || isLoadingExisting

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      product_type: 'RAW_MATERIAL',
      sku_code: '',
      short_description: '',
      long_description: '',
      uom_id: '',
      pack_size: 1,
      brand_id: '',
      supplier_id: '',
      category_id: '',
      sub_category_id: '',
      design_id: '',
      size_chart: '',
      color_id: '',
      hsn_id: '',
      gst_rate: 0,
      basic_cost_price: 0,
      cost_price: 0,
      mrp: 0,
      sp: 0
    }
  })

  // Watch fields
  const productType     = watch('product_type')
  const categoryId      = watch('category_id')
  const subCategoryId   = watch('sub_category_id')
  const designId        = watch('design_id')
  const colorId         = watch('color_id')
  const uomId           = watch('uom_id')
  const brandId         = watch('brand_id')
  const supplierId      = watch('supplier_id')
  const hsnId           = watch('hsn_id')
  const gstRate         = watch('gst_rate') || 0
  const basicCostPrice  = watch('basic_cost_price') || 0
  const costPrice       = watch('cost_price') || 0
  const mrp             = watch('mrp') || 0
  const sp              = watch('sp') || 0

  useEffect(() => {
    register('category_id')
    register('sub_category_id')
    register('design_id')
    register('color_id')
    register('uom_id', { required: true })
    register('brand_id')
    register('supplier_id')
    register('hsn_id')
    register('gst_rate')
  }, [register])

  // ── Hooks for Masters ────────────────────────────────────────────────────────
  const { data: uoms = [] } = useUOMs()
  const { data: brands = [] } = useBrands()
  const { data: categories = [] } = useCategories()
  const { data: subCategories = [] } = useSubCategoriesByCategory(categoryId)
  const { data: designs = [] } = useDesigns()
  const { data: colors = [] } = useColors()
  const { data: hsnCodes = [] } = useHSN()
  const { data: gstRatesData = [] } = useGST({ is_active: 'true' })
  const { data: suppliers = [] } = useSuppliers()
  const { data: nextSku } = useNextSku(productType)

  // ── Memoized Options for SearchableSelect ─────────────────────────────────────
  const categoryOptions = useMemo(() => {
    return categories.map(c => ({
      value: c.id,
      label: c.catg_name,
      subLabel: c.dept_name || 'No Dept',
      badge: c.catg_code || null,
      searchKey: `${c.catg_name} ${c.dept_name || ''} ${c.catg_code || ''}`
    }))
  }, [categories])

  const subCategoryOptions = useMemo(() => {
    return subCategories.map(sc => ({
      value: sc.id,
      label: sc.sub_category_name,
      badge: sc.sub_category_code || null,
      searchKey: `${sc.sub_category_name} ${sc.sub_category_code || ''}`
    }))
  }, [subCategories])

  const designOptions = useMemo(() => {
    return designs.map(d => ({
      value: d.id,
      label: d.design_no,
      subLabel: d.design_name || null,
      searchKey: `${d.design_no} ${d.design_name || ''}`
    }))
  }, [designs])

  const colorOptions = useMemo(() => {
    return colors.map(c => ({
      value: c.id,
      label: c.color_name,
      subLabel: c.color_code || null,
      searchKey: `${c.color_name} ${c.color_code || ''}`
    }))
  }, [colors])

  const uomOptions = useMemo(() => {
    return uoms.map(u => ({
      value: u.id,
      label: u.uom_code,
      subLabel: u.uom_name || null,
      searchKey: `${u.uom_code} ${u.uom_name || ''}`
    }))
  }, [uoms])

  const brandOptions = useMemo(() => {
    return brands.map(b => ({
      value: b.id,
      label: b.brand_name,
      searchKey: b.brand_name || ''
    }))
  }, [brands])

  const supplierOptions = useMemo(() => {
    return suppliers.map(s => ({
      value: s.id,
      label: s.supplier_name,
      subLabel: s.supplier_code || null,
      badge: s.stock_group || s.supplier_type || null,
      searchKey: `${s.supplier_name} ${s.supplier_code || ''} ${s.stock_group || ''}`
    }))
  }, [suppliers])

  const hsnOptions = useMemo(() => {
    return hsnCodes.map(h => ({
      value: h.id,
      label: h.hsn_code,
      subLabel: h.description || null,
      badge: `${h.gst_rate || 0}% GST`,
      searchKey: `${h.hsn_code} ${h.description || ''}`
    }))
  }, [hsnCodes])

  const gstRateOptions = useMemo(() => {
    const rates = new Set([0, 5, 12, 18, 28])
    const gstList = Array.isArray(gstRatesData) ? gstRatesData : []
    gstList.forEach(g => {
      const r = parseFloat(g.gst_rate)
      if (!isNaN(r)) rates.add(r)
    })
    return Array.from(rates).sort((a, b) => a - b).map(r => ({
      value: r,
      label: `${r}% GST Rate`,
      searchKey: `${r}`
    }))
  }, [gstRatesData])

  // ── Existing Record Reset ───────────────────────────────────────────────────
  useEffect(() => {
    if (isEdit && existing) {
      let resolvedSupplierId = ''
      if (existing.supplier_name && suppliers.length > 0) {
        const foundSupplier = suppliers.find(s => s.supplier_name === existing.supplier_name)
        if (foundSupplier) resolvedSupplierId = foundSupplier.id
      }
      reset({
        product_type: existing.product_type,
        sku_code: existing.sku_code,
        short_description: existing.short_description || existing.description || '',
        long_description: existing.long_description || '',
        uom_id: existing.uom_id || '',
        pack_size: existing.pack_size || 1,
        brand_id: existing.brand_id || '',
        supplier_id: resolvedSupplierId || existing.supplier_id || '',
        category_id: existing.category_id || '',
        sub_category_id: existing.sub_category_id || '',
        design_id: existing.design_id || '',
        size_chart: existing.size_chart || '',
        color_id: existing.color_id || '',
        hsn_id: existing.hsn_id || '',
        gst_rate: existing.gst_rate || 0,
        basic_cost_price: existing.basic_cost_price || 0,
        cost_price: existing.cost_price || 0,
        mrp: existing.mrp || 0,
        sp: existing.sp || 0
      })
      setImages(Array.isArray(existing.images) ? existing.images : [])
      setSkuType(existing.sku_type || 'parent')
      setSkuMode('MANUAL')
    } else if (!isEdit) {
      reset({
        product_type: 'RAW_MATERIAL',
        sku_code: '',
        short_description: '',
        long_description: '',
        uom_id: '',
        pack_size: 1,
        brand_id: '',
        supplier_id: '',
        category_id: '',
        sub_category_id: '',
        design_id: '',
        size_chart: '',
        color_id: '',
        hsn_id: '',
        gst_rate: 0,
        basic_cost_price: 0,
        cost_price: 0,
        mrp: 0,
        sp: 0
      })
      setImages([])
      setManualSku('')
      setSkuType('parent')
      setSkuMode('AUTO')
    }
  }, [isEdit, existing, reset, suppliers])

  // Auto-fill GST from HSN selection
  const handleHsnChange = (val) => {
    setValue('hsn_id', val, { shouldValidate: true, shouldDirty: true })
    const hsn = hsnCodes.find(h => String(h.id) === String(val))
    if (hsn) {
      const rate = hsn.gst_rate || hsn.gst_rate_from_master || 0
      setValue('gst_rate', rate, { shouldValidate: true, shouldDirty: true })
      setValue('hsn_code', hsn.hsn_code)
    }
  }

  // Auto-calculate Cost Price
  useEffect(() => {
    const basic = parseFloat(basicCostPrice) || 0
    const gst = parseFloat(gstRate) || 0
    const calculatedCost = +(basic * (1 + gst / 100)).toFixed(2)
    setValue('cost_price', calculatedCost)
  }, [basicCostPrice, gstRate, setValue])

  // Reset sub-category when category changes
  useEffect(() => {
    if (!isEdit) {
      setValue('sub_category_id', '')
    }
  }, [categoryId, isEdit, setValue])

  // Calculate Margin & Profit Metrics
  const metrics = useMemo(() => {
    const cost = parseFloat(costPrice) || 0
    const selling = parseFloat(sp) || 0
    const retail = parseFloat(mrp) || 0
    const profit = selling - cost
    const marginPct = selling > 0 ? ((profit / selling) * 100) : 0
    const markupPct = cost > 0 ? ((profit / cost) * 100) : 0

    return {
      profit: profit.toFixed(2),
      marginPct: marginPct.toFixed(1),
      markupPct: markupPct.toFixed(1),
      isProfitable: profit >= 0
    }
  }, [costPrice, sp, mrp])

  const onSubmit = (values) => {
    const uomObj = uoms.find(u => u.id?.toString() === values.uom_id?.toString())
    const hsnObj = hsnCodes.find(h => h.id?.toString() === values.hsn_id?.toString())
    const brandObj = brands.find(b => b.id?.toString() === values.brand_id?.toString())
    const supplierObj = suppliers.find(s => s.id?.toString() === values.supplier_id?.toString())
    const categoryObj = categories.find(c => c.id?.toString() === values.category_id?.toString())
    const subCatObj = subCategories.find(sc => sc.id?.toString() === values.sub_category_id?.toString())
    const designObj = designs.find(d => d.id?.toString() === values.design_id?.toString())
    const colorObj = colors.find(c => c.id?.toString() === values.color_id?.toString())

    const payload = {
      ...values,
      sku_type: skuType,
      sku_code: isEdit
        ? values.sku_code
        : (skuMode === 'MANUAL' ? manualSku : (nextSku?.sku_code || nextSku || '')),
      description: values.short_description,
      uom: uomObj ? uomObj.uom_code : '',
      brand_name: brandObj ? brandObj.brand_name : '',
      supplier_name: supplierObj ? supplierObj.supplier_name : '',
      category: categoryObj ? categoryObj.catg_name : '',
      sub_category: subCatObj ? subCatObj.sub_category_name : '',
      design_no: designObj ? designObj.design_no : '',
      color: colorObj ? colorObj.color_name : '',
      hsn_code: hsnObj ? hsnObj.hsn_code : '',
      images
    }
    delete payload.pack_size_uom_id

    if (isEdit) {
      updateMut.mutate({ sku, ...payload }, {
        onSuccess: () => effectiveClose()
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => effectiveClose()
      })
    }
  }

  const generatedSkuCode = skuMode === 'MANUAL' ? manualSku : (nextSku?.sku_code || nextSku || 'Auto')

  return (
    <Modal
      isOpen={effectiveOpen}
      onClose={effectiveClose}
      title=""
      size="2xl"
    >
      {isLoadingExisting ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading product details...</p>
        </div>
      ) : (
        <div className="flex flex-col -m-6 min-h-[580px]">

          {/* ── 1. Modern Header with Title & SKU Badge ────────────────── */}
          <div className="px-7 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-lg">👟</span>
                <h2 className="text-lg font-bold tracking-tight">
                  {isEdit ? `Edit Product: ${sku}` : 'Create New Product'}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-indigo-200 border border-white/10 backdrop-blur-xs font-mono">
                  {isEdit ? sku : generatedSkuCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                SoleERP footwear catalog • Fill details across steps or jump directly
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-slate-400">Step {activeStep + 1} of {STEPS.length}</span>
              <div className="w-24 bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-400 h-full transition-all duration-300"
                  style={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── 2. Stepper Tab Pills ───────────────────────────────────── */}
          <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200 flex-shrink-0">
            {STEPS.map((s, idx) => {
              const isActive = activeStep === idx
              const isPast   = activeStep > idx
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`py-3 px-3 text-left border-r last:border-r-0 border-slate-200/80 transition-all flex items-center gap-2.5 ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs border-b-2 border-b-indigo-600 font-semibold'
                      : isPast
                        ? 'text-slate-700 hover:bg-slate-100/70'
                        : 'text-slate-400 hover:bg-slate-100/50'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : isPast
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isPast ? '✓' : idx + 1}
                  </span>
                  <div className="min-w-0 hidden sm:block">
                    <p className={`text-xs truncate ${isActive ? 'font-bold text-indigo-900' : 'font-medium'}`}>{s.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{s.subtitle}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── 3. Scrollable Form Content ─────────────────────────────── */}
          <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="p-7 pb-32 overflow-y-auto flex-1 min-h-[420px]">

            {/* ═════ STEP 0: BASIC DETAILS ═════ */}
            <div className={activeStep === 0 ? 'space-y-6 animate-in fade-in duration-150 min-h-[380px]' : 'hidden'}>

              {/* Product Type Cards */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Product Classification Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { type: 'RAW_MATERIAL', label: 'Raw Material', desc: 'Soles, leather, adhesive, eyelets', icon: '🧵' },
                    { type: 'SEMI_FINISHED', label: 'Semi Finished', desc: 'Stitched upper, cut soles, sub-assembly', icon: '🧩' },
                    { type: 'FINISHED', label: 'Finished Good', desc: 'Boxed footwear ready for retail/dispatch', icon: '👟' }
                  ].map(item => {
                    const isSelected = productType === item.type
                    return (
                      <div
                        key={item.type}
                        onClick={() => !isEdit && setValue('product_type', item.type)}
                        className={`p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 select-none ${
                          isEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-300'
                        } ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <span className="text-2xl mt-0.5">{item.icon}</span>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{item.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* SKU & Short Description Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* SKU Code Box */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">SKU Code *</label>
                    {!isEdit && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSkuMode('AUTO')}
                          className={`font-semibold px-1.5 py-0.5 rounded transition-colors ${
                            skuMode === 'AUTO' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          Auto
                        </button>
                        <button
                          type="button"
                          onClick={() => setSkuMode('MANUAL')}
                          className={`font-semibold px-1.5 py-0.5 rounded transition-colors ${
                            skuMode === 'MANUAL' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          Manual
                        </button>
                      </div>
                    )}
                  </div>

                  {isEdit ? (
                    <input
                      {...register('sku_code')}
                      className="input-field font-mono font-bold bg-slate-50 text-slate-700"
                      readOnly
                    />
                  ) : skuMode === 'AUTO' ? (
                    <div className="relative">
                      <input
                        value={nextSku?.sku_code || nextSku || 'Auto-generating...'}
                        disabled
                        className="input-field bg-slate-50 text-indigo-700 font-mono font-bold pr-16"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                        AUTO
                      </span>
                    </div>
                  ) : (
                    <input
                      value={manualSku}
                      onChange={e => setManualSku(e.target.value.toUpperCase())}
                      placeholder="e.g. SHOE-2026-BLK"
                      className="input-field font-mono font-bold uppercase focus:border-indigo-600"
                    />
                  )}
                </div>

                {/* Short Description */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Short Description / Item Name *
                  </label>
                  <input
                    {...register('short_description', { required: 'Short description is required' })}
                    className={`input-field font-medium ${errors.short_description ? 'border-red-400 focus:ring-red-300' : ''}`}
                    placeholder="e.g. Men's Running Sneaker Upper Sole, EVA Sheet 10mm"
                  />
                  {errors.short_description && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.short_description.message}</p>
                  )}
                </div>
              </div>

              {/* Long Description */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Detailed Specifications / Long Description
                </label>
                <textarea
                  {...register('long_description')}
                  rows={2}
                  className="input-field resize-none text-xs"
                  placeholder="Material specs, density, thickness, manufacturing notes..."
                />
              </div>

              {/* UOM, Pack Size, Brand & Supplier */}
              <div className="pt-2 border-t border-slate-100">
                <SectionHeading title="Packaging & Source" subtitle="Unit of measure, brand association, and preferred vendor" />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* UOM */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">UOM *</label>
                    <SearchableSelect
                      value={uomId}
                      onChange={(val) => setValue('uom_id', val, { shouldValidate: true, shouldDirty: true })}
                      options={uomOptions}
                      placeholder="Select UOM..."
                      searchPlaceholder="Search unit..."
                      error={!!errors.uom_id}
                    />
                    {errors.uom_id && <p className="text-[11px] text-red-500 mt-1">UOM is required</p>}
                  </div>

                  {/* Pack Size */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Pack Size</label>
                    <input
                      type="text"
                      {...register('pack_size')}
                      className="input-field"
                      placeholder="e.g. 1 Pair, 12 PCS"
                    />
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Brand Name</label>
                    <SearchableSelect
                      value={brandId}
                      onChange={(val) => setValue('brand_id', val, { shouldValidate: true, shouldDirty: true })}
                      options={brandOptions}
                      placeholder="Select Brand..."
                      searchPlaceholder="Search brand..."
                    />
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Preferred Supplier</label>
                    <SearchableSelect
                      value={supplierId}
                      onChange={(val) => setValue('supplier_id', val, { shouldValidate: true, shouldDirty: true })}
                      options={supplierOptions}
                      placeholder="Select Supplier..."
                      searchPlaceholder="Search supplier or code..."
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* ═════ STEP 1: CLASSIFICATION ═════ */}
            <div className={activeStep === 1 ? 'space-y-6 animate-in fade-in duration-150 min-h-[380px]' : 'hidden'}>

              <SectionHeading title="Category & Styling" subtitle="Organize product into stock group, sub-category, and design" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Category (Stock Group) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Category (Stock Group) *
                  </label>
                  <SearchableSelect
                    value={categoryId}
                    onChange={(val) => {
                      setValue('category_id', val, { shouldValidate: true, shouldDirty: true })
                      setValue('sub_category_id', '', { shouldValidate: true, shouldDirty: true })
                    }}
                    options={categoryOptions}
                    placeholder="— Select Category —"
                    searchPlaceholder="Search category or stock group..."
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Defines the high-level group (e.g. Accessories, Leather, Sole)
                  </p>
                </div>

                {/* Sub Category */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Sub Category
                  </label>
                  <SearchableSelect
                    value={subCategoryId}
                    onChange={(val) => setValue('sub_category_id', val, { shouldValidate: true, shouldDirty: true })}
                    options={subCategoryOptions}
                    placeholder={!categoryId ? '— Select Category first —' : '— Select Sub Category —'}
                    searchPlaceholder="Search sub category..."
                    disabled={!categoryId}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Specific sub-classification filtered by selected category
                  </p>
                </div>

                {/* Design No */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Design Number / Article
                  </label>
                  <SearchableSelect
                    value={designId}
                    onChange={(val) => setValue('design_id', val, { shouldValidate: true, shouldDirty: true })}
                    options={designOptions}
                    placeholder="— Select Design Article —"
                    searchPlaceholder="Search design no or name..."
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Color Variant
                  </label>
                  <SearchableSelect
                    value={colorId}
                    onChange={(val) => setValue('color_id', val, { shouldValidate: true, shouldDirty: true })}
                    options={colorOptions}
                    placeholder="— Select Color —"
                    searchPlaceholder="Search color name or code..."
                  />
                </div>
              </div>

              {/* SKU Type & Size Chart (for Non-Raw Material) */}
              {productType !== 'RAW_MATERIAL' && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <SectionHeading title="Size Breakdown & Variant Setup" subtitle="Choose variant model for manufacturing and retail sizing" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSkuType('parent')}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 select-none ${
                        skuType === 'parent'
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className="text-2xl mt-0.5">📐</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Parent SKU (With Size Breakup)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Has multiple size variants (e.g., UK 6-11, Euro 40-46) generated automatically.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSkuType('child')}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 select-none ${
                        skuType === 'child'
                          ? 'border-purple-600 bg-purple-50/60 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className="text-2xl mt-0.5">🏷️</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Child SKU (Single Variant)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Single specific size or unit variant without size chart matrix.
                        </p>
                      </div>
                    </button>
                  </div>

                  {skuType === 'parent' && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                      <label className="text-xs font-bold text-slate-800 block">
                        Select Target Size Chart *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['INFANT', 'KIDS', 'LADIES', 'MEN', 'UNIVERSAL'].map(opt => {
                          const isChecked = watch('size_chart') === opt
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setValue('size_chart', opt, { shouldDirty: true })}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                isChecked
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>

                      {watch('size_chart') && (
                        <div className="p-3 bg-white rounded-lg border border-indigo-100 text-xs text-indigo-900 font-mono shadow-2xs">
                          <span className="font-bold text-indigo-700 font-sans">Active Breakdown: </span>
                          {SIZE_PREVIEWS[watch('size_chart')]}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* ═════ STEP 2: PRICING & TAX ═════ */}
            <div className={activeStep === 2 ? 'space-y-6 animate-in fade-in duration-150 min-h-[380px]' : 'hidden'}>

              {/* Tax Settings */}
              <div>
                <SectionHeading title="Tax & HSN Compliance" subtitle="GST rates and statutory classification" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* HSN Code */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      HSN / SAC Code
                    </label>
                    <SearchableSelect
                      value={hsnId}
                      onChange={handleHsnChange}
                      options={hsnOptions}
                      placeholder="Select HSN code..."
                      searchPlaceholder="Search HSN code or description..."
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Auto-populates GST rate based on official footwear tariff
                    </p>
                  </div>

                  {/* GST Rate */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      GST Rate %
                    </label>
                    <SearchableSelect
                      value={gstRate}
                      onChange={(val) => setValue('gst_rate', val, { shouldValidate: true, shouldDirty: true })}
                      options={gstRateOptions}
                      placeholder="Select GST rate..."
                      searchPlaceholder="Search GST %..."
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Applicable Goods and Services Tax bracket
                    </p>
                  </div>
                </div>
              </div>

              {/* Cost & Sales Pricing */}
              <div className="pt-2 border-t border-slate-100">
                <SectionHeading title="Cost & Sales Structure" subtitle="Define purchasing cost and customer selling prices" />

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Basic Cost Price */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Basic Cost Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('basic_cost_price')}
                      className="input-field text-right font-mono font-semibold"
                      placeholder="0.00"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Excluding GST</p>
                  </div>

                  {/* Landed Cost Price */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Landed Cost Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('cost_price')}
                      className="input-field text-right font-mono font-bold bg-slate-50 text-indigo-900 border-indigo-200"
                      readOnly
                    />
                    <p className="text-[10px] text-indigo-600 mt-1">
                      Basic + {gstRate}% GST
                    </p>
                  </div>

                  {/* Selling Price */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Selling Price / Wholesale (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('sp')}
                      className="input-field text-right font-mono font-semibold text-emerald-800"
                      placeholder="0.00"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Invoicing base rate</p>
                  </div>

                  {/* MRP */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Max Retail Price / MRP (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('mrp')}
                      className="input-field text-right font-mono font-semibold"
                      placeholder="0.00"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Box / tag printed price</p>
                  </div>
                </div>

                {/* Live Profit Margin & Markup Card */}
                {(parseFloat(sp) > 0 || parseFloat(costPrice) > 0) && (
                  <div className="mt-4 p-4 rounded-xl border bg-gradient-to-r from-slate-50 to-indigo-50/40 border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                        metrics.isProfitable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {metrics.isProfitable ? '📈' : '📉'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Estimated Profit per Unit: <span className={metrics.isProfitable ? 'text-emerald-700' : 'text-red-600'}>₹{metrics.profit}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Margin: <strong>{metrics.marginPct}%</strong> • Markup: <strong>{metrics.markupPct}%</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        parseFloat(metrics.marginPct) >= 20
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : parseFloat(metrics.marginPct) >= 5
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {parseFloat(metrics.marginPct) >= 20 ? 'Healthy Margin' : parseFloat(metrics.marginPct) >= 5 ? 'Low Margin' : 'Loss / Breakeven'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* ═════ STEP 3: MEDIA & GALLERY ═════ */}
            <div className={activeStep === 3 ? 'space-y-6 animate-in fade-in duration-150' : 'hidden'}>
              <SectionHeading title="Product Photography" subtitle="Upload high quality product pictures and material swatches" />
              <ImageUploader images={images} onChange={setImages} />
            </div>

          </form>

          {/* ── 4. Fixed Ergonomic Footer Bar ──────────────────────────── */}
          <div className="px-7 py-4 bg-slate-50 border-t border-slate-200 flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeStep > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(prev => prev - 1)}
                  className="btn-secondary py-2 px-3.5 text-xs font-semibold flex items-center gap-1.5"
                  disabled={isBusy}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
              )}
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                {STEPS[activeStep].title}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={effectiveClose}
                className="btn-secondary py-2 px-4 text-xs font-semibold text-slate-600 hover:text-slate-800"
                disabled={isBusy}
              >
                Cancel
              </button>

              {activeStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep(prev => prev + 1)}
                  className="btn-primary py-2 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-sm"
                >
                  Next: {STEPS[activeStep + 1].title}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : null}

              <button
                type="submit"
                form="product-form"
                className="btn-primary py-2 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 flex items-center gap-2"
                disabled={isBusy}
              >
                {isBusy ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>{isEdit ? 'Update Product' : 'Save Product'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      )}
    </Modal>
  )
}
