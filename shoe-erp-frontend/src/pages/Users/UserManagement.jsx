import React from 'react';
import { useState } from 'react'
import { useUsersQuery, useCreateUser, useUpdateUser, useResetPassword } from '../../hooks/useUsers'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import { formatDate } from '../../utils/formatDate'
import toast from 'react-hot-toast'

export default function UserManagement() {
  const { user } = useAuth()
  const { data, isLoading } = useUsersQuery()
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">UNAUTHORIZED: Admin access only.</div>
  }

  const usersList = data?.data || []

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
         <button onClick={() => { setEditUser(null); setShowModal(true); }} className="btn-primary">
           + Provision User
         </button>
       </div>

       <div className="card overflow-x-auto">
         {isLoading ? <div className="p-8"><Loader/></div> : (
           <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-semibold">
               <tr>
                 <th className="px-5 py-4">User</th>
                 <th className="px-5 py-4">Role & Dept</th>
                 <th className="px-5 py-4">Last Login</th>
                 <th className="px-5 py-4 text-center">Status</th>
                 <th className="px-5 py-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
               {usersList.map(u => (
                 <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-bold text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500 email-mono">{u.email}</p>
                      {u.phone && <p className="text-[10px] text-gray-400 mt-0.5">{u.phone}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {u.role}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{u.department || 'General'}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {u.last_login ? formatDate(u.last_login) : 'Never'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => { setEditUser(u); setShowModal(true); }} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">
                        Manage
                      </button>
                    </td>
                 </tr>
               ))}
             </tbody>
           </table>
         )}
       </div>

       {showModal && <UserModal userObj={editUser} onClose={() => setShowModal(false)} />}
    </div>
  )
}

function UserModal({ userObj, onClose }) {
  const isEdit = !!userObj
  const [form, setForm] = useState(userObj || { name: '', email: '', password: '', role: 'operator', phone: '', department: '', is_active: true })
  const [resetPwd, setResetPwd] = useState('')

  const createMut = useCreateUser()
  const updateMut = useUpdateUser()
  const resetMut = useResetPassword()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isEdit) {
      updateMut.mutate({ id: userObj.id, ...form }, { onSuccess: () => { toast.success('Updated'); onClose(); } })
    } else {
      createMut.mutate(form, { onSuccess: () => { toast.success('Provisioned'); onClose(); } })
    }
  }

  const doReset = () => {
    if (!resetPwd) return toast.error('Enter a new password string')
    resetMut.mutate({ id: userObj.id, new_password: resetPwd }, {
      onSuccess: () => { toast.success('Password Forced Reset'); setResetPwd(''); }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 overflow-y-auto w-full h-full flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 relative">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{isEdit ? 'Manage User' : 'Provision User'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div><label className="text-xs font-semibold text-gray-600">Full Name *</label><input required className="input-field mt-1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
             <div><label className="text-xs font-semibold text-gray-600">Email Address *</label><input required type="email" className="input-field mt-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
             
             {!isEdit && (
               <div className="col-span-2">
                 <label className="text-xs font-semibold text-gray-600">Initial Password *</label>
                 <input required type="text" className="input-field mt-1" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
               </div>
             )}

             <div>
               <label className="text-xs font-semibold text-gray-600">Security Role *</label>
               <select className="input-field mt-1" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                 <option value="operator">Operator (Manufacturing Only)</option>
                 <option value="manager">Manager (Procurement & Setup)</option>
                 <option value="admin">System Admin</option>
               </select>
             </div>
             <div><label className="text-xs font-semibold text-gray-600">Department</label><input className="input-field mt-1" value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
             <div className="col-span-2"><label className="text-xs font-semibold text-gray-600">Phone</label><input className="input-field mt-1" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
             
             {isEdit && (
               <div className="col-span-2 mt-2">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
                   <span className="text-sm font-medium text-gray-700">Account Active (Allow Login)</span>
                 </label>
               </div>
             )}
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMut.isLoading || updateMut.isLoading} className="btn-primary">
              Save Configuration
            </button>
          </div>
        </form>

        {/* Security Meta Controls */}
        {isEdit && (
          <div className="mt-8 p-4 border border-red-200 bg-red-50 rounded-lg">
             <h3 className="text-sm font-bold text-red-800 mb-2">Force Password Reset</h3>
             <div className="flex gap-2">
               <input type="text" placeholder="Type new password" value={resetPwd} onChange={e=>setResetPwd(e.target.value)} className="input-field py-1 text-sm bg-white border-red-300" />
               <button type="button" onClick={doReset} disabled={resetMut.isLoading} className="btn-secondary border-red-300 text-red-700 hover:bg-red-100 py-1 font-bold shadow-none">Execute</button>
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
