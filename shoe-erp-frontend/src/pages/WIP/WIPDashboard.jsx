import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useNavigate } from 'react-router-dom'
import MetricCard  from '../../components/common/MetricCard.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import Loader      from '../../components/common/Loader.jsx'
import ReceiveModal from '../WorkOrder/ReceiveModal.jsx'
import { useWIPQuery, useWIPSummaryQuery } from '../../hooks/useWorkOrders.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatDate }     from '../../utils/formatDate.js'
import { WO_TYPE_LABELS } from '../../utils/constants.js'
import { downloadFile }   from '../../utils/downloadFile.js'

const WO_TYPE_SECTIONS = [
  { type: 'RM_TO_SF', label: 'RM → Semi-Finished WIP',          color: 'bg-blue-600' },
  { type: 'SF_TO_FG', label: 'SF → Finished Goods WIP',          color: 'bg-purple-600' },
  { type: 'RM_TO_FG', label: 'RM → Finished Goods WIP (Direct)', color: 'bg-orange-600' },
]

function WIPSection({ label, color, rows, onReceive }) {
  if (!rows?.length) return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        {label}
      </h3>
      <p className="text-sm text-gray-400 text-center py-4">No WIP in this category.</p>
    </div>
  )

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
          {label}
        </h3>
        <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
          {rows.length} order{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['WO No.', 'BOM', 'Product', 'Planned', 'Received', 'WIP Qty', 'WIP Value', 'Date', 'Action'].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap
                    ${['Planned','Received','WIP Qty','WIP Value'].includes(h) ? 'text-right' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.wo_id} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="px-4 py-3 font-mono font-semibold text-xs text-gray-800">{row.wo_number}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.bom_code}</td>
                <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{row.output_description}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{parseFloat(row.planned_qty).toFixed(2)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-green-700 font-medium">{parseFloat(row.received_qty).toFixed(2)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-amber-700 font-bold">{parseFloat(row.wip_qty).toFixed(2)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{formatCurrency(row.wip_value)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(row.wo_date)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onReceive(row)}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors whitespace-nowrap"
                  >
                    Receive
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function WIPDashboard() {
  const navigate          = useNavigate()
  const [receiveWO, setReceiveWO] = useState(null)

  const { data: wipGrouped, isLoading: wipLoading }   = useWIPQuery()
  const { data: wipSummary, isLoading: summaryLoading } = useWIPSummaryQuery()

  const grouped = wipGrouped?.data || {}
  const overall = wipSummary?.data?.overall || {}
  const byType  = wipSummary?.data?.by_type || []

  const totalWO    = overall?.total_wo_count  || 0
  const totalQty   = overall?.total_wip_qty   || 0
  const totalValue = overall?.total_wip_value || 0

  // Build a fake "wo" object for ReceiveModal from v_wip row fields
  const toWOObj = (row) => ({
    id:                 row.wo_id,
    wo_number:          row.wo_number,
    output_description: row.output_description,
    planned_qty:        row.planned_qty,
    received_qty:       row.received_qty,
    status:             row.status,
  })

  const isLoading = wipLoading || summaryLoading

  const handleExportExcel = () => {
    downloadFile('/api/export/wip/excel', 'WIP_Report.xlsx')
      .catch(err => console.error('Export failed:', err))
  }

  const handleExportPDF = () => {
    downloadFile('/api/export/wip/pdf', 'WIP_Report.pdf')
      .catch(err => console.error('Export failed:', err))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 mb-4 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800">WIP Dashboard</h2>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn-secondary text-sm px-3 py-1.5">Export Excel</button>
          <button onClick={handleExportPDF} className="btn-secondary text-sm px-3 py-1.5">Export PDF</button>
        </div>
      </div>

      {/* Alert Banner */}
      {!isLoading && totalWO > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            <span className="font-bold">{totalWO} work order{totalWO !== 1 ? 's' : ''}</span> pending receipt —&nbsp;
            Total WIP Value: <span className="font-bold">{formatCurrency(totalValue)}</span>
          </p>
          <button onClick={() => navigate('/work-orders')} className="ml-auto text-xs text-amber-700 font-semibold hover:underline whitespace-nowrap">
            View Work Orders →
          </button>
        </div>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total WIP Orders"
          value={isLoading ? '…' : totalWO}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color="amber"
        />
        <MetricCard
          title="Total WIP Qty"
          value={isLoading ? '…' : parseFloat(totalQty).toFixed(2)}
          sub="Pairs / Units"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          color="blue"
        />
        <MetricCard
          title="Total WIP Value"
          value={isLoading ? '…' : formatCurrency(totalValue)}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color="green"
        />
      </div>

      {/* Loading */}
      {isLoading && <div className="py-12"><Loader /></div>}

      {/* Per-type sections */}
      {!isLoading && (
        <div className="space-y-5">
          {WO_TYPE_SECTIONS.map(({ type, label, color }) => (
            <WIPSection
              key={type}
              label={label}
              color={color}
              rows={grouped[type] || []}
              onReceive={(row) => setReceiveWO(toWOObj(row))}
            />
          ))}
        </div>
      )}

      {/* Auto-refresh indicator */}
      <p className="text-center text-xs text-gray-400">
        ↻ Auto-refreshing every 30 seconds
      </p>

      {/* Receive Modal */}
      {receiveWO && (
        <ReceiveModal
          isOpen={!!receiveWO}
          onClose={() => setReceiveWO(null)}
          wo={receiveWO}
        />
      )}
    </div>
  )
}
