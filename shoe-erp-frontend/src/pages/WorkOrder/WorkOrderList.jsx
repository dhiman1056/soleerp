import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Table          from '../../components/common/Table.jsx'
import StatusBadge    from '../../components/common/StatusBadge.jsx'
import ConfirmDialog  from '../../components/common/ConfirmDialog.jsx'
import WorkOrderForm  from './WorkOrderForm.jsx'
import ReceiveModal   from './ReceiveModal.jsx'
import { useWorkOrdersQuery, useDeleteWorkOrder } from '../../hooks/useWorkOrders.js'
import { formatDate }     from '../../utils/formatDate.js'
import { WO_STATUSES, WO_TYPES, WO_TYPE_SHORT } from '../../utils/constants.js'
import { useAuth } from '../../hooks/useAuth.js'

export default function WorkOrderList() {
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [page,         setPage]         = useState(1)
  const [showForm,     setShowForm]     = useState(false)
  const [receiveWO,    setReceiveWO]    = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const params = {
    page,
    limit: 20,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter   ? { wo_type: typeFilter }  : {}),
  }

  // useWorkOrdersQuery now returns the array directly
  const { data, isLoading } = useWorkOrdersQuery(params)
  const deleteMut            = useDeleteWorkOrder()
  const { role }             = useAuth()

  const records = Array.isArray(data) ? data : []

  const columns = [
    { key: 'wo_number',          label: 'WO No.',  className: 'font-mono font-semibold text-xs text-gray-800' },
    { key: 'bom_code',           label: 'BOM',     className: 'font-mono text-xs' },
    { key: 'product_name', label: 'Product' },
    {
      key: 'wo_type', label: 'Type',
      render: (r) => <span className="text-xs font-semibold text-gray-600">{WO_TYPE_SHORT[r.wo_type]}</span>,
    },
    { key: 'wo_date',     label: 'Date',    render: (r) => formatDate(r.wo_date) },
    { key: 'planned_qty', label: 'Planned', align: 'right', className: 'tabular-nums font-medium' },
    { key: 'received_qty', label: 'Received', align: 'right', className: 'tabular-nums text-green-700' },
    {
      key: 'wip_qty', label: 'WIP Qty', align: 'right',
      render: (r) => {
        const w = (Number(r.planned_qty) || 0) - (Number(r.received_qty) || 0)
        return <span className={`tabular-nums font-semibold ${w > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{w.toFixed(2)}</span>
      },
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${r.id}`) }} className="px-2.5 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 transition-colors">View</button>
          {!['RECEIVED'].includes(r.status) && (
            <button onClick={(e) => { e.stopPropagation(); setReceiveWO(r) }} className="px-2.5 py-1 text-xs rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">Receive</button>
          )}
          {['DRAFT', 'ISSUED'].includes(r.status) && role !== 'operator' && (
            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }} className="px-2.5 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Cancel</button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filters + Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="input-field w-auto">
            <option value="">All Statuses</option>
            {(Array.isArray(WO_STATUSES) ? WO_STATUSES : []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} className="input-field w-auto">
            <option value="">All Types</option>
            {(Array.isArray(WO_TYPES) ? WO_TYPES : []).map((t) => <option key={t} value={t}>{WO_TYPE_SHORT[t]}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Work Order</button>
      </div>

      <Table
        columns={columns}
        data={records}
        loading={isLoading}
        empty="No work orders found."
        onRowClick={(row) => navigate(`/work-orders/${row.id}`)}
        pagination={{ page, pages: 1, total: records.length, limit: 20, onPageChange: setPage }}
      />

      <WorkOrderForm isOpen={showForm} onClose={() => setShowForm(false)} />

      {receiveWO && (
        <ReceiveModal isOpen={!!receiveWO} onClose={() => setReceiveWO(null)} wo={receiveWO} />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Cancel Work Order"
        message={`Cancel Work Order "${deleteTarget?.wo_number}"? This will permanently delete the WO and cannot be undone.`}
        confirmLabel="Cancel WO"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate(deleteTarget?.id, { onSuccess: () => setDeleteTarget(null) })}
      />
    </div>
  )
}
