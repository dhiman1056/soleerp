import React, { useState, useRef, useEffect } from 'react'
import { useCreateSupplier, useUpdateSupplier } from '../../hooks/useSuppliers'
import { useBrands } from '../../hooks/useBrands.js'
import { useStockGroups } from '../../hooks/useDepartments'
import toast from 'react-hot-toast'

// ── Multi-Select Stock Group Picker ──────────────────────────────────────────
function MultiStockGroupPicker({ selected = [], onChange, stockGroups = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery]   = useState('')
  const containerRef        = useRef(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const normalizedGroups = stockGroups.map(sg => {
    const name = sg.dept_name || sg.stock_group || sg.department_name || ''
    const code = sg.sg_code || ''
    const type = sg.stock_type || ''
    return { id: sg.id, name, code, type }
  }).filter(g => Boolean(g.name))

  const filteredGroups = normalizedGroups.filter(g => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q)
  })

  const toggleGroup = (name) => {
    if (!name) return
    const exists = selected.some(s => s.toLowerCase() === name.toLowerCase())
    if (exists) {
      onChange(selected.filter(s => s.toLowerCase() !== name.toLowerCase()))
    } else {
      onChange([...selected, name])
    }
  }

  const removeGroup = (e, name) => {
    e.stopPropagation()
    onChange(selected.filter(s => s.toLowerCase() !== name.toLowerCase()))
  }

  const selectAll = (e) => {
    e.preventDefault()
    const allNames = normalizedGroups.map(g => g.name)
    onChange([...new Set([...selected, ...allNames])])
  }

  const clearAll = (e) => {
    e.preventDefault()
    onChange([])
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-xs font-semibold text-gray-700 flex items-center justify-between mb-1">
        <span>Stock Groups (Multiple Applicable)</span>
        <span className="text-[11px] text-gray-400 font-normal">
          {selected.length > 0 ? `${selected.length} group${selected.length > 1 ? 's' : ''} selected` : 'Choose one or more'}
        </span>
      </label>

      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className={`min-h-[42px] p-1.5 rounded-lg border bg-white cursor-pointer flex flex-wrap items-center gap-1.5 transition-all ${
          isOpen 
            ? 'border-blue-500 ring-2 ring-blue-500/20' 
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {selected.length === 0 ? (
          <span className="text-xs text-gray-400 px-2 py-1 select-none">
            + Click to select applicable Stock Groups (e.g. Raw Material, Accessories)...
          </span>
        ) : (
          selected.map((name) => {
            const match = normalizedGroups.find(g => g.name.toLowerCase() === name.toLowerCase())
            return (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs animate-in fade-in duration-100"
              >
                {match?.code && <span className="font-mono text-[10px] text-amber-700 font-bold">#{match.code}</span>}
                <span>{name}</span>
                <button
                  type="button"
                  onClick={(e) => removeGroup(e, name)}
                  className="w-3.5 h-3.5 rounded-full hover:bg-amber-200 text-amber-700 inline-flex items-center justify-center font-bold text-[10px] transition-colors"
                  title="Remove"
                >
                  ✕
                </button>
              </span>
            )
          })
        )}

        <div className="ml-auto pr-1 flex items-center gap-1 text-gray-400">
          <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search & Actions Bar */}
          <div className="p-2 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
            <input
              type="text"
              placeholder="Search stock group..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="button"
              onClick={selectAll}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 whitespace-nowrap"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 whitespace-nowrap"
            >
              Clear
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto p-1 divide-y divide-gray-50">
            {filteredGroups.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                No matching stock groups found
              </div>
            ) : (
              filteredGroups.map(g => {
                const isChecked = selected.some(s => s.toLowerCase() === g.name.toLowerCase())
                return (
                  <div
                    key={g.id || g.name}
                    onClick={() => toggleGroup(g.name)}
                    className={`px-3 py-2 text-xs rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                      isChecked 
                        ? 'bg-amber-50/70 text-amber-950 font-semibold' 
                        : 'hover:bg-slate-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by row click
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer pointer-events-none"
                      />
                      <div>
                        <span>{g.name}</span>
                        {g.code && (
                          <span className="ml-2 font-mono text-[10px] text-gray-400">
                            [{g.code}]
                          </span>
                        )}
                      </div>
                    </div>
                    {g.type && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        g.type === 'INVENTORY' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {g.type}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>{selected.length} of {normalizedGroups.length} selected</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-blue-600 hover:text-blue-800"
            >
              Done ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Supplier Form Modal ──────────────────────────────────────────────────
export default function SupplierForm({ supplier, onClose }) {
  const { data: brands = [] } = useBrands()
  const { data: rawStockGroups = [] } = useStockGroups()
  const stockGroups = Array.isArray(rawStockGroups) ? rawStockGroups : []

  const [activeTab, setActiveTab] = useState('general')

  // Parse initial stock groups
  const initialStockGroups = (() => {
    if (Array.isArray(supplier?.stock_groups) && supplier.stock_groups.length > 0) {
      return supplier.stock_groups.map(s => String(s).trim()).filter(Boolean)
    }
    if (supplier?.stock_group) {
      return supplier.stock_group.split(',').map(s => s.trim().replace(/^[\(\)]+|[\(\)]+$/g, '')).filter(Boolean)
    }
    return []
  })()

  const [selectedStockGroups, setSelectedStockGroups] = useState(initialStockGroups)

  const [form, setForm] = useState(() => {
    if (supplier) {
      return {
        supplier_code: supplier.supplier_code || '',
        supplier_name: supplier.supplier_name || '',
        supplier_type: supplier.supplier_type || supplier.type || 'PURCHASE',
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        city: supplier.city || '',
        state: supplier.state || '',
        pincode: supplier.pincode || '',
        gstin: supplier.gstin || '',
        payment_terms: supplier.payment_terms || '',
        credit_limit: supplier.credit_limit || 0,
        is_active: supplier.is_active !== undefined ? supplier.is_active : true,
        brand_id: supplier.brand_id || '',
        msme_certificate: supplier.msme_certificate || '',
        customer_care_no: supplier.customer_care_no || '',
        licence_no: supplier.licence_no || '',
      }
    }
    return {
      supplier_code: '',
      supplier_name: '',
      supplier_type: 'PURCHASE',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gstin: '',
      payment_terms: '',
      credit_limit: 0,
      is_active: true,
      brand_id: '',
      msme_certificate: '',
      customer_care_no: '',
      licence_no: '',
    }
  })

  const [errors, setErrors] = useState({})

  const createMut = useCreateSupplier()
  const updateMut = useUpdateSupplier()

  const isEdit = !!supplier
  const isLoading = createMut.isPending || updateMut.isPending

  const validate = () => {
    const errs = {}

    if (!form.supplier_name?.trim()) {
      errs.supplier_name = 'Supplier name is required'
      if (activeTab !== 'general') setActiveTab('general')
    }

    if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin)) {
      errs.gstin = 'Invalid GSTIN (e.g. 22AAAAA0000A1Z5)'
      if (!errs.supplier_name && activeTab !== 'compliance') setActiveTab('compliance')
    }

    if (form.phone && !/^[0-9]{10}$/.test(form.phone)) {
      errs.phone = 'Phone must be 10 digits'
      if (!errs.supplier_name && !errs.gstin && activeTab !== 'compliance') setActiveTab('compliance')
    }

    if (form.customer_care_no && !/^[0-9]{10}$/.test(form.customer_care_no)) {
      errs.customer_care_no = 'Must be 10 digits'
      if (!errs.supplier_name && !errs.gstin && activeTab !== 'compliance') setActiveTab('compliance')
    }

    if (form.pincode && !/^[0-9]{6}$/.test(form.pincode)) {
      errs.pincode = 'Pincode must be 6 digits'
      if (!errs.supplier_name && !errs.gstin && activeTab !== 'address') setActiveTab('address')
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Invalid email format'
      if (!errs.supplier_name && activeTab !== 'compliance') setActiveTab('compliance')
    }

    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const payload = {
      ...form,
      stock_groups: selectedStockGroups,
      stock_group: selectedStockGroups.join(', ')
    }

    if (isEdit) {
      updateMut.mutate({ id: supplier.id, ...payload }, {
        onSuccess: () => { toast.success('Supplier updated.'); onClose(); },
        onError: (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Supplier created.'); onClose(); },
        onError: (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  const tabs = [
    { id: 'general',    label: '1. Basic & Stock Groups', icon: '🏢' },
    { id: 'address',    label: '2. Address & Location',    icon: '📍' },
    { id: 'compliance', label: '3. Contact & Tax',         icon: '📋' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-hidden">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header (Always Visible) */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-blue-500/30">
              {isEdit ? '✎' : '+'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {isEdit ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
                {form.supplier_code ? (
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {form.supplier_code}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500">
                    Auto-generated Code
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign multiple stock groups, vendor category, payment terms & GST details
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50/50 px-6 gap-2 shrink-0">
          {tabs.map((tab) => {
            const hasError = (tab.id === 'general' && errors.supplier_name) ||
                             (tab.id === 'address' && errors.pincode) ||
                             (tab.id === 'compliance' && (errors.gstin || errors.phone || errors.email || errors.customer_care_no))

            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 relative ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {hasError && (
                  <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-1" />
                )}
              </button>
            )
          })}
        </div>

        {/* Form Body (Scrollable) */}
        <form id="supplier-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: GENERAL & CLASSIFICATION */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Supplier Name */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                    <span>Supplier Name <span className="text-red-500">*</span></span>
                    {errors.supplier_name && <span className="text-xs text-red-500 font-normal">{errors.supplier_name}</span>}
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. A S APPARELS, ABP INDUSTRIES"
                    className={`input-field mt-1 ${errors.supplier_name ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                    value={form.supplier_name}
                    onChange={e => {
                      setForm({ ...form, supplier_name: e.target.value })
                      if (errors.supplier_name) setErrors({ ...errors, supplier_name: '' })
                    }}
                  />
                </div>

                {/* Supplier Code */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">Supplier Code</label>
                  <input
                    type="text"
                    placeholder="Leave blank to auto-generate (e.g. 1, 2)"
                    className="input-field font-mono mt-1"
                    value={form.supplier_code}
                    onChange={e => setForm({ ...form, supplier_code: e.target.value })}
                  />
                  <span className="text-[11px] text-gray-400 mt-0.5 block">Excel SUPP CODE or ERP sequence</span>
                </div>

                {/* Multi-Stock Groups Picker (Full Width) */}
                <div className="sm:col-span-2">
                  <MultiStockGroupPicker
                    selected={selectedStockGroups}
                    onChange={setSelectedStockGroups}
                    stockGroups={stockGroups}
                  />
                </div>

                {/* Supplier Type */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">Supplier Type</label>
                  <select
                    className="input-field mt-1 font-medium"
                    value={form.supplier_type}
                    onChange={e => setForm({ ...form, supplier_type: e.target.value })}
                  >
                    <option value="PURCHASE">PURCHASE</option>
                    <option value="JOB WORK">JOB WORK</option>
                    <option value="JOB WORK & PURCHASE">JOB WORK &amp; PURCHASE</option>
                  </select>
                  <span className="text-[11px] text-gray-400 mt-0.5 block">Purchase, Job Work, or both</span>
                </div>

                {/* Brand */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">Brand (Optional)</label>
                  <select
                    className="input-field mt-1"
                    value={form.brand_id}
                    onChange={e => setForm({ ...form, brand_id: e.target.value })}
                  >
                    <option value="">— Select Brand —</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.brand_name} {b.brand_code ? `(${b.brand_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">Payment Terms</label>
                  <input
                    type="text"
                    placeholder="e.g. Net 30, Immediate, 45 Days"
                    className="input-field mt-1"
                    value={form.payment_terms}
                    onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                  />
                </div>

                {/* Credit Limit */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">Credit Limit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    className="input-field mt-1"
                    value={form.credit_limit}
                    onChange={e => setForm({ ...form, credit_limit: Number(e.target.value) || 0 })}
                  />
                </div>

                {/* Active Checkbox */}
                <div className="sm:col-span-2 pt-2">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors w-full">
                    <input
                      type="checkbox"
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    />
                    <div>
                      <span className="text-xs font-semibold text-gray-800">Active Supplier</span>
                      <p className="text-[11px] text-gray-500">Uncheck to deactivate this supplier from purchases & orders</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADDRESS & LOCATION */}
          {activeTab === 'address' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Address</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Plot 45, Phase-3, Industrial Area"
                    className="input-field mt-1 resize-none"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Agra, Kanpur, Delhi"
                    className="input-field mt-1"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Uttar Pradesh"
                    className="input-field mt-1"
                    value={form.state}
                    onChange={e => setForm({ ...form, state: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 flex justify-between">
                    <span>Pincode</span>
                    {errors.pincode && <span className="text-red-500 font-normal">{errors.pincode}</span>}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 282007"
                    className={`input-field font-mono mt-1 ${errors.pincode ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                    value={form.pincode}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setForm({ ...form, pincode: val })
                      if (errors.pincode) setErrors({ ...errors, pincode: '' })
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTACT & COMPLIANCE */}
          {activeTab === 'compliance' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    className="input-field mt-1"
                    value={form.contact_person}
                    onChange={e => setForm({ ...form, contact_person: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 flex justify-between">
                    <span>Phone Number</span>
                    {errors.phone && <span className="text-red-500 font-normal">{errors.phone}</span>}
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10 digit mobile number"
                    className={`input-field mt-1 ${errors.phone ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                    value={form.phone}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setForm({ ...form, phone: val })
                      if (errors.phone) setErrors({ ...errors, phone: '' })
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 flex justify-between">
                    <span>Email Address</span>
                    {errors.email && <span className="text-red-500 font-normal">{errors.email}</span>}
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. sales@vendor.com"
                    className={`input-field mt-1 ${errors.email ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                    value={form.email}
                    onChange={e => {
                      setForm({ ...form, email: e.target.value })
                      if (errors.email) setErrors({ ...errors, email: '' })
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 flex justify-between">
                    <span>Customer Care No</span>
                    {errors.customer_care_no && <span className="text-red-500 font-normal">{errors.customer_care_no}</span>}
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10 digit support number"
                    className={`input-field mt-1 ${errors.customer_care_no ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                    value={form.customer_care_no}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setForm({ ...form, customer_care_no: val })
                      if (errors.customer_care_no) setErrors({ ...errors, customer_care_no: '' })
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 flex justify-between">
                    <span>GSTIN</span>
                    {errors.gstin && <span className="text-red-500 font-normal">{errors.gstin}</span>}
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="22AAAAA0000A1Z5"
                    className={`input-field font-mono mt-1 ${errors.gstin ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                    value={form.gstin}
                    onChange={e => {
                      setForm({ ...form, gstin: e.target.value.toUpperCase() })
                      if (errors.gstin) setErrors({ ...errors, gstin: '' })
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">MSME Certificate</label>
                  <input
                    type="text"
                    placeholder="e.g. UDYAM-UP-12345"
                    className="input-field mt-1"
                    value={form.msme_certificate}
                    onChange={e => setForm({ ...form, msme_certificate: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Licence / Factory Permit No</label>
                  <input
                    type="text"
                    placeholder="e.g. LIC-98765-2024"
                    className="input-field mt-1"
                    value={form.licence_no}
                    onChange={e => setForm({ ...form, licence_no: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Sticky Action Footer (Always Visible!) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            {activeTab !== 'general' && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'compliance') setActiveTab('address')
                  else if (activeTab === 'address') setActiveTab('general')
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                ← Back
              </button>
            )}
            {activeTab !== 'compliance' && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'general') setActiveTab('address')
                  else if (activeTab === 'address') setActiveTab('compliance')
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                Next Step →
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="supplier-form"
              disabled={isLoading}
              className="btn-primary px-5 py-2 text-xs font-semibold shadow-md shadow-blue-500/20"
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                isEdit ? 'Update Supplier' : 'Save Supplier'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
