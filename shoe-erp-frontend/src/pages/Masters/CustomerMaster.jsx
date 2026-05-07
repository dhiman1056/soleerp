import React, { useState, useEffect } from 'react'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '../../hooks/useCustomers'
import { useBrands } from '../../hooks/useBrands'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

const EMPTY = {
  cust_name:'', description:'', brand_id:'',
  gstin:'', msme_certificate:'', credit_limit:'', payment_terms:'',
  address:'', city:'', state:'', pincode:'',
  contact_person:'', contact_mobile:'', email:'', customer_care_no:''
}

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

const SectionHeader = ({ emoji, title }) => (
  <div className="flex items-center gap-2 pt-1 pb-1 border-b border-gray-100">
    <span>{emoji}</span>
    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h4>
  </div>
)

function CustomerModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateCustomer()
  const updateMut = useUpdateCustomer()
  const pending   = createMut.isPending || updateMut.isPending

  const { data: brandData } = useBrands({ is_active: 'true' })
  const brands = Array.isArray(brandData) ? brandData : []

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        cust_name:        editItem.cust_name         || '',
        description:      editItem.description        || '',
        brand_id:         editItem.brand_id ? String(editItem.brand_id) : '',
        gstin:            editItem.gstin              || '',
        msme_certificate: editItem.msme_certificate   || '',
        credit_limit:     editItem.credit_limit != null ? String(editItem.credit_limit) : '',
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.cust_name.trim()) { setErrors({ cust_name: 'Customer name is required' }); return }

    const payload = { ...form, brand_id: form.brand_id ? Number(form.brand_id) : null, credit_limit: parseFloat(form.credit_limit) || 0 }
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

  const inp = (key, placeholder, type = 'text') => (
    <input id={`cust_${key}`} type={type} className={`input-field ${errors[key] ? 'border-red-400' : ''}`}
      value={form[key]} onChange={set(key)} placeholder={placeholder} />
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Customer' : 'Add New Customer'}</h3>
            {isEdit && editItem.cust_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.cust_code}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* ── Section 1: Basic Info ── */}
          <SectionHeader emoji="🧾" title="Basic Info" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Customer Name" required error={errors.cust_name}>
                <input id="cust_name" className={`input-field ${errors.cust_name ? 'border-red-400' : ''}`}
                  value={form.cust_name} onChange={set('cust_name')} placeholder="e.g. Reliance Footwear Ltd" autoFocus />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea id="cust_desc" className="input-field resize-none" rows={2}
                  value={form.description} onChange={set('description')} placeholder="Optional description…" />
              </Field>
            </div>
            <Field label="Brand">
              <select id="cust_brand" className="input-field" value={form.brand_id} onChange={set('brand_id')}>
                <option value="">— No Brand —</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}{b.brand_code ? ` (${b.brand_code})` : ''}</option>)}
              </select>
            </Field>
            <Field label="GSTIN">{inp('gstin', '22AAAAA0000A1Z5')}</Field>
            <Field label="MSME Certificate">{inp('msme_certificate', 'MSME cert number')}</Field>
            <Field label="Credit Limit (₹)">{inp('credit_limit', '0', 'number')}</Field>
            <div className="sm:col-span-2">
              <Field label="Payment Terms">{inp('payment_terms', 'e.g. Net 30, COD, Advance')}</Field>
            </div>
          </div>

          {/* ── Section 2: Address ── */}
          <SectionHeader emoji="📍" title="Address" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Address">
                <textarea id="cust_addr" className="input-field resize-none" rows={2}
                  value={form.address} onChange={set('address')} placeholder="Street / Area" />
              </Field>
            </div>
            <Field label="City">{inp('city', 'City')}</Field>
            <Field label="State">{inp('state', 'State')}</Field>
            <Field label="Pincode">{inp('pincode', '400001')}</Field>
          </div>

          {/* ── Section 3: Contact ── */}
          <SectionHeader emoji="📞" title="Contact" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact Person">{inp('contact_person', 'Full name')}</Field>
            <Field label="Contact Mobile">{inp('contact_mobile', '+91 98765 43210')}</Field>
            <Field label="Email">{inp('email', 'info@customer.com', 'email')}</Field>
            <Field label="Customer Care No">{inp('customer_care_no', '1800-xxx-xxxx')}</Field>
          </div>

          {/* Auto-code banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Code auto-generated on save (CUST-0001, CUST-0002…)</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
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

  const [search, setSearch]         = useState('')
  const [filterBrand, setFilterBrand]   = useState('')
  const [filterState, setFilterState]   = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterBrand)         params.brand_id  = filterBrand
  if (filterState.trim())  params.state     = filterState.trim()
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading } = useCustomers(params)
  const { data: brandData } = useBrands({ is_active: 'true' })
  const updateMut = useUpdateCustomer()

  const customers = Array.isArray(data)      ? data      : []
  const brands    = Array.isArray(brandData) ? brandData : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (c) => { setEditItem(c);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (c) => {
    updateMut.mutate({ id: c.id, data: { is_active: !c.is_active } }, {
      onSuccess: () => toast.success(`Customer ${c.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  const formatCurrency = (val) =>
    val != null && val > 0
      ? `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
      : '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customer Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage customers — codes auto-generated (CUST-0001…)</p>
        </div>
        {canEdit && (
          <button id="btn-add-customer" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="cust-search" className="input-field pl-9" placeholder="Search by name, code, city or GSTIN…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="cust-brand-filter" className="input-field w-auto min-w-[150px]"
          value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
          <option value="">All Brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
        </select>
        <input id="cust-state-filter" className="input-field w-auto min-w-[130px]" placeholder="Filter by state…"
          value={filterState} onChange={e => setFilterState(e.target.value)} />
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
                  <th className="px-5 py-3 hidden md:table-cell">Brand</th>
                  <th className="px-5 py-3 hidden lg:table-cell">City / State</th>
                  <th className="px-5 py-3 hidden lg:table-cell">GSTIN</th>
                  <th className="px-5 py-3 hidden xl:table-cell text-right">Credit Limit</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="p-10 text-center text-gray-400">
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
                    <td className="px-5 py-3 hidden md:table-cell">
                      {c.brand_name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                          <span className="text-xs text-gray-700 font-medium">{c.brand_name}</span>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-gray-600">
                      {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {c.gstin ? <span className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{c.gstin}</span> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 hidden xl:table-cell text-right">
                      <span className={`text-xs font-semibold ${c.credit_limit > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {formatCurrency(c.credit_limit)}
                      </span>
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
    </div>
  )
}
