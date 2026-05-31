import React, { useState, useEffect } from 'react'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '../../hooks/useCustomers'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'

const EMPTY = {
  cust_name: '',
  customer_type: 'B2C',  // default B2C
  gstin: '',
  address: '',
  state: '',
  city: '',
  pincode: '',
  contact_person: '',
  contact_mobile: '',
  email: '',
  customer_care_no: '',
  credit_limit: 0,
  payment_terms: '',
}

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label text-xs">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

const SectionHeader = ({ title }) => (
  <div className="pt-2 pb-1 border-b border-gray-100">
    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h4>
  </div>
)

function CustomerModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateCustomer()
  const updateMut = useUpdateCustomer()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        cust_name:        editItem.cust_name         || '',
        customer_type:    editItem.customer_type      || 'B2C',
        gstin:            editItem.gstin              || '',
        credit_limit:     editItem.credit_limit != null ? String(editItem.credit_limit) : 0,
        payment_terms:    editItem.payment_terms      || '',
        address:          editItem.address            || '',
        city:             editItem.city               || '',
        state:            editItem.state              || '',
        pincode:          editItem.pincode            || '',
        contact_person:   editItem.contact_person     || '',
        contact_mobile:   editItem.contact_mobile     || '',
        email:            editItem.email              || '',
        customer_care_no: editItem.customer_care_no   || '',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [editItem])

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: '' }))
  }

  const validate = () => {
    const errs = {}

    if (!form.cust_name?.trim()) {
      errs.cust_name = 'Customer name is required'
    }

    // GSTIN mandatory for B2B
    if (form.customer_type === 'B2B') {
      if (!form.gstin?.trim()) {
        errs.gstin = 'GSTIN is required for B2B customers'
      } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin)) {
        errs.gstin = 'Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)'
      }
    }

    if (form.contact_mobile && !/^[0-9]{10}$/.test(form.contact_mobile)) {
      errs.contact_mobile = 'Mobile must be 10 digits'
    }

    if (form.customer_care_no && !/^[0-9]{10}$/.test(form.customer_care_no)) {
      errs.customer_care_no = 'Must be 10 digits'
    }

    if (form.pincode && !/^[0-9]{6}$/.test(form.pincode)) {
      errs.pincode = 'Pincode must be 6 digits'
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Invalid email format'
    }

    if (form.credit_limit && isNaN(Number(form.credit_limit))) {
      errs.credit_limit = 'Must be a valid number'
    }

    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      ...form,
      cust_name: form.cust_name.trim(),
      gstin: form.customer_type === 'B2B' ? form.gstin.trim() : null,
      credit_limit: parseFloat(form.credit_limit) || 0,
    }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('Customer updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Customer created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-6">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Customer' : 'Add New Customer'}</h3>
            {isEdit && editItem.cust_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.cust_code}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">

          {/* Type Selector button group */}
          <div className="flex gap-3 mb-2">
            <button
              type="button"
              onClick={() => {
                setForm({...form, customer_type: 'B2C'})
                if (errors.gstin) setErrors(er => ({ ...er, gstin: '' }))
              }}
              className={`flex-1 py-1.5 rounded-lg border-2 font-semibold text-xs transition-all
                ${form.customer_type === 'B2C' 
                  ? 'border-blue-600 bg-blue-600 text-white' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              B2C (Retail)
            </button>
            <button
              type="button"
              onClick={() => setForm({...form, customer_type: 'B2B'})}
              className={`flex-1 py-1.5 rounded-lg border-2 font-semibold text-xs transition-all
                ${form.customer_type === 'B2B' 
                  ? 'border-blue-600 bg-blue-600 text-white' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              B2B (Business)
            </button>
          </div>

          {/* ── Section 1: Basic Info ── */}
          <SectionHeader title="Basic Info" />
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="label text-xs">Customer Code</label>
              <input
                value={isEdit ? editItem.cust_code : "Auto Generated (CUST-0001)"}
                disabled
                className="input-field bg-gray-50 text-gray-500 font-mono text-xs py-1.5"
              />
            </div>

            <Field label="Customer Name *" required error={errors.cust_name}>
              <input
                type="text"
                required
                placeholder="e.g. Reliance Footwear Ltd"
                value={form.cust_name}
                onChange={set('cust_name')}
                className={`input-field text-xs py-1.5 ${errors.cust_name ? 'border-red-400 focus:ring-red-300' : ''}`}
                autoFocus
              />
            </Field>

            {form.customer_type === 'B2B' && (
              <Field label="GSTIN *" error={errors.gstin}>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="22AAAAA0000A1Z5"
                  value={form.gstin}
                  onChange={e => {
                    setForm({...form, gstin: e.target.value.toUpperCase()})
                    if (errors.gstin) setErrors(er => ({ ...er, gstin: '' }))
                  }}
                  className={`input-field uppercase font-mono text-xs py-1.5 ${errors.gstin ? 'border-red-400' : ''}`}
                />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Credit Limit (₹)" error={errors.credit_limit}>
                <input
                  type="number"
                  placeholder="0"
                  value={form.credit_limit}
                  onChange={set('credit_limit')}
                  className="input-field text-xs py-1.5"
                />
              </Field>

              <Field label="Payment Terms" error={errors.payment_terms}>
                <input
                  type="text"
                  placeholder="e.g. Net 30, COD"
                  value={form.payment_terms}
                  onChange={set('payment_terms')}
                  className="input-field text-xs py-1.5"
                />
              </Field>
            </div>
          </div>

          {/* ── Section 2: Address ── */}
          <SectionHeader title="Address" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Address" error={errors.address}>
                <textarea id="cust_addr" className="input-field resize-none text-xs py-1.5" rows={2}
                  value={form.address} onChange={set('address')} placeholder="Street / Area" />
              </Field>
            </div>
            
            <Field label="City" error={errors.city}>
              <input
                type="text"
                placeholder="City"
                value={form.city}
                onChange={set('city')}
                className="input-field text-xs py-1.5"
              />
            </Field>

            <Field label="State" error={errors.state}>
              <input
                type="text"
                placeholder="State"
                value={form.state}
                onChange={set('state')}
                className="input-field text-xs py-1.5"
              />
            </Field>

            <Field label="Pincode" error={errors.pincode}>
              <input
                type="text"
                placeholder="400001"
                value={form.pincode}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setForm({ ...form, pincode: val })
                  if (errors.pincode) setErrors(er => ({ ...er, pincode: '' }))
                }}
                className={`input-field text-xs py-1.5 ${errors.pincode ? 'border-red-400 focus:ring-red-300' : ''}`}
                maxLength={6}
              />
            </Field>
          </div>

          {/* ── Section 3: Contact ── */}
          <SectionHeader title="Contact" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <Field label="Contact Person" error={errors.contact_person}>
              <input
                type="text"
                placeholder="Full name"
                value={form.contact_person}
                onChange={set('contact_person')}
                className="input-field text-xs py-1.5"
              />
            </Field>

            <Field label="Contact Mobile" error={errors.contact_mobile}>
              <input
                type="tel"
                placeholder="10 digit mobile number"
                value={form.contact_mobile}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setForm({ ...form, contact_mobile: val })
                  if (errors.contact_mobile) setErrors(er => ({ ...er, contact_mobile: '' }))
                }}
                className={`input-field text-xs py-1.5 ${errors.contact_mobile ? 'border-red-400 focus:ring-red-300' : ''}`}
                maxLength={10}
                pattern="[0-9]{10}"
              />
            </Field>

            <Field label="Email" error={errors.email}>
              <input
                type="email"
                placeholder="info@customer.com"
                value={form.email}
                onChange={set('email')}
                className={`input-field text-xs py-1.5 ${errors.email ? 'border-red-400 focus:ring-red-300' : ''}`}
              />
            </Field>

            <Field label="Customer Care No" error={errors.customer_care_no}>
              <input
                type="tel"
                placeholder="10 digit customer care no"
                value={form.customer_care_no}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setForm({ ...form, customer_care_no: val })
                  if (errors.customer_care_no) setErrors(er => ({ ...er, customer_care_no: '' }))
                }}
                className={`input-field text-xs py-1.5 ${errors.customer_care_no ? 'border-red-400 focus:ring-red-300' : ''}`}
                maxLength={10}
                pattern="[0-9]{10}"
              />
            </Field>
          </div>

          {/* Auto-code banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[11px] text-blue-700">Code auto-generated on save (CUST-0001, CUST-0002…)</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary text-xs py-1.5" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary text-xs py-1.5" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CustomerMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]             = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [showImport, setShowImport]     = useState(false)
  const [editItem, setEditItem]         = useState(null)

  const templateColumns = [
    {
      key: 'customer_type',
      label: 'Customer Type',
      required: true,
      example: 'B2C',
      example2: 'B2B',
      note: 'B2C or B2B only'
    },
    {
      key: 'cust_name',
      label: 'Customer Name',
      required: true,
      example: 'Reliance Footwear Ltd',
      example2: 'Delhi Shoe House'
    },
    {
      key: 'gstin',
      label: 'GSTIN',
      required: false,
      example: '',
      example2: '27AABCU9603R1ZX',
      note: 'Required for B2B, 15 characters'
    },
    {
      key: 'credit_limit',
      label: 'Credit Limit',
      required: false,
      example: '0',
      example2: '50000'
    },
    {
      key: 'payment_terms',
      label: 'Payment Terms',
      required: false,
      example: 'COD',
      example2: 'Net 30'
    },
    {
      key: 'address',
      label: 'Address',
      required: false,
      example: 'Shop 5 Main Market',
      example2: ''
    },
    {
      key: 'city',
      label: 'City',
      required: false,
      example: 'Mumbai',
      example2: 'Delhi'
    },
    {
      key: 'state',
      label: 'State',
      required: false,
      example: 'Maharashtra',
      example2: 'Delhi'
    },
    {
      key: 'pincode',
      label: 'Pincode',
      required: false,
      example: '400001',
      example2: ''
    },
    {
      key: 'contact_person',
      label: 'Contact Person',
      required: false,
      example: 'Suresh Shah',
      example2: ''
    },
    {
      key: 'contact_mobile',
      label: 'Contact Mobile',
      required: false,
      example: '9876543210',
      example2: '',
      note: '10 digits only'
    },
    {
      key: 'email',
      label: 'Email',
      required: false,
      example: 'info@reliance.com',
      example2: ''
    },
    {
      key: 'customer_care_no',
      label: 'Customer Care No',
      required: false,
      example: '',
      example2: '',
      note: '10 digits only'
    }
  ]

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading, refetch } = useCustomers(params)
  const updateMut = useUpdateCustomer()

  const customers = Array.isArray(data) ? data : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (c) => { setEditItem(c);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (c) => {
    updateMut.mutate({ id: c.id, data: { is_active: !c.is_active } }, {
      onSuccess: () => toast.success(`Customer ${c.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  const renderTypeBadge = (type) => {
    if (type === 'B2B') {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 shadow-sm border border-blue-200">B2B</span>
    }
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 shadow-sm border border-green-200">B2C</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customer Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage customers — codes auto-generated (CUST-0001…)</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImport(true)}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 14px',
                border:'0.5px solid #d1d5db',
                borderRadius:8, background:'white',
                fontSize:13, cursor:'pointer', color:'#374151'
              }}
            >
              ↑ Import CSV
            </button>
            <button id="btn-add-customer" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Customer
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="cust-search" className="input-field pl-9" placeholder="Search by name, code, city or GSTIN…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="cust-status-filter" className="input-field w-auto min-w-[140px]"
          value={filterActive} onChange={e => setFilterActive(e.target.value)}>
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-12 flex justify-center"><Loader /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Code</th>
                  <th className="px-5 py-3">Customer Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3 hidden md:table-cell">City</th>
                  <th className="px-5 py-3 hidden lg:table-cell">GSTIN</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>No customers found.{canEdit && ' Click "Add Customer" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : customers.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50/60 transition-colors ${!c.is_active ? 'opacity-55' : ''}`}>
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-sky-700">{c.cust_code}</td>
                    
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {c.cust_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">{c.cust_name}</p>
                          {c.contact_mobile && <p className="text-xs text-gray-400">{c.contact_mobile}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3 whitespace-nowrap">
                      {renderTypeBadge(c.customer_type)}
                    </td>

                    <td className="px-5 py-3 hidden md:table-cell text-xs text-gray-600">
                      {c.city || '—'}
                    </td>

                    <td className="px-5 py-3 hidden lg:table-cell">
                      {c.gstin ? <span className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{c.gstin}</span> : <span className="text-gray-400">—</span>}
                    </td>

                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
                        <button onClick={() => handleToggle(c)} className={`text-xs font-semibold ${c.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {c.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {customers.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{customers.length} {customers.length === 1 ? 'customer' : 'customers'} found</p>
            </div>
          )}
        </div>
      )}

      {showModal && <CustomerModal editItem={editItem} onClose={closeModal} />}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="Customer Master"
        templateColumns={templateColumns}
        importUrl="/api/customers/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
