import React, { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal.jsx'

import { 
  useCreateProduct, useUpdateProduct, useProductById, useNextSku 
} from '../../hooks/useProducts.js'
import { 
  useUOMs, useBrands, useCategories, useSubCategories, 
  useDesigns, useColors, useHSNCodes, useCreateBrand, useCreateDesign
} from '../../hooks/useMasters.js'
import { useSizes } from '../../hooks/useSizes.js'
import { useSuppliers } from '../../hooks/useSuppliers.js'

const TABS = ['Basic Info', 'Classification', 'Pricing & Tax', 'Images']
const GST_RATES = [0, 5, 12, 18, 28]

const SIZE_PREVIEWS = {
  'INFANT': 'UK (2,3,5,6,7,8,9,10,11,12) | EURO (19-28)',
  'KIDS': 'UK (6,7,8,9,10,11,11.5,12,12.5,13,1,2,3,4,5,6) | EURO (24-39)',
  'LADIES': 'UK (3,4,5,6,7,8,9) | EURO (36-42)',
  'MEN': 'UK (6,7,8,9,10,11,12) | EURO (40-46)',
  'UNIVERSAL': 'No specific sizes'
}

// ── Image uploader ─────────────────────────────────────────────────────────────
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
      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={i} className="relative group w-24 h-24">
              <img
                src={src}
                alt={`Image ${i + 1}`}
                className="w-full h-full object-cover rounded-xl border border-gray-200 shadow-sm"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {images.length < 5 && (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
          <div className="text-center pointer-events-none">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19v-2.5M16.5 12l-4.5-4.5L7.5 12M12 7.5V16" />
            </svg>
            <p className="text-sm text-gray-500 font-medium">Click to upload images (Max 5)</p>
          </div>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        </label>
      )}
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 mt-6">{children}</p>
}

