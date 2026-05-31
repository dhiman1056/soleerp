import React, { useState, useEffect } from 'react'
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment
} from '../../hooks/useDepartments'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'

// ─── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  dept_name:   '',
  discount: '',
}



// ─── Modal ─────────────────────────────────────────────────────────────────────
function DepartmentModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateDepartment()
  const updateMut = useUpdateDepartment()
  const pending   = createMut.isPending || updateMut.isPending

  const [form, setForm]   = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        dept_name: editItem.dept_name || '',
        discount: editItem.discount || '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
  }, [editItem])

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.dept_name.trim()) errs.dept_name = 'Department name is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      dept_name: form.dept_name.trim(),
      discount: form.discount || null,
    }

    if (isEdit) {
      updateMut.mutate(
        { id: editItem.id, data: payload },
        {
          onSuccess: () => { toast.success('Department updated'); onClose() },
          onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Department created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Edit Department' : 'Add New Department'}
            </h3>
            {isEdit && (
              <p className="text-xs text-gray-500 mt-0.5 font-mono font-semibold tracking-wide">
                {editItem.dept_code}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Auto Code - Read Only */}
          <div>
            <label className="label">Department Code</label>
            <input
              value={isEdit ? editItem.dept_code : "Auto Generated (DEPT-0001)"}
              disabled
              className="input-field bg-gray-50 text-gray-500 font-mono"
            />
          </div>

          {/* Department Name */}
          <div>
            <label className="label">Department Name *</label>
            <input
              type="text"
              required
              className={`input-field ${errors.dept_name ? 'border-red-400 focus:ring-red-300' : ''}`}
              placeholder="Enter department name"
              value={form.dept_name}
              onChange={set('dept_name')}
              autoFocus
            />
            {errors.dept_name && <p className="mt-1 text-xs text-red-500">{errors.dept_name}</p>}
          </div>

          {/* Discount */}
          <div>
            <label className="label">Discount %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="input-field"
              placeholder="0.00"
              value={form.discount}
              onChange={set('discount')}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DepartmentMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]         = useState('')
  const [filterActive, setFilterActive]     = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editItem, setEditItem]     = useState(null)
  const [showImport, setShowImport] = useState(false)

  const templateColumns = [
    {
      key: 'dept_name',
      label: 'Department Name',
      required: true,
      example: 'Production',
      example2: 'Quality Control'
    },
    {
      key: 'discount',
      label: 'Discount %',
      required: false,
      example: '5',
      example2: '0',
      note: '0 to 100'
    }
  ]

  // Filters for query
  const params = {}
  if (search.trim())      params.search      = search.trim()
  if (filterActive !== '') params.is_active  = filterActive

  const { data, isLoading, refetch } = useDepartments(params)
  const updateMut = useUpdateDepartment()

  const departments = Array.isArray(data)    ? data    : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (d) => { setEditItem(d);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (dept) => {
    updateMut.mutate(
      { id: dept.id, data: { is_active: !dept.is_active } },
      {
        onSuccess: () => toast.success(`Department ${dept.is_active ? 'deactivated' : 'activated'}`),
        onError:   ()  => toast.error('Failed to update status')
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Department Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage production departments — codes auto-generated (DEPT-0001…)
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-3">
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
            <button
              id="btn-add-department"
              onClick={openCreate}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Department
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            id="dept-search"
            className="input-field pl-9"
            placeholder="Search by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <select
          id="dept-status-filter"
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
                  <th className="px-5 py-3">Department Name</th>
                  <th className="px-5 py-3">Discount %</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>
                          No departments found.
                          {canEdit && ' Click "Add Department" to get started.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : departments.map(d => (
                  <tr
                    key={d.id}
                    className={`hover:bg-gray-50/60 transition-colors ${!d.is_active ? 'opacity-55' : ''}`}
                  >
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-indigo-700 text-xs whitespace-nowrap">
                      {d.dept_code}
                    </td>

                    {/* Name */}
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {d.dept_name}
                    </td>

                    {/* Discount */}
                    <td className="px-5 py-3">
                      {d.discount ? `${d.discount}%` : '—'}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        d.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button
                          onClick={() => openEdit(d)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(d)}
                          className={`text-xs font-semibold ${
                            d.is_active
                              ? 'text-red-500 hover:text-red-700'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {d.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer row count */}
          {departments.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                {departments.length} {departments.length === 1 ? 'department' : 'departments'} found
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <DepartmentModal editItem={editItem} onClose={closeModal} />
      )}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="Department Master"
        templateColumns={templateColumns}
        importUrl="/departments/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
