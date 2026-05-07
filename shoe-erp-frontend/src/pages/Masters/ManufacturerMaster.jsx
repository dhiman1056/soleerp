import React, { useState, useEffect } from 'react'
import { useManufacturers, useCreateManufacturer, useUpdateManufacturer, useDeleteManufacturer } from '../../hooks/useManufacturers'
import { useBrands } from '../../hooks/useBrands'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

const EMPTY = {
  mfr_name:'', description:'', brand_id:'',
  licence_no:'', gstin:'', msme_certificate:'',
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

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-2 pt-2 pb-1 border-b border-gray-100">
    <span className="text-gray-400">{icon}</span>
    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h4>
  </div>
)

function ManufacturerModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateManufacturer()
  const updateMut = useUpdateManufacturer()
  const pending   = createMut.isPending || updateMut.isPending

  const { data: brandData } = useBrands({ is_active: 'true' })
  const brands = Array.isArray(brandData) ? brandData : []

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        mfr_name:         editItem.mfr_name         || '',
        description:      editItem.description       || '',
        brand_id:         editItem.brand_id ? String(editItem.brand_id) : '',
        licence_no:       editItem.licence_no        || '',
        gstin:            editItem.gstin             || '',
        msme_certificate: editItem.msme_certificate  || '',
        address:          editItem.address           || '',
        city:             editItem.city              || '',
        state:            editItem.state             || '',
        pincode:          editItem.pincode           || '',
        contact_person:   editItem.contact_person    || '',
        contact_mobile:   editItem.contact_mobile    || '',
        email:            editItem.email             || '',
        customer_care_no: editItem.customer_care_no  || '',
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
    if (!form.mfr_name.trim()) { setErrors({ mfr_name: 'Manufacturer name is required' }); return }

    const payload = {
      ...form,
      mfr_name: form.mfr_name.trim(),
      brand_id: form.brand_id ? Number(form.brand_id) : null,
    }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('Manufacturer updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Manufacturer created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  const inp = (key, placeholder, type = 'text') => (
    <input
      id={`mfr_${key}`} type={type}
      className={`input-field ${errors[key] ? 'border-red-400' : ''}`}
      value={form[key]} onChange={set(key)} placeholder={placeholder}
    />
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Manufacturer' : 'Add New Manufacturer'}</h3>
            {isEdit && editItem.mfr_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.mfr_code}</p>
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
          <SectionHeader icon="🏭" title="Basic Info" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Manufacturer Name" required error={errors.mfr_name}>
                {inp('mfr_name', 'e.g. ABC Footwear Pvt Ltd')}
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea id="mfr_desc" className="input-field resize-none" rows={2}
                  value={form.description} onChange={set('description')} placeholder="Optional description…" />
              </Field>
            </div>
            <Field label="Brand">
              <select id="mfr_brand" className="input-field" value={form.brand_id} onChange={set('brand_id')}>
                <option value="">— No Brand —</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.brand_name}{b.brand_code ? ` (${b.brand_code})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Licence No">{inp('licence_no', 'Licence number')}</Field>
            <Field label="GSTIN">{inp('gstin', '22AAAAA0000A1Z5')}</Field>
            <Field label="MSME Certificate">{inp('msme_certificate', 'MSME cert number')}</Field>
          </div>

          {/* ── Section 2: Address ── */}
          <SectionHeader icon="📍" title="Address" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Address">
                <textarea id="mfr_addr" className="input-field resize-none" rows={2}
                  value={form.address} onChange={set('address')} placeholder="Street / Area" />
              </Field>
            </div>
            <Field label="City">{inp('city', 'City')}</Field>
            <Field label="State">{inp('state', 'State')}</Field>
            <Field label="Pincode">{inp('pincode', '400001')}</Field>
          </div>

          {/* ── Section 3: Contact ── */}
          <SectionHeader icon="📞" title="Contact" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact Person">{inp('contact_person', 'Full name')}</Field>
            <Field label="Contact Mobile">{inp('contact_mobile', '+91 98765 43210')}</Field>
            <Field label="Email">{inp('email', 'info@manufacturer.com', 'email')}</Field>
            <Field label="Customer Care No">{inp('customer_care_no', '1800-xxx-xxxx')}</Field>
          </div>

          {/* Auto-code banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Code auto-generated on save (MFR-0001, MFR-0002…)</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update' : 'Create Manufacturer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ManufacturerMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]         = useState('')
  const [filterBrand, setFilterBrand]   = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterBrand)         params.brand_id  = filterBrand
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading } = useManufacturers(params)
  const { data: brandData } = useBrands({ is_active: 'true' })
  const updateMut = useUpdateManufacturer()

  const manufacturers = Array.isArray(data)      ? data      : []
  const brands        = Array.isArray(brandData) ? brandData : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (m) => { setEditItem(m);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (m) => {
    updateMut.mutate(
      { id: m.id, data: { is_active: !m.is_active } },
      {
        onSuccess: () => toast.success(`Manufacturer ${m.is_active ? 'deactivated' : 'activated'}`),
        onError:   ()  => toast.error('Failed to update status')
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Manufacturer Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage shoe manufacturers — codes auto-generated (MFR-0001…)</p>
        </div>
        {canEdit && (
          <button id="btn-add-manufacturer" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Manufacturer
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="mfr-search" className="input-field pl-9" placeholder="Search by name, code, city or contact…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="mfr-brand-filter" className="input-field w-auto min-w-[150px]"
          value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
          <option value="">All Brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
        </select>
        <select id="mfr-status-filter" className="input-field w-auto min-w-[140px]"
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
                  <th className="px-5 py-3">Manufacturer</th>
                  <th className="px-5 py-3 hidden md:table-cell">Brand</th>
                  <th className="px-5 py-3 hidden lg:table-cell">City</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Contact</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {manufacturers.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>No manufacturers found.{canEdit && ' Click "Add Manufacturer" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : manufacturers.map(m => (
                  <tr key={m.id} className={`hover:bg-gray-50/60 transition-colors ${!m.is_active ? 'opacity-55' : ''}`}>
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-emerald-700">{m.mfr_code}</td>

                    {/* Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {m.mfr_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">{m.mfr_name}</p>
                          {m.gstin && <p className="text-xs text-gray-400 font-mono">{m.gstin}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Brand */}
                    <td className="px-5 py-3 hidden md:table-cell">
                      {m.brand_name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                          <span className="text-xs text-gray-700 font-medium">{m.brand_name}</span>
                          {m.brand_code && <span className="text-xs text-gray-400 font-mono">({m.brand_code})</span>}
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>

                    {/* City */}
                    <td className="px-5 py-3 hidden lg:table-cell text-gray-600 text-xs">
                      {m.city && m.state ? `${m.city}, ${m.state}` : m.city || m.state || '—'}
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {m.contact_person ? (
                        <div>
                          <p className="text-xs font-medium text-gray-700">{m.contact_person}</p>
                          {m.contact_mobile && <p className="text-xs text-gray-400">{m.contact_mobile}</p>}
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button onClick={() => openEdit(m)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
                        <button onClick={() => handleToggle(m)} className={`text-xs font-semibold ${m.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {m.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {manufacturers.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{manufacturers.length} {manufacturers.length === 1 ? 'manufacturer' : 'manufacturers'} found</p>
            </div>
          )}
        </div>
      )}

      {showModal && <ManufacturerModal editItem={editItem} onClose={closeModal} />}
    </div>
  )
}
