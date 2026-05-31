import React, { useState, useEffect } from 'react'
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from '../../hooks/useEmployees'
import { useTeams } from '../../hooks/useTeams'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import ImportModal from '../../components/shared/ImportModal'

const EMPTY = { emp_name: '', team_id: '', designation: '', mobile: '', email: '' }

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Modal ─────────────────────────────────────────────────────────────────────
function EmployeeModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateEmployee()
  const updateMut = useUpdateEmployee()
  const pending   = createMut.isPending || updateMut.isPending

  const { data: teamData } = useTeams({ is_active: 'true' })
  const teams = Array.isArray(teamData) ? teamData : []

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        emp_name:    editItem.emp_name || '',
        team_id:     editItem.team_id ? String(editItem.team_id) : '',
        designation: editItem.designation || '',
        mobile:      editItem.mobile || '',
        email:       editItem.email || '',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [editItem])

  const set = (key) => (e) => {
    let val = e.target.value
    if (key === 'mobile') {
      // Numbers only, max 10 characters
      val = val.replace(/[^0-9]/g, '').slice(0, 10)
    }
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.emp_name.trim()) {
      errs.emp_name = 'Employee name is required'
    }
    if (form.mobile && form.mobile.length !== 10) {
      errs.mobile = 'Mobile number must be exactly 10 digits'
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address'
    }
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      emp_name:    form.emp_name.trim(),
      team_id:     form.team_id ? Number(form.team_id) : null,
      designation: form.designation.trim() || null,
      mobile:      form.mobile.trim() || null,
      email:       form.email.trim().toLowerCase() || null,
    }

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('Employee updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Employee created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  const selectedTeam = teams.find(t => String(t.id) === String(form.team_id))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h3>
            {isEdit && editItem.emp_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.emp_code}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Employee Code</label>
              <input
                value={isEdit ? editItem.emp_code : "Auto Generated (EMP-0001)"}
                disabled
                className="input-field bg-gray-50 text-gray-500 font-mono"
              />
            </div>

            <Field label="Employee Name" required error={errors.emp_name}>
              <input
                type="text"
                id="emp_name"
                className={`input-field ${errors.emp_name ? 'border-red-400' : ''}`}
                value={form.emp_name}
                onChange={set('emp_name')}
                placeholder="e.g. John Doe"
                autoFocus
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Team (Optional)" error={errors.team_id}>
              <select
                id="emp_team"
                className="input-field"
                value={form.team_id}
                onChange={set('team_id')}
              >
                <option value="">— No Team —</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.team_name} ({t.team_code})
                  </option>
                ))}
              </select>
              {selectedTeam && (
                <p className="text-xs text-blue-600 font-semibold mt-1">
                  Division: {selectedTeam.div_name || '—'}
                </p>
              )}
            </Field>

            <Field label="Designation (Optional)">
              <input
                type="text"
                id="emp_designation"
                className="input-field"
                value={form.designation}
                onChange={set('designation')}
                placeholder="e.g. Supervisor, Operator"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Mobile (Optional)" error={errors.mobile}>
              <input
                type="text"
                id="emp_mobile"
                maxLength={10}
                className={`input-field font-mono ${errors.mobile ? 'border-red-400' : ''}`}
                value={form.mobile}
                onChange={set('mobile')}
                placeholder="10-digit number"
              />
            </Field>

            <Field label="Email Address (Optional)" error={errors.email}>
              <input
                type="email"
                id="emp_email"
                className={`input-field ${errors.email ? 'border-red-400' : ''}`}
                value={form.email}
                onChange={set('email')}
                placeholder="john.doe@company.com"
              />
            </Field>
          </div>

          {/* Auto-code banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Employee Master code will be auto-generated sequentially on save.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]             = useState('')
  const [filterTeam, setFilterTeam]     = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [showImport, setShowImport]     = useState(false)
  const [editItem, setEditItem]         = useState(null)

  const templateColumns = [
    {
      key: 'emp_name',
      label: 'Employee Name',
      required: true,
      example: 'Ramesh Kumar',
      example2: 'Suresh Singh'
    },
    {
      key: 'team_name',
      label: 'Team Name',
      required: false,
      example: 'Cutting Team A',
      example2: '',
      note: 'Must match existing Team Name exactly'
    },
    {
      key: 'designation',
      label: 'Designation',
      required: false,
      example: 'Supervisor',
      example2: 'Operator'
    },
    {
      key: 'mobile',
      label: 'Contact Mobile',
      required: false,
      example: '9876543210',
      example2: '',
      note: '10 digits only'
    },
    {
      key: 'email',
      label: 'Email Address',
      required: false,
      example: 'ramesh@company.com',
      example2: ''
    }
  ]

  const params = {}
  if (search.trim())       params.search    = search.trim()
  if (filterTeam)          params.team_id   = filterTeam
  if (filterActive !== '') params.is_active = filterActive

  const { data, isLoading, refetch } = useEmployees(params)
  const { data: teamData }  = useTeams({ is_active: 'true' })
  const updateMut = useUpdateEmployee()

  const employees = Array.isArray(data) ? data : []
  const teams     = Array.isArray(teamData) ? teamData : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (e) => { setEditItem(e);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (emp) => {
    updateMut.mutate({ id: emp.id, data: { is_active: !emp.is_active } }, {
      onSuccess: () => toast.success(`Employee ${emp.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Employee Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage employees, teams, and production assignments</p>
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
            <button id="btn-add-employee" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="emp-search" className="input-field pl-9" placeholder="Search by name, code or designation…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="emp-team-filter" className="input-field w-auto min-w-[180px]"
          value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
          <option value="">All Teams</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.team_name} ({t.team_code})</option>)}
        </select>
        <select id="emp-status-filter" className="input-field w-auto min-w-[140px]"
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
                  <th className="px-5 py-3">Employee Name</th>
                  <th className="px-5 py-3">Team</th>
                  <th className="px-5 py-3">Division</th>
                  <th className="px-5 py-3">Designation</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>No employees found.{canEdit && ' Click "Add Employee" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : employees.map(e => (
                  <tr key={e.id} className={`hover:bg-gray-50/60 transition-colors ${!e.is_active ? 'opacity-55' : ''}`}>
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-indigo-700">{e.emp_code}</td>

                    {/* Employee Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {e.emp_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block">{e.emp_name}</span>
                          {e.mobile && <span className="text-[10px] text-gray-400 font-mono block">{e.mobile}</span>}
                        </div>
                      </div>
                    </td>

                    {/* Team */}
                    <td className="px-5 py-3">
                      {e.team_name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded font-mono font-bold text-[10px]">
                            {e.team_code}
                          </span>
                          <span className="text-xs text-gray-600 font-medium truncate max-w-[120px]">{e.team_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic">—</span>
                      )}
                    </td>

                    {/* Division */}
                    <td className="px-5 py-3 font-semibold text-gray-700">{e.div_name || <span className="text-gray-300 italic">—</span>}</td>

                    {/* Designation */}
                    <td className="px-5 py-3 text-xs text-gray-500 font-medium">{e.designation || <span className="text-gray-300 italic">—</span>}</td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${e.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {e.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button onClick={() => openEdit(e)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
                        <button onClick={() => handleToggle(e)} className={`text-xs font-semibold ${e.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {e.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {employees.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{employees.length} {employees.length === 1 ? 'employee' : 'employees'} found</p>
            </div>
          )}
        </div>
      )}

      {showModal && <EmployeeModal editItem={editItem} onClose={closeModal} />}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        masterName="Employee Master"
        templateColumns={templateColumns}
        importUrl="/api/employees/import"
        onSuccess={() => { refetch(); setShowImport(false) }}
      />
    </div>
  )
}
