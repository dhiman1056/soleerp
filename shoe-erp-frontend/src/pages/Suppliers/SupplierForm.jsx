import React, { useState } from 'react'
import { useCreateSupplier, useUpdateSupplier } from '../../hooks/useSuppliers'
import { useBrands } from '../../hooks/useBrands.js'
import { useStockGroups } from '../../hooks/useDepartments'
import toast from 'react-hot-toast'

export default function SupplierForm({ supplier, onClose }) {
  const { data: brands = [] } = useBrands()
  const { data: rawStockGroups = [] } = useStockGroups()

  // Normalize stock groups safely
  const stockGroups = Array.isArray(rawStockGroups) ? rawStockGroups : []

  const [activeTab, setActiveTab] = useState('general')

  const [form, setForm] = useState(() => {
    if (supplier) {
      return {
        supplier_code: supplier.supplier_code || '',
        supplier_name: supplier.supplier_name || '',
        stock_group: supplier.stock_group || '',
        stock_group_id: supplier.stock_group_id || '',
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
      stock_group: '',
      stock_group_id: '',
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

    if (isEdit) {
      updateMut.mutate({ id: supplier.id, ...form }, {
        onSuccess: () => { toast.success('Supplier updated.'); onClose(); },
        onError: (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(form, {
        onSuccess: () => { toast.success('Supplier created.'); onClose(); },
        onError: (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  const tabs = [
    { id: 'general',    label: '1. Basic & Stock Group', icon: '🏢' },
    { id: 'address',    label: '2. Address & Location',  icon: '📍' },
    { id: 'compliance', label: '3. Contact & Tax',       icon: '📋' },
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
                Assign stock group, vendor category, payment terms & GST details
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
                <div className="sm:col-span-2">
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

                <div>
                  <label className="text-xs font-semibold text-gray-700">Stock Group</label>
                  <select
                    className="input-field mt-1 font-medium text-gray-800"
                    value={form.stock_group}
                    onChange={e => {
                      const val = e.target.value
                      const sel = stockGroups.find(sg => (sg.dept_name || sg.stock_group || sg.department_name) === val)
                      setForm({
                        ...form,
                        stock_group: val,
                        stock_group_id: sel ? sel.id : ''
                      })
                    }}
                  >
                    <option value="">— Select Stock Group —</option>
                    {stockGroups.map(sg => {
                      const name = sg.dept_name || sg.stock_group || sg.department_name || ''
                      const code = sg.sg_code || ''
                      return (
                        <option key={sg.id} value={name}>
                          {code ? `${code} — ` : ''}{name}
                        </option>
                      )
                    })}
                    {form.stock_group && !stockGroups.some(sg => (sg.dept_name || sg.stock_group || sg.department_name) === form.stock_group) && (
                      <option value={form.stock_group}>{form.stock_group}</option>
                    )}
                  </select>
                  <span className="text-[11px] text-gray-400 mt-0.5 block">Associated Stock Group for raw materials / goods</span>
                </div>

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
