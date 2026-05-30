import React, { useState } from 'react'
import { useCreateSupplier, useUpdateSupplier } from '../../hooks/useSuppliers'
import { useBrands } from '../../hooks/useBrands.js'
import toast from 'react-hot-toast'

export default function SupplierForm({ supplier, onClose }) {
  const { data: brands = [] } = useBrands()

  const [form, setForm] = useState(() => {
    if (supplier) {
      return {
        supplier_name: supplier.supplier_name || '',
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
      supplier_name: '',
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

    if (!form.supplier_name?.trim())
      errs.supplier_name = 'Supplier name is required'

    if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin))
      errs.gstin = 'Invalid GSTIN (e.g. 22AAAAA0000A1Z5)'

    if (form.phone && !/^[0-9]{10}$/.test(form.phone))
      errs.phone = 'Phone must be 10 digits'

    if (form.customer_care_no && !/^[0-9]{10}$/.test(form.customer_care_no))
      errs.customer_care_no = 'Must be 10 digits'

    if (form.pincode && !/^[0-9]{6}$/.test(form.pincode))
      errs.pincode = 'Pincode must be 6 digits'

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Invalid email format'

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

  return (
    <div className="fixed inset-0 bg-black/50 overflow-y-auto w-full h-full flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative my-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            {isEdit && supplier.supplier_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{supplier.supplier_code}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 mb-3 uppercase tracking-wider">Section 1 — Basic Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="text-xs font-semibold text-gray-600">Supplier Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Acme Leather Corp"
                  className={`input-field mt-1 ${errors.supplier_name ? 'border-red-400' : ''}`}
                  value={form.supplier_name}
                  onChange={e => {
                    setForm({ ...form, supplier_name: e.target.value })
                    if (errors.supplier_name) setErrors({ ...errors, supplier_name: '' })
                  }}
                />
                {errors.supplier_name && <p className="mt-1 text-xs text-red-500">{errors.supplier_name}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">GSTIN</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="22AAAAA0000A1Z5"
                  className={`input-field font-mono mt-1 ${errors.gstin ? 'border-red-400' : ''}`}
                  value={form.gstin}
                  onChange={e => {
                    setForm({ ...form, gstin: e.target.value.toUpperCase() })
                    if (errors.gstin) setErrors({ ...errors, gstin: '' })
                  }}
                />
                {errors.gstin && <p className="mt-1 text-xs text-red-500">{errors.gstin}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Brand</label>
                <select
                  className="input-field mt-1"
                  value={form.brand_id}
                  onChange={e => setForm({ ...form, brand_id: e.target.value })}
                >
                  <option value="">— Select Brand —</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.brand_name} ({b.brand_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Payment Terms</label>
                <input
                  type="text"
                  placeholder="e.g. 30 Days Net"
                  className="input-field mt-1"
                  value={form.payment_terms}
                  onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Address */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 mb-3 uppercase tracking-wider">Section 2 — Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600">Address</label>
                <input
                  type="text"
                  placeholder="e.g. 123 Industrial Area, Phase-3"
                  className="input-field mt-1"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">City</label>
                <input
                  type="text"
                  placeholder="e.g. New Delhi"
                  className="input-field mt-1"
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600">State</label>
                  <input
                    type="text"
                    placeholder="Delhi"
                    className="input-field mt-1"
                    value={form.state}
                    onChange={e => setForm({ ...form, state: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Pincode</label>
                  <input
                    type="tel"
                    maxLength={6}
                    placeholder="110020"
                    className={`input-field mt-1 ${errors.pincode ? 'border-red-400' : ''}`}
                    value={form.pincode}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setForm({ ...form, pincode: val })
                      if (errors.pincode) setErrors({ ...errors, pincode: '' })
                    }}
                  />
                  {errors.pincode && <p className="mt-1 text-xs text-red-500">{errors.pincode}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Contact */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 mb-3 uppercase tracking-wider">Section 3 — Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className="input-field mt-1"
                  value={form.contact_person}
                  onChange={e => setForm({ ...form, contact_person: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Phone</label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10 digit phone number"
                  className={`input-field mt-1 ${errors.phone ? 'border-red-400' : ''}`}
                  value={form.phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setForm({ ...form, phone: val })
                    if (errors.phone) setErrors({ ...errors, phone: '' })
                  }}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Email</label>
                <input
                  type="email"
                  placeholder="e.g. supplier@example.com"
                  className={`input-field mt-1 ${errors.email ? 'border-red-400' : ''}`}
                  value={form.email}
                  onChange={e => {
                    setForm({ ...form, email: e.target.value })
                    if (errors.email) setErrors({ ...errors, email: '' })
                  }}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Customer Care No</label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10 digit customer care number"
                  className={`input-field mt-1 ${errors.customer_care_no ? 'border-red-400' : ''}`}
                  value={form.customer_care_no}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setForm({ ...form, customer_care_no: val })
                    if (errors.customer_care_no) setErrors({ ...errors, customer_care_no: '' })
                  }}
                />
                {errors.customer_care_no && <p className="mt-1 text-xs text-red-500">{errors.customer_care_no}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">MSME Certificate</label>
                <input
                  type="text"
                  placeholder="e.g. MSME-12345"
                  className="input-field mt-1"
                  value={form.msme_certificate}
                  onChange={e => setForm({ ...form, msme_certificate: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Licence No</label>
                <input
                  type="text"
                  placeholder="e.g. LIC-98765"
                  className="input-field mt-1"
                  value={form.licence_no}
                  onChange={e => setForm({ ...form, licence_no: e.target.value })}
                />
              </div>

              {isEdit && (
                <div className="col-span-2 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-gray-700">Active Supplier</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
