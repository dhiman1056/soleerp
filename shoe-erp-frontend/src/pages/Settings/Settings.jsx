import React from 'react';
import { useState, useEffect } from 'react'
import { useAllSettingsQuery, useUpdateSettings } from '../../hooks/useSettings'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuth()
  const { data, isLoading } = useAllSettingsQuery()
  const updateMut = useUpdateSettings()
  
  const [activeTab, setActiveTab] = useState('COMPANY')
  const [form, setForm] = useState({})

  useEffect(() => {
    if (data?.data) {
      // Map server settings flat array into an object for easier editing
      const mapper = {}
      for (const group of Object.values(data.data)) {
        group.forEach(s => mapper[s.setting_key] = s.setting_value)
      }
      setForm(mapper)
    }
  }, [data])

  if (!['admin', 'manager'].includes(user?.role)) {
    return <div className="p-8 text-center text-gray-500">You do not have permission to access Settings.</div>
  }

  if (isLoading) return <Loader />

  const getGroupFields = (groupQuery) => data?.data?.[groupQuery] || []

  const handleSave = (e) => {
    e.preventDefault()
    // Convert object back into an array to pass to update endpoint
    const updates = Object.keys(form).map(k => ({ key: k, value: form[k] }))
    
    updateMut.mutate(updates, {
      onSuccess: () => toast.success('Settings synchronized successfully.')
    })
  }

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>

       <div className="card overflow-hidden">
         <div className="flex border-b border-gray-100 bg-gray-50/50">
           {['COMPANY', 'FINANCIAL', 'INVENTORY', 'NOTIFICATION'].map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-gray-900 text-gray-900 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
             >
               {tab.charAt(0) + tab.slice(1).toLowerCase()} Settings
             </button>
           ))}
         </div>

         <form onSubmit={handleSave} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
               {getGroupFields(activeTab).map(setting => (
                 <div key={setting.setting_key} className="flex flex-col">
                   <label className="text-xs font-bold text-gray-700 mb-1">
                     {setting.setting_key.replace(/_/g, ' ').toUpperCase()}
                   </label>
                   
                   {/* Handle different data types if needed. Hardcoding typical boolean checking here */}
                   {setting.setting_value === 'true' || setting.setting_value === 'false' ? (
                     <select 
                       className="input-field max-w-sm mt-1"
                       value={form[setting.setting_key] || ''} 
                       onChange={e => setForm({...form, [setting.setting_key]: e.target.value})}
                     >
                       <option value="true">True / Enabled</option>
                       <option value="false">False / Disabled</option>
                     </select>
                   ) : (
                     <input 
                       type="text" 
                       className="input-field mt-1" 
                       value={form[setting.setting_key] || ''} 
                       onChange={e => setForm({...form, [setting.setting_key]: e.target.value})} 
                     />
                   )}
                   {setting.description && <p className="text-[10px] text-gray-400 mt-1">{setting.description}</p>}
                 </div>
               ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
               <button type="submit" disabled={updateMut.isLoading} className="btn-primary w-full md:w-auto px-10 shadow shadow-blue-200">
                 {updateMut.isLoading ? 'Saving...' : 'Save Configuration'}
               </button>
            </div>
         </form>
       </div>
    </div>
  )
}
