import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import Table from '../../components/common/Table'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import PurchaseForm from './PurchaseForm'
import { usePurchasesQuery, useDeletePurchase } from '../../hooks/useInventory'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

export default function PurchaseList() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [skuCode, setSkuCode] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { role } = useAuth()
  const deleteMut = useDeletePurchase()

  const params = {
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
    ...(skuCode ? { sku_code: skuCode } : {}),
  }

  const { data, isLoading } = usePurchasesQuery(params)
  const records = data?.data || []

  const columns = [
    { key: 'purchase_no', label: 'Purchase No', className: 'font-mono text-xs font-semibold text-blue-700' },
    { key: 'purchase_date', label: 'Date', render: r => formatDate(r.purchase_date) },
    { key: 'supplier_name', label: 'Supplier', render: r => <span className="font-medium text-gray-800">{r.supplier_name}</span> },
    { key: 'sku_code', label: 'SKU Code', className: 'font-mono text-xs' },
    { key: 'sku_description', label: 'Description', render: r => <span className="truncate max-w-[200px] block">{r.sku_description}</span> },
    { key: 'qty', label: 'Qty', align: 'right', render: r => <span className="tabular-nums font-semibold">{parseFloat(r.qty).toFixed(3)} {r.uom}</span> },
    { key: 'rate', label: 'Rate (₹)', align: 'right', render: r => <span className="tabular-nums">{formatCurrency(r.rate)}</span> },
    { key: 'total_value', label: 'Value (₹)', align: 'right', render: r => <span className="tabular-nums font-bold text-gray-900">{formatCurrency(r.total_value)}</span> },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: r => (
        <div className="flex justify-end">
          {role === 'admin' && (
             <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id) }} className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 bg-red-50 hover:bg-red-100 rounded transition-colors">Delete</button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
          <input type="text" placeholder="Filter SKU..." value={skuCode} onChange={e => setSkuCode(e.target.value)} className="input-field text-sm w-40" />
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field text-sm" />
          <span className="text-gray-400">-</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field text-sm" />
        </div>
        {(role === 'admin' || role === 'manager') && (
          <button onClick={() => setIsFormOpen(true)} className="btn-primary shadow-md hover:shadow-lg transition-shadow">+ New Purchase</button>
        )}
      </div>

      <Table 
        columns={columns} 
        data={records} 
        loading={isLoading} 
        empty="No purchases found." 
      />

      <PurchaseForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Purchase"
        message="Are you sure you want to delete this purchase? This will reverse the stock ledger entries."
        confirmLabel="Delete Purchase"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}
      />
    </div>
  )
}
