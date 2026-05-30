import React, { useState, useEffect } from 'react'
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany
} from '../../hooks/useCompany'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

// ─── Empty form state ────────────────────────────────────────────────────────
const EMPTY_FORM = {
  company_name:    '',
  description:     '',
  licence_no:      '',
  gstin:           '',
  address:         '',
  state:           '',
  city:            '',
  pincode:         '',
  contact_person:  '',
  contact_mobile:  '',
  email:           '',
  customer_care_no:'',
  msme_certificate:'',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div>
    <label className="label">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
)

// ─── Modal ───────────────────────────────────────────────────────────────────
function CompanyModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateCompany()
  const updateMut = useUpdateCompany()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (editItem) {
      setForm({
        company_name:    editItem.company_name    || '',
        description:     editItem.description     || '',
        licence_no:      editItem.licence_no      || '',
        gstin:           editItem.gstin           || '',
        address:         editItem.address         || '',
        state:           editItem.state           || '',
        city:            editItem.city            || '',
        pincode:         editItem.pincode         || '',
        contact_person:  editItem.contact_person  || '',
        contact_mobile:  editItem.contact_mobile  || '',
        email:           editItem.email           || '',
        customer_care_no:editItem.customer_care_no|| '',
        msme_certificate:editItem.msme_certificate|| '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [editItem])

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()

    const companyName = form.company_name.trim()
    if (!companyName) {
      toast.error('Company Name is required')
      return
    }

    const mobile = form.contact_mobile.trim()
    if (mobile && !/^\d{10}$/.test(mobile)) {
      toast.error('Contact Mobile must be a valid 10-digit number')
      return
    }

    const email = form.email.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid Email address')
      return
    }

    const pincode = form.pincode.trim()
    if (pincode && !/^\d{6}$/.test(pincode)) {
      toast.error('Pincode must be a valid 6-digit number')
      return
    }

    const gstin = form.gstin.trim()
    if (gstin && gstin.length !== 15) {
      toast.error('GSTIN must be exactly 15 characters long')
      return
    }

    if (isEdit) {
      updateMut.mutate(
        { id: editItem.id, data: form },
        {
          onSuccess: () => { toast.success('Company updated'); onClose() },
          onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
        }
      )
    } else {
      createMut.mutate(form, {
        onSuccess: () => { toast.success('Company created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Edit Company' : 'Add New Company'}
            </h3>
            {isEdit && (
              <p className="text-xs text-gray-500 mt-0.5 font-mono font-semibold">
                {editItem.company_code}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Section: Basic Info */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Basic Information</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Company Name" required>
                  <input
                    id="company_name"
                    className="input-field"
                    value={form.company_name}
                    onChange={set('company_name')}
                    placeholder="e.g. Sole Craft Industries Pvt Ltd"
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Description">
                  <textarea
                    id="description"
                    className="input-field resize-none"
                    rows={2}
                    value={form.description}
                    onChange={set('description')}
                    placeholder="Short description of the company…"
                  />
                </Field>
              </div>
              <Field label="Licence No">
                <input
                  id="licence_no"
                  className="input-field"
                  value={form.licence_no}
                  onChange={set('licence_no')}
                  placeholder="Factory / trade licence number"
                />
              </Field>
              <Field label="GSTIN">
                <input
                  id="gstin"
                  className="input-field uppercase"
                  value={form.gstin}
                  onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </Field>
            </div>
          </div>

          {/* Section: Address */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Address</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Address">
                  <textarea
                    id="address"
                    className="input-field resize-none"
                    rows={2}
                    value={form.address}
                    onChange={set('address')}
                    placeholder="Street / Building / Area"
                  />
                </Field>
              </div>
              <Field label="City">
                <input
                  id="city"
                  className="input-field"
                  value={form.city}
                  onChange={set('city')}
                  placeholder="City"
                />
              </Field>
              <Field label="State">
                <input
                  id="state"
                  className="input-field"
                  value={form.state}
                  onChange={set('state')}
                  placeholder="State"
                />
              </Field>
              <Field label="Pincode">
                <input
                  id="pincode"
                  className="input-field"
                  value={form.pincode}
                  onChange={set('pincode')}
                  placeholder="PIN Code (6 digits)"
                  maxLength={6}
                />
              </Field>
            </div>
          </div>

          {/* Section: Contact */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact Person">
                <input
                  id="contact_person"
                  className="input-field"
                  value={form.contact_person}
                  onChange={set('contact_person')}
                  placeholder="Primary contact name"
                />
              </Field>
              <Field label="Contact Mobile">
                <input
                  id="contact_mobile"
                  className="input-field"
                  value={form.contact_mobile}
                  onChange={set('contact_mobile')}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
              </Field>
              <Field label="Email">
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="company@example.com"
                />
              </Field>
              <Field label="Customer Care No">
                <input
                  id="customer_care_no"
                  className="input-field"
                  value={form.customer_care_no}
                  onChange={set('customer_care_no')}
                  placeholder="Toll-free / helpdesk number"
                  maxLength={20}
                />
              </Field>
            </div>
          </div>

          {/* Section: Compliance */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Compliance</p>
            <div className="grid grid-cols-1 gap-4">
              <Field label="MSME Certificate No">
                <input
                  id="msme_certificate"
                  className="input-field"
                  value={form.msme_certificate}
                  onChange={set('msme_certificate')}
                  placeholder="MSME registration number"
                />
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={pending}
            >
              {pending ? 'Saving…' : isEdit ? 'Update Company' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompanyMaster() {
  const { user }   = useAuth()
  const canEdit    = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]     = useState('')
  const [filterActive, setFilterActive] = useState('') // '' | 'true' | 'false'
  const [showModal, setShowModal]   = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const params = {}
  if (search.trim())    params.search    = search.trim()
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading } = useCompanies(params)
  const updateMut  = useUpdateCompany()
  const deleteMut  = useDeleteCompany()

  const companies = Array.isArray(data) ? data : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (c)  => { setEditItem(c);  setShowModal(true) }
  const closeModal = ()   => { setShowModal(false); setEditItem(null) }

  const handleToggle = (company) => {
    updateMut.mutate(
      { id: company.id, data: { is_active: !company.is_active } },
      {
        onSuccess: () => toast.success(`Company ${company.is_active ? 'deactivated' : 'activated'}`),
        onError:   ()  => toast.error('Failed to update status')
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Company Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage company profiles — codes auto-generated (COMP-0001…)
          </p>
        </div>
        {canEdit && (
          <button
            id="btn-add-company"
            onClick={openCreate}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Company
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            id="company-search"
            className="input-field pl-9"
            placeholder="Search by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          id="company-status-filter"
          className="input-field w-auto min-w-[140px]"
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
        >
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
                  <th className="px-5 py-3">Company Name</th>
                  <th className="px-5 py-3 hidden md:table-cell">City</th>
                  <th className="px-5 py-3 hidden md:table-cell">State</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Contact</th>
                  <th className="px-5 py-3 hidden lg:table-cell">GSTIN</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>No companies found.{canEdit && ' Click "Add Company" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : companies.map(c => (
                  <tr
                    key={c.id}
                    className={`hover:bg-gray-50/60 transition-colors ${!c.is_active ? 'opacity-55' : ''}`}
                  >
                    <td className="px-5 py-3 font-mono font-bold text-blue-700 text-xs whitespace-nowrap">
                      {c.company_code}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-gray-900 leading-tight">{c.company_name}</div>
                      {c.description && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{c.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{c.city || '—'}</td>
                    <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{c.state || '—'}</td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {c.contact_person
                        ? <div>
                            <div className="text-gray-800 text-xs font-medium">{c.contact_person}</div>
                            {c.contact_mobile && <div className="text-gray-400 text-xs">{c.contact_mobile}</div>}
                          </div>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <span className="font-mono text-xs text-gray-600">{c.gstin || '—'}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        c.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(c)}
                          className={`text-xs font-semibold ${
                            c.is_active
                              ? 'text-red-500 hover:text-red-700'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {c.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {companies.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                {companies.length} {companies.length === 1 ? 'company' : 'companies'} found
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CompanyModal editItem={editItem} onClose={closeModal} />
      )}
    </div>
  )
}
