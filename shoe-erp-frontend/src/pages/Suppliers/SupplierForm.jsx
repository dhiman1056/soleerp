import React from 'react';
import { useState } from 'react'
import { useCreateSupplier, useUpdateSupplier } from '../../hooks/useSuppliers'
import toast from 'react-hot-toast'

export default function SupplierForm({ supplier, onClose }) {
  const [form, setForm] = useState(supplier || {
    supplier_name: '', contact_person: '', phone: '', email: '',
    address: '', city: '', state: '', pincode: '', gstin: '', payment_terms: '',
    credit_limit: 0, is_active: true
  })

  const createMut = useCreateSupplier()
  const updateMut = useUpdateSupplier()

  const isEdit = !!supplier

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isEdit) {
      updateMut.mutate({ id: supplier.id, ...form }, {
        onSuccess: () => { toast.success('Supplier updated.'); onClose(); }
      })
    } else {
      createMut.mutate(form, {
        onSuccess: () => { toast.success('Supplier created.'); onClose(); }
      })
    }
  }

  const isLoading = createMut.isLoading || updateMut.isLoading

  return (
    <div className="fixed inset-0 bg-black/50 overflow-y-auto w-full h-full flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Supplier' : 'Add New Supplier'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-semibold text-gray-600">Company Name *</label>
              <input required type="text" className="input-field mt-1" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">GSTIN</label>
              <input type="text" className="input-field mt-1" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Contact Person</label>
              <input type="text" className="input-field mt-1" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Phone</label>
              <input type="text" className="input-field mt-1" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Email</label>
              <input type="email" className="input-field mt-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Payment Terms</label>
              <input type="text" placeholder="e.g. 30 Days Net" className="input-field mt-1" value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600">Address line</label>
              <input type="text" className="input-field mt-1" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">City</label>
              <input type="text" className="input-field mt-1" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            </div>
            <div className="flex gap-2">
               <div className="w-1/2">
                 <label className="text-xs font-semibold text-gray-600">State</label>
                 <input type="text" className="input-field mt-1" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
               </div>
               <div className="w-1/2">
                 <label className="text-xs font-semibold text-gray-600">Pincode</label>
                 <input type="text" className="input-field mt-1" value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} />
               </div>
            </div>
            {isEdit && (
              <div className="col-span-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
                  <span className="text-sm font-medium text-gray-700">Active Supplier</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
