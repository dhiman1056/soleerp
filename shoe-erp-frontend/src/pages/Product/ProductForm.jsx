import React, { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import Modal from '../../components/common/Modal.jsx'
import { useCreateProduct, useUpdateProduct, useNextSku } from '../../hooks/useProducts.js'
import { UOM_OPTIONS, PRODUCT_TYPES, PRODUCT_TYPE_LABELS } from '../../utils/constants.js'

const TABS = ['Basic Info', 'Classification', 'Pricing', 'Images']

const SIZE_CHART_OPTIONS = ['', 'UK', 'EU', 'US', 'INDIA', 'UNIVERSAL']
const GST_RATES          = [0, 5, 12, 18, 28]
const CATEGORIES         = ['Footwear', 'Accessories', 'Components', 'Packaging', 'Leather', 'Sole', 'Other']

// ── SKU Preview ────────────────────────────────────────────────────────────────
function SkuPreview({ productType, enabled }) {
  const { data: preview } = useNextSku(enabled ? productType : null)
  if (!preview) return null
  return (
    <p className="text-xs text-blue-600 mt-1">
      Auto-generated: <strong className="font-mono">{preview}</strong>{' '}
      <span className="text-gray-400">(leave SKU field blank to use this)</span>
    </p>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{children}</p>
)

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
    Promise.all(readers).then((base64s) => onChange([...images, ...base64s]))
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
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
        <div className="text-center pointer-events-none">
          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19v-2.5M16.5 12l-4.5-4.5L7.5 12M12 7.5V16" />
          </svg>
          <p className="text-sm text-gray-500 font-medium">Click to upload images</p>
          <p className="text-xs text-gray-400">PNG, JPG, WEBP — stored as base64</p>
        </div>
        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </label>
    </div>
  )
}

