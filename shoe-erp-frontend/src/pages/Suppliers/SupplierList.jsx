import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSuppliersQuery } from '../../hooks/useSuppliers'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/formatCurrency'
import Loader from '../../components/common/Loader'
import SupplierForm from './SupplierForm'

export default function SupplierList() {
  const [search,       setSearch]       = useState('')
  const [isModalOpen,  setIsModalOpen]  = useState(false)

  // useSuppliersQuery now returns the array directly
  const { data, isLoading } = useSuppliersQuery({ search })
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const suppliers = Array.isArray(data) ? data : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search suppliers..."
            className="input-field max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {['admin', 'manager'].includes(user?.role) && (
            <button onClick={() => setIsModalOpen(true)} className="btn-primary shrink-0">
              New Supplier
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8"><Loader /></div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No suppliers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">City</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Payment Terms</th>
                  <th className="px-5 py-3 text-right">Outstanding</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map(sup => (
                  <tr key={sup.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-mono font-medium text-gray-900">{sup.supplier_code}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{sup.supplier_name}</td>
                    <td className="px-5 py-3 text-gray-600">{sup.city || '-'}</td>
                    <td className="px-5 py-3 text-gray-600">{sup.phone || '-'}</td>
                    <td className="px-5 py-3 text-gray-600 truncate max-w-xs">{sup.payment_terms || '-'}</td>
                    <td className="px-5 py-3 text-right font-medium">
                      <span className={(Number(sup.outstanding_balance) || 0) > 0 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                        {formatCurrency(sup.outstanding_balance)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${sup.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {sup.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => navigate(`/suppliers/${sup.id}`)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && <SupplierForm onClose={() => setIsModalOpen(false)} />}
    </div>
  )
}
