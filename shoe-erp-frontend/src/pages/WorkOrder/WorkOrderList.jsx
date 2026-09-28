import React, { useState, useMemo } from 'react'
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
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(10)
  const [showForm,     setShowForm]     = useState(false)
  const [receiveWO,    setReceiveWO]    = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editWOId,     setEditWOId]     = useState(null)

  const params = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter   ? { wo_type: typeFilter }  : {}),
    ...(search       ? { search }              : {}),
  }

  // useWorkOrdersQuery now returns the array directly
  const { data, isLoading } = useWorkOrdersQuery(params)
  const deleteMut            = useDeleteWorkOrder()
  const { role }             = useAuth()

  const records = Array.isArray(data) ? data : []

  // Pagination calculation
  const totalItems = records.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage   = Math.min(page, totalPages)

  const paginatedRecords = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return records.slice(start, start + pageSize)
  }, [records, safePage, pageSize])

  const getPageNumbers = () => {
    const delta = 2
    const range = []
    for (let i = Math.max(1, safePage - delta); i <= Math.min(totalPages, safePage + delta); i++) {
      range.push(i)
    }
    return range
  }

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
      key: 'total_rejection_qty', label: 'Rejection', align: 'right',
      render: (r) => {
        const rej = Number(r.total_rejection_qty) || 0
        return <span className={`tabular-nums font-semibold ${rej > 0 ? 'text-red-600' : 'text-gray-300'}`}>
          {rej > 0 ? rej.toFixed(2) : '—'}
        </span>
      },
    },
    {
      key: 'wip_qty', label: 'WIP Qty', align: 'right',
      render: (r) => {
        // Use backend-provided wip_qty which accounts for rejection_qty
        // wip_qty = GREATEST(0, planned - received - rejected)
        const w = Number(r.wip_qty) ?? ((Number(r.planned_qty) || 0) - (Number(r.received_qty) || 0))
        return <span className={`tabular-nums font-semibold ${w > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{(w || 0).toFixed(2)}</span>
      },
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (r) => <StatusBadge status={r.effective_status || r.status} />,
    },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (r) => {
        const effStatus = r.effective_status || r.status
        const wipQty = Number(r.wip_qty) ?? 0
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${r.id}`) }} className="px-2.5 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 transition-colors">View</button>
            {role === 'admin' && (Number(r.received_qty) || 0) === 0 && (
              <button onClick={(e) => { e.stopPropagation(); setEditWOId(r.id) }} className="px-2.5 py-1 text-xs rounded border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors">Edit</button>
            )}
            {effStatus !== 'RECEIVED' && wipQty > 0 && (
              <button onClick={(e) => { e.stopPropagation(); setReceiveWO(r) }} className="px-2.5 py-1 text-xs rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">Receive</button>
            )}
            {['DRAFT', 'ISSUED'].includes(r.status) && role !== 'operator' && (
              <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }} className="px-2.5 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Cancel</button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filters + Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search WO number or product..."
            className="input-field w-56"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="input-field w-auto">
            <option value="">All Statuses</option>
            {(Array.isArray(WO_STATUSES) ? WO_STATUSES : []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} className="input-field w-auto">
            <option value="">All Types</option>
            <option value="RM_TO_SF">RM → SF (SFWO)</option>
            <option value="SF_TO_FG">SF → FG (FGWO)</option>
            <option value="RM_TO_FG">RM → FG Direct (FGWO)</option>
          </select>
          {(search || statusFilter || typeFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setPage(1) }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Work Order</button>
      </div>

      <Table
        columns={columns}
        data={paginatedRecords}
        loading={isLoading}
        empty="No work orders found."
        onRowClick={(row) => navigate(`/work-orders/${row.id}`)}
        pagination={null}
      />

      {/* Pagination Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Summary & Page Size selector */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span>
            Showing{' '}
            <strong className="text-gray-900 font-semibold">
              {totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-gray-900 font-semibold">
              {Math.min(safePage * pageSize, totalItems)}
            </strong>{' '}
            of <strong className="text-gray-900 font-semibold">{totalItems}</strong> work orders
          </span>

          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
            <label htmlFor="wo-page-size" className="text-gray-500">Rows:</label>
            <select
              id="wo-page-size"
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="bg-white border border-gray-200 text-gray-700 text-xs rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Right: Page Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={safePage <= 1}
              className="px-2 py-1 text-xs border border-gray-200 bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              title="First Page"
            >
              «
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-2.5 py-1 text-xs border border-gray-200 bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              title="Previous Page"
            >
              ‹ Prev
            </button>

            <div className="flex items-center gap-1 mx-1">
              {getPageNumbers().map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-md transition-colors ${
                    pageNum === safePage
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-2.5 py-1 text-xs border border-gray-200 bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              title="Next Page"
            >
              Next ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={safePage >= totalPages}
              className="px-2 py-1 text-xs border border-gray-200 bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              title="Last Page"
            >
              »
            </button>
          </div>
        )}
      </div>

      <WorkOrderForm
        isOpen={showForm || !!editWOId}
        onClose={() => { setShowForm(false); setEditWOId(null) }}
        editWOId={editWOId}
      />

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