// ── Main Form ──────────────────────────────────────────────────────────────────
export default function ProductForm({ isOpen, onClose, existing = null }) {
  const isEdit  = !!existing?.sku_code
  const [tab,    setTab]    = useState(0)
  const [images, setImages] = useState([])

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      sku_code: '', description: '', product_type: 'RAW_MATERIAL', uom: 'PCS',
      brand_name: '', supplier_name: '',
      category: '', sub_category: '', design_no: '', size_chart: '', color: '', pack_size: 1,
      hsn_code: '', gst_rate: 0, basic_cost_price: '', cost_price: '', mrp: '', sp: '',
    },
  })

  const createMut = useCreateProduct()
  const updateMut = useUpdateProduct()
  const isBusy    = createMut.isPending || updateMut.isPending

  const productType    = watch('product_type')
  const basicCostPrice = watch('basic_cost_price')
  const gstRate        = watch('gst_rate')

  // Auto-calculate cost_price when basic + gst change
  useEffect(() => {
    const basic = parseFloat(basicCostPrice) || 0
    const gst   = parseFloat(gstRate)        || 0
    if (basic > 0 && !isEdit) {
      setValue('cost_price', +(basic * (1 + gst / 100)).toFixed(2))
    }
  }, [basicCostPrice, gstRate, isEdit, setValue])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTab(0)
      if (isEdit) {
        reset({
          sku_code:         existing.sku_code       || '',
          description:      existing.description    || '',
          product_type:     existing.product_type   || 'RAW_MATERIAL',
          uom:              existing.uom            || 'PCS',
          brand_name:       existing.brand_name     || '',
          supplier_name:    existing.supplier_name  || '',
          category:         existing.category       || '',
          sub_category:     existing.sub_category   || '',
          design_no:        existing.design_no      || '',
          size_chart:       existing.size_chart     || '',
          color:            existing.color          || '',
          pack_size:        existing.pack_size      || 1,
          hsn_code:         existing.hsn_code       || '',
          gst_rate:         existing.gst_rate       || 0,
          basic_cost_price: existing.basic_cost_price || '',
          cost_price:       existing.cost_price     || '',
          mrp:              existing.mrp            || '',
          sp:               existing.sp             || '',
        })
        setImages(Array.isArray(existing.images) ? existing.images : [])
      } else {
        reset({
          sku_code: '', description: '', product_type: 'RAW_MATERIAL', uom: 'PCS',
          brand_name: '', supplier_name: '',
          category: '', sub_category: '', design_no: '', size_chart: '', color: '', pack_size: 1,
          hsn_code: '', gst_rate: 0, basic_cost_price: '', cost_price: '', mrp: '', sp: '',
        })
        setImages([])
      }
    }
  }, [isOpen, isEdit, existing, reset])

  const onSubmit = (values) => {
    const payload = {
      ...values,
      sku_code:         values.sku_code?.trim() || undefined,
      description:      values.description.trim(),
      product_type:     values.product_type,
      uom:              values.uom,
      gst_rate:         parseFloat(values.gst_rate)        || 0,
      basic_cost_price: parseFloat(values.basic_cost_price) || 0,
      cost_price:       parseFloat(values.cost_price)       || 0,
      mrp:              parseFloat(values.mrp)              || 0,
      sp:               parseFloat(values.sp)               || 0,
      pack_size:        parseInt(values.pack_size)          || 1,
      images,
    }

    if (isEdit) {
      const { sku_code, product_type, ...rest } = payload
      updateMut.mutate({ sku: existing.sku_code, ...rest }, { onSuccess: onClose })
    } else {
      createMut.mutate(payload, { onSuccess: onClose })
    }
  }

  // Tab nav error indicators
  const TAB_FIELDS = [
    ['description', 'uom'],          // Basic
    [],                               // Classification
    [],                               // Pricing
    [],                               // Images
  ]
  const tabHasError = (i) => TAB_FIELDS[i].some((f) => !!errors[f])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Product — ${existing.sku_code}` : 'Add Product'}
      size="xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isBusy}>Cancel</button>
          <button type="submit" form="product-form" className="btn-primary" disabled={isBusy}>
            {isBusy ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </>
      }
    >
      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(i)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            } ${tabHasError(i) ? 'text-red-500 ring-1 ring-red-300' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      <form id="product-form" onSubmit={handleSubmit(onSubmit)}>

        {/* ── TAB 0: Basic Info ─────────────────────────────────────────────── */}
        <div className={tab === 0 ? '' : 'hidden'}>
          <div className="space-y-4">
            <SectionLabel>Product Type & SKU</SectionLabel>

            {/* Product Type */}
            <div>
              <label className="label">Product Type *</label>
              <div className="flex gap-2">
                {PRODUCT_TYPES.map((t) => (
                  <label
                    key={t}
                    className={`flex-1 flex flex-col items-center justify-center py-3 border-2 rounded-xl cursor-pointer text-xs font-semibold transition-all ${
                      watch('product_type') === t
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <input type="radio" {...register('product_type')} value={t} className="sr-only" />
                    <span className="text-lg mb-0.5">
                      {t === 'RAW_MATERIAL' ? '🧵' : t === 'SEMI_FINISHED' ? '👟' : '✅'}
                    </span>
                    {PRODUCT_TYPE_LABELS[t]}
                  </label>
                ))}
              </div>
            </div>

            {/* SKU Code */}
            <div>
              <label className="label">SKU Code {!isEdit && <span className="text-gray-400 font-normal">(leave blank to auto-generate)</span>}</label>
              <input
                {...register('sku_code', { maxLength: { value: 50, message: 'Max 50 chars' } })}
                disabled={isEdit}
                placeholder={isEdit ? existing?.sku_code : 'e.g. FG000001 — or leave blank'}
                className={`input-field uppercase ${isEdit ? 'bg-gray-50 text-gray-500' : ''} ${errors.sku_code ? 'input-error' : ''}`}
              />
              {errors.sku_code && <p className="text-red-500 text-xs mt-1">{errors.sku_code.message}</p>}
              {!isEdit && <SkuPreview productType={productType} enabled={!watch('sku_code')} />}
            </div>

            {/* Description */}
            <div>
              <label className="label">Description *</label>
              <input
                {...register('description', { required: 'Description is required', maxLength: { value: 255, message: 'Max 255 chars' } })}
                placeholder="e.g. Gents Oxford Leather Shoe — Black"
                className={`input-field ${errors.description ? 'input-error' : ''}`}
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
            </div>

            {/* UOM + Brand + Supplier */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Unit of Measure *</label>
                <select {...register('uom', { required: true })} className="input-field">
                  {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Pack Size</label>
                <input
                  type="number" min="1" step="1"
                  {...register('pack_size')}
                  className="input-field"
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Brand Name</label>
                <input {...register('brand_name')} placeholder="e.g. Red Chief" className="input-field" />
              </div>
              <div>
                <label className="label">Supplier Name</label>
                <input {...register('supplier_name')} placeholder="e.g. Sharma Leathers" className="input-field" />
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB 1: Classification ────────────────────────────────────────── */}
        <div className={tab === 1 ? '' : 'hidden'}>
          <div className="space-y-4">
            <SectionLabel>Classification</SectionLabel>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select {...register('category')} className="input-field">
                  <option value="">— Select —</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Sub Category</label>
                <input {...register('sub_category')} placeholder="e.g. Oxford" className="input-field" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Design No</label>
                <input {...register('design_no')} placeholder="e.g. D-2024-001" className="input-field font-mono" />
              </div>
              <div>
                <label className="label">Size Chart</label>
                <select {...register('size_chart')} className="input-field">
                  {SIZE_CHART_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s || '— None —'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Color</label>
              <input {...register('color')} placeholder="e.g. Black, Brown, Tan" className="input-field" />
            </div>
          </div>
        </div>

        {/* ── TAB 2: Pricing & Tax ─────────────────────────────────────────── */}
        <div className={tab === 2 ? '' : 'hidden'}>
          <div className="space-y-4">
            <SectionLabel>Tax</SectionLabel>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">HSN Code</label>
                <input {...register('hsn_code')} placeholder="e.g. 6403" className="input-field font-mono" />
              </div>
              <div>
                <label className="label">GST Rate %</label>
                <select {...register('gst_rate')} className="input-field">
                  {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
            </div>

            <SectionLabel>Pricing</SectionLabel>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Basic Cost Price (₹)</label>
                <input
                  type="number" step="0.01" min="0"
                  {...register('basic_cost_price')}
                  placeholder="0.00"
                  className="input-field text-right tabular-nums"
                />
                <p className="text-xs text-gray-400 mt-0.5">Excl. GST</p>
              </div>
              <div>
                <label className="label">Cost Price (₹)</label>
                <input
                  type="number" step="0.01" min="0"
                  {...register('cost_price')}
                  placeholder="0.00"
                  className="input-field text-right tabular-nums bg-blue-50"
                />
                <p className="text-xs text-blue-500 mt-0.5">Incl. GST — auto calculated</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">MRP (₹)</label>
                <input
                  type="number" step="0.01" min="0"
                  {...register('mrp')}
                  placeholder="0.00"
                  className="input-field text-right tabular-nums"
                />
              </div>
              <div>
                <label className="label">Selling Price (₹)</label>
                <input
                  type="number" step="0.01" min="0"
                  {...register('sp')}
                  placeholder="0.00"
                  className="input-field text-right tabular-nums"
                />
              </div>
            </div>

            {/* Pricing summary card */}
            {(parseFloat(watch('basic_cost_price')) > 0 || parseFloat(watch('mrp')) > 0) && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-4 gap-4 text-center text-xs">
                {[
                  { label: 'Basic CP', val: watch('basic_cost_price'), color: 'text-gray-700' },
                  { label: 'Cost (incl. GST)', val: watch('cost_price'),  color: 'text-blue-700' },
                  { label: 'MRP',      val: watch('mrp'),               color: 'text-purple-700' },
                  { label: 'SP',       val: watch('sp'),                color: 'text-green-700' },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <p className="text-gray-400 font-semibold uppercase">{label}</p>
                    <p className={`text-base font-black tabular-nums ${color}`}>
                      ₹{parseFloat(val || 0).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── TAB 3: Images ───────────────────────────────────────────────── */}
        <div className={tab === 3 ? '' : 'hidden'}>
          <div className="space-y-4">
            <SectionLabel>Product Images</SectionLabel>
            <p className="text-xs text-gray-500">
              Upload up to 10 images. They are stored as base64 in the database.
            </p>
            <ImageUploader images={images} onChange={setImages} />
            {images.length > 0 && (
              <p className="text-xs text-gray-400 text-right">{images.length} image{images.length !== 1 ? 's' : ''} attached</p>
            )}
          </div>
        </div>

        {/* Tab navigation arrow buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setTab((t) => Math.max(0, t - 1))}
            disabled={tab === 0}
            className="btn-secondary text-sm px-4 disabled:opacity-0"
          >
            ← Previous
          </button>
          {tab < TABS.length - 1 ? (
            <button
              type="button"
              onClick={() => setTab((t) => Math.min(TABS.length - 1, t + 1))}
              className="btn-primary text-sm px-4"
            >
              Next →
            </button>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}
