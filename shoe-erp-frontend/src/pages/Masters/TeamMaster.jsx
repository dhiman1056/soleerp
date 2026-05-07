import React, { useState, useEffect } from 'react'
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam } from '../../hooks/useTeams'
import { useDivisions } from '../../hooks/useDivisions'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

const EMPTY = { team_name: '', description: '', division_id: '' }

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Hierarchy breadcrumb ──────────────────────────────────────────────────────
const HierarchyBreadcrumb = ({ location_name, div_name, team_name }) => {
  const parts = [location_name, div_name, team_name].filter(Boolean)
  if (!parts.length) return null
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
            i === 0 ? 'bg-sky-50 text-sky-700 border border-sky-100' :
            i === 1 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-100'
          }`}>{p}</span>
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function TeamModal({ editItem, onClose }) {
  const isEdit    = !!editItem
  const createMut = useCreateTeam()
  const updateMut = useUpdateTeam()
  const pending   = createMut.isPending || updateMut.isPending

  const { data: divisionData } = useDivisions({ is_active: 'true' })
  const divisions = Array.isArray(divisionData) ? divisionData : []

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editItem) {
      setForm({
        team_name:   editItem.team_name   || '',
        description: editItem.description || '',
        division_id: editItem.division_id ? String(editItem.division_id) : '',
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
    if (!form.team_name.trim()) errs.team_name   = 'Team name is required'
    if (!form.division_id)      errs.division_id = 'Division is required to save team'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      team_name:   form.team_name.trim(),
      description: form.description || null,
      division_id: Number(form.division_id),
    }

    if (isEdit) {
      updateMut.mutate({ id: editItem.id, data: payload }, {
        onSuccess: () => { toast.success('Team updated'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Update failed')
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Team created'); onClose() },
        onError:   (err) => toast.error(err?.response?.data?.message || 'Create failed')
      })
    }
  }

  // Selected division record for hierarchy preview
  const selDiv = divisions.find(d => String(d.id) === String(form.division_id))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Team' : 'Add New Team'}</h3>
            {isEdit && editItem.team_code && (
              <p className="text-xs font-mono font-semibold text-gray-500 mt-0.5">{editItem.team_code}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Team Name */}
          <Field label="Team Name" required error={errors.team_name}>
            <input id="team_name"
              className={`input-field ${errors.team_name ? 'border-red-400' : ''}`}
              value={form.team_name} onChange={set('team_name')}
              placeholder="e.g. Cutting Team A, Stitching B, Finishing" autoFocus />
          </Field>

          {/* Division — required */}
          <Field label="Division" required error={errors.division_id}>
            <select id="team_division"
              className={`input-field ${errors.division_id ? 'border-red-400' : ''}`}
              value={form.division_id} onChange={set('division_id')}>
              <option value="">— Select Division —</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>{d.div_name} ({d.div_code})</option>
              ))}
            </select>
          </Field>

          {/* Hierarchy preview */}
          {selDiv && (
            <div className="px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 space-y-1.5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Hierarchy</p>
              <HierarchyBreadcrumb
                location_name={selDiv.location_name}
                div_name={selDiv.div_name}
                team_name={form.team_name.trim() || null}
              />
            </div>
          )}

          {/* Description */}
          <Field label="Description">
            <textarea id="team_desc" className="input-field resize-none" rows={2}
              value={form.description} onChange={set('description')}
              placeholder="Optional — shift, specialization, capacity…" />
          </Field>

          {/* Auto-code banner */}
          {!isEdit && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">Code auto-generated on save (TEAM-0001…). Division is mandatory.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Update Team' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamMaster() {
  const { user } = useAuth()
  const canEdit  = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch]             = useState('')
  const [filterDivision, setFilterDivision] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [editItem, setEditItem]         = useState(null)

  const params = {}
  if (search.trim())       params.search      = search.trim()
  if (filterDivision)      params.division_id = filterDivision
  if (filterActive !== '') params.is_active   = filterActive

  const { data, isLoading }        = useTeams(params)
  const { data: divisionData }     = useDivisions({ is_active: 'true' })
  const updateMut = useUpdateTeam()

  const teams     = Array.isArray(data)         ? data         : []
  const divisions = Array.isArray(divisionData) ? divisionData : []

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (t) => { setEditItem(t);   setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleToggle = (t) => {
    updateMut.mutate({ id: t.id, data: { is_active: !t.is_active } }, {
      onSuccess: () => toast.success(`Team ${t.is_active ? 'deactivated' : 'activated'}`),
      onError:   ()  => toast.error('Failed to update status')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Team Master</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage production teams — codes auto-generated (TEAM-0001…)
          </p>
        </div>
        {canEdit && (
          <button id="btn-add-team" onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Team
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input id="team-search" className="input-field pl-9" placeholder="Search by name or code…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="team-division-filter" className="input-field w-auto min-w-[180px]"
          value={filterDivision} onChange={e => setFilterDivision(e.target.value)}>
          <option value="">All Divisions</option>
          {divisions.map(d => <option key={d.id} value={d.id}>{d.div_name} ({d.div_code})</option>)}
        </select>
        <select id="team-status-filter" className="input-field w-auto min-w-[140px]"
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
                  <th className="px-5 py-3">Team Name</th>
                  <th className="px-5 py-3">Division</th>
                  <th className="px-5 py-3 hidden md:table-cell">Location</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Description</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>No teams found.{canEdit && ' Click "Add Team" to get started.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : teams.map(t => (
                  <tr key={t.id} className={`hover:bg-gray-50/60 transition-colors ${!t.is_active ? 'opacity-55' : ''}`}>
                    {/* Code */}
                    <td className="px-5 py-3 font-mono font-bold text-xs whitespace-nowrap text-emerald-700">{t.team_code}</td>

                    {/* Team Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {t.team_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{t.team_name}</span>
                      </div>
                    </td>

                    {/* Division */}
                    <td className="px-5 py-3">
                      {t.div_name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded font-mono font-bold text-xs">
                            {t.div_code}
                          </span>
                          <span className="text-xs text-gray-600 truncate">{t.div_name}</span>
                        </div>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>

                    {/* Location */}
                    <td className="px-5 py-3 hidden md:table-cell">
                      {t.location_name ? (
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs text-gray-600">{t.location_name}</span>
                        </div>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-gray-400 max-w-[180px]">
                      <span className="truncate block">{t.description || '—'}</span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                        <button onClick={() => openEdit(t)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
                        <button onClick={() => handleToggle(t)} className={`text-xs font-semibold ${t.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {t.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {teams.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{teams.length} {teams.length === 1 ? 'team' : 'teams'} found</p>
            </div>
          )}
        </div>
      )}

      {showModal && <TeamModal editItem={editItem} onClose={closeModal} />}
    </div>
  )
}
