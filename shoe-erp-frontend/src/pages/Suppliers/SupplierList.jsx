import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useSuppliersQuery } from '../../hooks/useSuppliers'
import { useStockGroups } from '../../hooks/useDepartments'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/formatCurrency'
import Loader from '../../components/common/Loader'
import SupplierForm from './SupplierForm'
import ImportModal from '../../components/shared/ImportModal'
import toast from 'react-hot-toast'

export default function SupplierList() {
  const [search,           setSearch]           = useState('')
  const [filterStockGroup, setFilterStockGroup] = useState('')
  const [filterType,       setFilterType]       = useState('')
  const [filterStatus,     setFilterStatus]     = useState('ALL')
  const [isModalOpen,      setIsModalOpen]      = useState(false)
  const [editingSupplier,  setEditingSupplier]  = useState(null)
  const [showImport,       setShowImport]       = useState(false)

  const qc = useQueryClient()
  const { data: rawStockGroups = [] } = useStockGroups()
  const stockGroups = Array.isArray(rawStockGroups) ? rawStockGroups : []

  const apiParams = {
    search: search.trim() || undefined,
    stock_group: filterStockGroup || undefined,
    type: filterType || undefined,
    is_active: filterStatus === 'ACTIVE' ? 'true' : filterStatus === 'INACTIVE' ? 'false' : undefined,
  }

  const { data, isLoading } = useSuppliersQuery(apiParams)
  const { user } = useAuth()
  const navigate = useNavigate()

  const rawSuppliers = Array.isArray(data) ? data : []

  // Client-side fallback filtering for instantaneous responsiveness
  const suppliers = useMemo(() => {
    return rawSuppliers.filter(sup => {
      if (filterStatus === 'ACTIVE' && !sup.is_active) return false
      if (filterStatus === 'INACTIVE' && sup.is_active) return false
      if (filterStockGroup) {
        const sg = (sup.stock_group || '').trim().toLowerCase()
        if (sg !== filterStockGroup.trim().toLowerCase()) return false
      }
      if (filterType) {
        const st = (sup.supplier_type || sup.type || '').trim().toUpperCase()
        if (st !== filterType.trim().toUpperCase()) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchCode = (sup.supplier_code || '').toLowerCase().includes(q)
        const matchName = (sup.supplier_name || '').toLowerCase().includes(q)
        const matchCity = (sup.city || '').toLowerCase().includes(q)
        const matchPhone = (sup.phone || '').toLowerCase().includes(q)
        const matchSG = (sup.stock_group || '').toLowerCase().includes(q)
        if (!matchCode && !matchName && !matchCity && !matchPhone && !matchSG) return false
      }
      return true
    })
  }, [rawSuppliers, filterStatus, filterStockGroup, filterType, search])

  // Summary counts
  const totalCount    = rawSuppliers.length
  const activeCount   = rawSuppliers.filter(s => s.is_active).length
  const purchaseCount = rawSuppliers.filter(s => (s.supplier_type || s.type || 'PURCHASE').toUpperCase().includes('PURCHASE')).length
  const jobWorkCount  = rawSuppliers.filter(s => (s.supplier_type || s.type || '').toUpperCase().includes('JOB WORK')).length

  const hasActiveFilters = Boolean(search || filterStockGroup || filterType || filterStatus !== 'ALL')

  const clearFilters = () => {
    setSearch('')
    setFilterStockGroup('')
    setFilterType('')
    setFilterStatus('ALL')
  }

  const exportCsv = () => {
    if (!suppliers.length) {
      toast.error('No supplier records to export.')
      return
    }
    const HEADERS = ['Code', 'Supplier Name', 'Stock Group', 'Type', 'City', 'Phone', 'Email', 'GSTIN', 'Payment Terms', 'Outstanding', 'Status']
    const rows = suppliers.map(s => [
      s.supplier_code || '',
      s.supplier_name || '',
      s.stock_group || '',
      s.supplier_type || s.type || 'PURCHASE',
      s.city || '',
      s.phone || '',
      s.email || '',
      s.gstin || '',
      s.payment_terms || '',
      s.outstanding_balance || 0,
      s.is_active ? 'Active' : 'Inactive'
    ])
    const csvContent = [HEADERS, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Suppliers_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    toast.success('Suppliers exported to CSV')
  }

  const templateColumns = [
    { key: 'supplier_code', label: 'Supplier Code / SUPP CODE', required: false, example: '1', example2: '2', note: 'Leave blank to auto-generate' },
    { key: 'supplier_name', label: 'Supplier Name / SUPPLIER', required: true, example: 'A S APPARELS (JOB WORK)', example2: 'ABP INDUSTRIES' },
    { key: 'stock_group', label: 'Stock Group / STOCK GROUP', required: false, example: 'ACCESSORIES', example2: 'RAW MATERIAL' },
    { key: 'supplier_type', label: 'Type / TYPE', required: false, example: 'PURCHASE', example2: 'JOB WORK', note: 'PURCHASE, JOB WORK, or JOB WORK & PURCHASE' },
    { key: 'contact_person', label: 'Contact Person', required: false, example: 'Rajesh Kumar', example2: 'Amit Verma' },
    { key: 'phone', label: 'Phone', required: false, example: '9876543210', example2: '9812345678' },
    { key: 'email', label: 'Email', required: false, example: 'sales@apexleather.com', example2: 'info@kanpursoles.com' },
    { key: 'gstin', label: 'GSTIN', required: false, example: '07AAAAA0000A1Z5', example2: '09BBBBB1111B2Z6', note: '15 characters if provided' },
    { key: 'payment_terms', label: 'Payment Terms', required: false, example: 'Net 30', example2: 'Immediate' },
    { key: 'credit_limit', label: 'Credit Limit', required: false, example: 50000, example2: 100000 },
    { key: 'address', label: 'Address', required: false, example: 'Plot 45, Industrial Area', example2: '12 Transport Nagar' },
    { key: 'city', label: 'City', required: false, example: 'Agra', example2: 'Kanpur' },
    { key: 'state', label: 'State', required: false, example: 'Uttar Pradesh', example2: 'Uttar Pradesh' },
    { key: 'pincode', label: 'Pincode', required: false, example: '282007', example2: '208001' },
    { key: 'brand_name', label: 'Brand Name', required: false, example: '', example2: '' },
  ]

  const renderTypeBadge = (type) => {
    if (!type) return <span className="text-gray-400 text-xs">—</span>
    const upper = String(type).toUpperCase()
    if (upper === 'JOB WORK') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap shadow-xs">
          JOB WORK
        </span>
      )
    }
    if (upper === 'JOB WORK & PURCHASE') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap shadow-xs">
          JOB WORK &amp; PURCHASE
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap shadow-xs">
        {upper}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── 1. Top Header Bar ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Suppliers</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-3">
            <span>Manage vendors, raw material suppliers & job workers</span>
            <span className="text-gray-300">•</span>
            <span className="text-emerald-600 font-medium">{activeCount} Active</span>
            <span className="text-gray-300">•</span>
            <span className="text-blue-600 font-medium">{purchaseCount} Purchase</span>
            <span className="text-gray-300">•</span>
            <span className="text-purple-600 font-medium">{jobWorkCount} Job Work</span>
          </p>
        </div>

        {/* Action Buttons (Strictly aligned on the right) */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
            title="Export filtered list to CSV"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>

          {['admin', 'manager'].includes(user?.role) && (
            <>
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
              >
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Import
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold shadow-sm shadow-blue-500/20"
              >
                <span className="text-base leading-none font-bold">+</span>
                New Supplier
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 2. Dedicated Filter Control Panel ──────────────────────────── */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left: Search & Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[220px] sm:min-w-[280px] flex-1 sm:flex-initial">
              <svg 
                className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search code, name, city, phone..."
                className="input-field pl-9 pr-7 py-2 text-xs w-full bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Stock Group Filter */}
            <div className="min-w-[170px] flex-1 sm:flex-initial">
              <select
                className="input-field py-2 text-xs font-medium text-gray-700 bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"
                value={filterStockGroup}
                onChange={(e) => setFilterStockGroup(e.target.value)}
              >
                <option value="">All Stock Groups</option>
                {stockGroups.map(sg => {
                  const name = sg.dept_name || sg.stock_group || sg.department_name || ''
                  const code = sg.sg_code ? `${sg.sg_code} — ` : ''
                  return (
                    <option key={sg.id} value={name}>
                      {code}{name}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Type Filter */}
            <div className="min-w-[140px] flex-1 sm:flex-initial">
              <select
                className="input-field py-2 text-xs font-medium text-gray-700 bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="PURCHASE">PURCHASE</option>
                <option value="JOB WORK">JOB WORK</option>
                <option value="JOB WORK & PURCHASE">JOB WORK &amp; PURCHASE</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="min-w-[120px] flex-1 sm:flex-initial">
              <select
                className="input-field py-2 text-xs font-medium text-gray-700 bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
              >
                <span>✕</span>
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Right: Record Counter */}
          <div className="text-xs text-gray-500 font-medium shrink-0 pt-1 lg:pt-0 self-end lg:self-center">
            Showing <span className="font-bold text-gray-800">{suppliers.length}</span> of {totalCount} suppliers
          </div>
        </div>
      </div>

      {/* ── 3. Table Card ────────────────────────────────────────────── */}
      <div className="card overflow-hidden border border-gray-200 shadow-xs">
        {isLoading ? (
          <div className="p-12"><Loader /></div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-xl text-gray-400">
              🔍
            </div>
            <p className="text-sm font-semibold text-gray-800">No suppliers found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters 
                ? 'Try resetting the filters or modifying your search terms.' 
                : 'Get started by creating your first supplier or importing from an Excel/CSV sheet.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 btn-secondary text-xs px-3 py-1.5"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-gray-200 text-gray-500 uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap">Code</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[200px]">Supplier Name</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[150px]">Stock Group</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[150px]">Type</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">City</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Phone</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[140px]">Payment Terms</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap">Outstanding</th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap sticky right-0 bg-slate-50/90 shadow-[-4px_0_8px_rgba(0,0,0,0.02)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {suppliers.map(sup => (
                  <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Code */}
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                        {sup.supplier_code || '—'}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-gray-900 leading-tight">
                        {sup.supplier_name}
                      </div>
                      {sup.contact_person && (
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Attn: {sup.contact_person}
                        </div>
                      )}
                    </td>

                    {/* Stock Group */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {sup.stock_group ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80 whitespace-nowrap shadow-xs">
                          {sup.stock_group}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Type (Protected from wrapping) */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {renderTypeBadge(sup.supplier_type || sup.type)}
                    </td>

                    {/* City */}
                    <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                      {sup.city || '—'}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5 text-xs font-mono text-gray-600 whitespace-nowrap">
                      {sup.phone || '—'}
                    </td>

                    {/* Payment Terms */}
                    <td className="px-4 py-3.5 text-xs text-gray-600 max-w-[160px] truncate" title={sup.payment_terms}>
                      {sup.payment_terms || '—'}
                    </td>

                    {/* Outstanding */}
                    <td className="px-4 py-3.5 text-right font-mono text-xs whitespace-nowrap">
                      <span className={(Number(sup.outstanding_balance) || 0) > 0 ? 'text-rose-600 font-bold' : 'text-gray-600 font-medium'}>
                        {formatCurrency(sup.outstanding_balance)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        sup.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        {sup.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50/70 shadow-[-4px_0_8px_rgba(0,0,0,0.02)] transition-colors">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => setEditingSupplier(sup)} 
                          className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded-md transition-all shadow-2xs hover:bg-blue-50/40"
                          title="Edit supplier details"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => navigate(`/suppliers/${sup.id}`)} 
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50/60 hover:bg-blue-600 hover:text-white border border-blue-200/80 rounded-md transition-all shadow-2xs"
                          title="View supplier ledger & POs"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. Modals ────────────────────────────────────────────────── */}
      {isModalOpen && <SupplierForm onClose={() => setIsModalOpen(false)} />}
      {editingSupplier && <SupplierForm supplier={editingSupplier} onClose={() => setEditingSupplier(null)} />}

      {showImport && (
        <ImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          title="Import Suppliers"
          apiEndpoint="/suppliers/import"
          templateColumns={templateColumns}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['suppliers'] })
            setShowImport(false)
          }}
        />
      )}
    </div>
  )
}