export default function ProductForm({ isOpen, onClose, editSku }) {
  const isEdit = !!editSku
  const sku = editSku
  
  const [tab, setTab] = useState(0)
  const [skuMode, setSkuMode] = useState('AUTO') // 'AUTO' or 'MANUAL'
  const [images, setImages] = useState([])

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
      pack_size_uom_id: '',
      brand_id: '',
      supplier_name: '',
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
  const productType = watch('product_type')
  const categoryId = watch('category_id')
  const hsnId = watch('hsn_id')
  const basicCostPrice = watch('basic_cost_price') || 0
  const gstRate = watch('gst_rate') || 0

  // Hooks
  const { data: uoms = [] } = useUOMs()
  const { data: brands = [] } = useBrands()
  const { data: categories = [] } = useCategories()
  const { data: subCategories = [] } = useSubCategories(categoryId)
  const { data: designs = [] } = useDesigns()
  const { data: colors = [] } = useColors()
  const { data: hsnCodes = [] } = useHSNCodes()
  const { data: sizes = [] } = useSizes()
  const { data: suppliers = [] } = useSuppliers()
  const { data: nextSku } = useNextSku(productType)

  const createBrand = useCreateBrand()
  const createDesign = useCreateDesign()

  const [newBrand, setNewBrand] = useState('')
  const [newDesign, setNewDesign] = useState('')

  useEffect(() => {
    if (isEdit && existing) {
      reset({
        product_type: existing.product_type,
        sku_code: existing.sku_code,
        short_description: existing.short_description || existing.description || '',
        long_description: existing.long_description || '',
        uom_id: existing.uom_id || '',
        pack_size: existing.pack_size || 1,
        pack_size_uom_id: existing.pack_size_uom_id || '',
        brand_id: existing.brand_id || '',
        supplier_name: existing.supplier_name || '',
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
      setSkuMode('MANUAL')
    } else if (!isEdit) {
      reset({
        product_type: 'RAW_MATERIAL',
        sku_code: '',
        short_description: '',
        long_description: '',
        uom_id: '',
        pack_size: 1,
        pack_size_uom_id: '',
        brand_id: '',
        supplier_name: '',
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
      setSkuMode('AUTO')
    }
  }, [isEdit, existing, reset])

  // Auto-fill GST from HSN
  useEffect(() => {
    if (hsnId) {
      const selectedHsn = hsnCodes.find(h => h.id.toString() === hsnId.toString())
      if (selectedHsn) {
        setValue('gst_rate', parseFloat(selectedHsn.gst_rate) || 0)
      }
    }
  }, [hsnId, hsnCodes, setValue])

  // Auto-calculate Cost Price
  useEffect(() => {
    const basic = parseFloat(basicCostPrice) || 0
    const gst = parseFloat(gstRate) || 0
    const calculatedCost = +(basic * (1 + gst / 100)).toFixed(2)
    setValue('cost_price', calculatedCost)
  }, [basicCostPrice, gstRate, setValue])

  const onSubmit = (values) => {
    const uom = uoms.find(u => u.id.toString() === values.uom_id?.toString())
    const hsn = hsnCodes.find(h => h.id.toString() === values.hsn_id?.toString())

    const payload = {
      ...values,
      sku_code: skuMode === 'MANUAL' ? values.sku_code : undefined,
      description: values.short_description, // Map to legacy description field
      uom: uom ? uom.uom_code : '',
      hsn_code: hsn ? hsn.hsn_code : '',
      images
    }

    if (isEdit) {
      updateMut.mutate({ sku, ...payload }, { 
        onSuccess: () => onClose() 
      })
    } else {
      createMut.mutate(payload, { 
        onSuccess: () => onClose() 
      })
    }
  }

  const handleAddBrand = () => {
    if (newBrand.trim()) {
      createBrand.mutate({ brand_name: newBrand.trim() }, {
        onSuccess: () => setNewBrand('')
      })
    }
  }

  const handleAddDesign = () => {
    if (newDesign.trim()) {
      createDesign.mutate({ design_no: newDesign.trim() }, {
        onSuccess: () => setNewDesign('')
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Product: ${sku}` : 'Create New Product'}
      size="3xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary disabled:opacity-50" disabled={isBusy}>
            Cancel
          </button>
          <button type="submit" form="product-form" className="btn-primary disabled:opacity-50" disabled={isBusy}>
            {isBusy ? 'Saving...' : 'Save Product'}
          </button>
        </>
      }
    >
      {isLoadingExisting ? (
        <div className="p-8 text-center text-gray-500">Loading product data...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs Header */}
          <div className="flex border-b border-gray-200">
            {TABS.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(i)}
                className={`flex-1 py-4 text-sm font-semibold text-center transition-colors
                  ${tab === i ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                `}
              >
                {t}
              </button>
            ))}
          </div>

          <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="p-6">
            {/* ── TAB 0: Basic Info ────────────────────────────────────────── */}
            <div className={tab === 0 ? 'space-y-5' : 'hidden'}>
              
              <div>
                <label className="label">Product Type *</label>
                <div className="flex gap-4 mt-1">
                  {['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED'].map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value={type} {...register('product_type')} className="text-blue-600 focus:ring-blue-500" disabled={isEdit} />
                      <span className="text-sm text-gray-700 font-medium">
                        {type === 'RAW_MATERIAL' ? 'Raw Material' : type === 'SEMI_FINISHED' ? 'Semi Finished' : 'Finished Good'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label">SKU Code</label>
                  {!isEdit && (
                    <div className="flex items-center gap-2 text-xs">
                      <button type="button" onClick={() => setSkuMode('AUTO')} className={skuMode === 'AUTO' ? 'text-blue-600 font-bold' : 'text-gray-400'}>[Auto Generated]</button>
                      <button type="button" onClick={() => setSkuMode('MANUAL')} className={skuMode === 'MANUAL' ? 'text-blue-600 font-bold' : 'text-gray-400'}>[Enter Manually]</button>
                    </div>
                  )}
                </div>
                
                {skuMode === 'AUTO' && !isEdit ? (
                  <div className="input-field bg-gray-50 text-gray-500 font-mono flex items-center h-[42px]">
                    Auto: {nextSku || 'Loading...'}
                  </div>
                ) : (
                  <input 
                    {...register('sku_code')} 
                    className="input-field font-mono uppercase" 
                    placeholder="Enter custom SKU"
                    disabled={isEdit}
                  />
                )}
              </div>

              <div>
                <label className="label">Short Description *</label>
                <input {...register('short_description', { required: true })} className="input-field" placeholder="e.g. Premium Leather Upper" />
                {errors.short_description && <span className="text-red-500 text-xs">Required</span>}
              </div>

              <div>
                <label className="label">Long Description</label>
                <textarea {...register('long_description')} className="input-field min-h-[100px]" rows="4" placeholder="Detailed product specifications..."></textarea>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">UOM *</label>
                  <select {...register('uom_id', { required: true })} className="input-field">
                    <option value="">— Select UOM —</option>
                    {uoms.map(u => <option key={u.id} value={u.id}>{u.uom_code} — {u.uom_name}</option>)}
                  </select>
                  {errors.uom_id && <span className="text-red-500 text-xs">Required</span>}
                </div>
                <div>
                  <label className="label">Pack Size</label>
                  <input type="number" {...register('pack_size')} className="input-field" min="1" />
                </div>
                <div>
                  <label className="label">Pack Size UOM</label>
                  <select {...register('pack_size_uom_id')} className="input-field">
                    <option value="">— Select —</option>
                    {uoms.map(u => <option key={u.id} value={u.id}>{u.uom_code}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Brand Name</label>
                  <div className="flex gap-2">
                    <select {...register('brand_id')} className="input-field">
                      <option value="">— Select Brand —</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
                    </select>
                    <div className="flex gap-1 w-[200px]">
                      <input type="text" value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="New Brand" className="input-field text-xs px-2" />
                      <button type="button" onClick={handleAddBrand} className="bg-gray-100 px-2 rounded border border-gray-300 text-xs font-bold hover:bg-gray-200">+</button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label">Supplier</label>
                  <select {...register('supplier_name')} className="input-field">
                    <option value="">— Select Supplier —</option>
                    {suppliers.map(s => <option key={s.id} value={s.supplier_name}>{s.supplier_name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ── TAB 1: Classification ────────────────────────────────────── */}
            <div className={tab === 1 ? 'space-y-5' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select {...register('category_id')} className="input-field">
                    <option value="">— Select —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Sub Category</label>
                  <select {...register('sub_category_id')} className="input-field" disabled={!categoryId}>
                    <option value="">— Select —</option>
                    {subCategories.map(sc => <option key={sc.id} value={sc.id}>{sc.sub_category_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Design No</label>
                  <div className="flex gap-2">
                    <select {...register('design_id')} className="input-field font-mono">
                      <option value="">— Select —</option>
                      {designs.map(d => <option key={d.id} value={d.id}>{d.design_no}</option>)}
                    </select>
                    <div className="flex gap-1 w-[200px]">
                      <input type="text" value={newDesign} onChange={e => setNewDesign(e.target.value)} placeholder="New Design" className="input-field text-xs px-2 font-mono" />
                      <button type="button" onClick={handleAddDesign} className="bg-gray-100 px-2 rounded border border-gray-300 text-xs font-bold hover:bg-gray-200">+</button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label">Color</label>
                  <select {...register('color_id')} className="input-field">
                    <option value="">— Select —</option>
                    {colors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.color_code} - {c.color_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="label mb-3">Size Chart</label>
                {productType === 'RAW_MATERIAL' ? (
                  <select {...register('size_chart')} className="input-field max-w-xs">
                    <option value="">— Select Size —</option>
                    {sizes.map(s => <option key={s.id} value={s.size_code}>{s.size_label}</option>)}
                  </select>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      {['INFANT', 'KIDS', 'LADIES', 'MEN', 'UNIVERSAL'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value={opt} {...register('size_chart')} className="text-blue-600 focus:ring-blue-500" />
                          <span className="text-sm text-gray-700 font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>
                    {watch('size_chart') && (
                      <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg font-mono border border-blue-100">
                        <strong>Preview: </strong> {SIZE_PREVIEWS[watch('size_chart')]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── TAB 2: Pricing & Tax ─────────────────────────────────────── */}
            <div className={tab === 2 ? 'space-y-5' : 'hidden'}>
              <SectionLabel>Tax Information</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">HSN Code</label>
                  <select {...register('hsn_id')} className="input-field font-mono">
                    <option value="">— Select —</option>
                    {hsnCodes.map(h => <option key={h.id} value={h.id}>{h.hsn_code} - {h.description?.substring(0,20)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">GST Rate %</label>
                  <select {...register('gst_rate')} className="input-field">
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>

              <SectionLabel>Pricing</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Basic Cost Price (₹)</label>
                  <input type="number" step="0.01" {...register('basic_cost_price')} className="input-field text-right bg-gray-50" readOnly />
                  <p className="text-xs text-gray-500 mt-1">
                    {productType === 'RAW_MATERIAL' ? 'Auto-updated from purchase GRN avg rate' : 'Auto-updated from BOM total cost'}
                  </p>
                </div>
                <div>
                  <label className="label">Cost Price (₹)</label>
                  <input type="number" step="0.01" {...register('cost_price')} className="input-field text-right bg-blue-50 text-blue-700 font-bold" readOnly />
                  <p className="text-xs text-blue-600 mt-1">
                    = ₹{parseFloat(basicCostPrice).toFixed(2)} × (1 + {gstRate}%)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">MRP (₹)</label>
                  <input type="number" step="0.01" {...register('mrp')} className="input-field text-right" />
                </div>
                <div>
                  <label className="label">Selling Price (₹)</label>
                  <input type="number" step="0.01" {...register('sp')} className="input-field text-right" />
                </div>
              </div>
            </div>

            {/* ── TAB 3: Images ────────────────────────────────────────────── */}
            <div className={tab === 3 ? 'space-y-5' : 'hidden'}>
              <SectionLabel>Product Images</SectionLabel>
              <ImageUploader images={images} onChange={setImages} />
            </div>
          </form>
        </div>
      )}
    </Modal>
  )
}
