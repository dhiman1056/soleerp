import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MetricCard  from '../../components/common/MetricCard.jsx'
import Loader      from '../../components/common/Loader.jsx'
import ReceiveModal from '../WorkOrder/ReceiveModal.jsx'
import { useWIPQuery, useWIPSummaryQuery } from '../../hooks/useWorkOrders.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatDate }     from '../../utils/formatDate.js'
import { downloadFile }   from '../../utils/downloadFile.js'
import api from '../../api/axiosInstance.js'

const WO_TYPE_SECTIONS = [
  { type: 'RM_TO_SF', label: 'RM → Semi-Finished WIP', color: 'bg-blue-600' },
  { type: 'SF_TO_FG', label: 'SF → Finished Goods WIP', color: 'bg-purple-600' },
]

function WIPSection({ label, color, rows, onReceive }) {
  const safeRows = Array.isArray(rows) ? rows : []
  const [expandedRow, setExpandedRow] = useState(null)
  const [sizeBreakupMap, setSizeBreakupMap] = useState({})
  const [loadingMap, setLoadingMap] = useState({})

  const toggleExpand = async (row) => {
    if (expandedRow === row.id) {
      setExpandedRow(null)
      return
    }
    setExpandedRow(row.id)
    
    if (!sizeBreakupMap[row.id]) {
      setLoadingMap(p => ({ ...p, [row.id]: true }))
      try {
        const res = await api.get(`/work-orders/${row.id}/size-breakup`)
        setSizeBreakupMap(p => ({ ...p, [row.id]: res.data?.data || [] }))
      } catch (err) {
        console.error("Failed to load size breakup", err)
      } finally {
        setLoadingMap(p => ({ ...p, [row.id]: false }))
      }
    }
  }

  if (!safeRows.length) return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        {label}
      </h3>
      <p className="text-sm text-gray-400 text-center py-4">No WIP in this category.</p>
    </div>
  )

  return (
    <div className="card overflow-hidden shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
          {label}
        </h3>
        <span className="text-xs bg-gray-100 text-gray-700 font-semibold px-2.5 py-1 rounded-full shadow-sm">
          {safeRows.length} order{safeRows.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="w-8 px-2"></th>
              {['WO No.', 'Product', 'Planned', 'Received', 'Rejection', 'WIP Qty', 'Date', 'Action'].map((h) => (
                <th
                  key={h}
                  className={`px-3 py-3 text-xs font-bold text-gray-600 tracking-wide uppercase whitespace-nowrap
                    ${['Planned','Received','Rejection','WIP Qty'].includes(h) ? 'text-right' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row, i) => (
              <React.Fragment key={row.id}>
                <tr className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="px-2 py-3 text-center">
                    <button onClick={() => toggleExpand(row)} className="text-gray-400 hover:text-blue-600 focus:outline-none">
                      {expandedRow === row.id ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="px-3 py-3 font-mono font-bold text-xs text-gray-800 cursor-pointer" onClick={() => toggleExpand(row)}>{row.wo_number}</td>
                  <td className="px-3 py-3 cursor-pointer" onClick={() => toggleExpand(row)}>
                    <p className="text-gray-800 font-semibold max-w-[200px] truncate">{row.product_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{row.output_sku}</p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-700">{(Number(row.planned_qty) || 0).toFixed(2)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-green-700 font-semibold">{(Number(row.received_qty) || 0).toFixed(2)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-red-600 font-semibold">{(Number(row.total_rejection_qty) || 0).toFixed(2)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-amber-700 font-bold text-base">{(Number(row.wip_qty) || 0).toFixed(2)}</td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{formatDate(row.wo_date)}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => onReceive(row)}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all whitespace-nowrap"
                    >
                      Receive
                    </button>
                  </td>
                </tr>
                {expandedRow === row.id && (
                  <tr className="bg-blue-50/20 border-b-2 border-gray-200">
                    <td colSpan={9} className="p-4 shadow-inner">
                      {loadingMap[row.id] ? (
                        <p className="text-xs text-gray-500">Loading size breakup...</p>
                      ) : sizeBreakupMap[row.id] && sizeBreakupMap[row.id].length > 0 ? (
                        <div className="bg-white rounded-lg border border-blue-100 overflow-hidden shadow-sm inline-block max-w-full">
                          <table className="text-xs text-left">
                            <thead className="bg-blue-50/50 border-b border-blue-100">
                              <tr>
                                <th className="px-4 py-2 font-bold text-blue-900 uppercase">Size (UK)</th>
                                <th className="px-4 py-2 font-bold text-blue-900 uppercase text-right">Planned</th>
                                <th className="px-4 py-2 font-bold text-green-700 uppercase text-right">Received</th>
                                <th className="px-4 py-2 font-bold text-amber-700 uppercase text-right">WIP</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sizeBreakupMap[row.id].map(s => {
                                const p = parseInt(s.planned_qty) || 0
                                const r = parseInt(s.received_qty) || 0
                                const w = Math.max(0, p - r)
                                return (
                                  <tr key={s.size_code} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                    <td className="px-4 py-1.5 font-bold text-gray-800 font-mono">UK {s.size_code}</td>
                                    <td className="px-4 py-1.5 text-right tabular-nums text-gray-600">{p}</td>
                                    <td className="px-4 py-1.5 text-right tabular-nums text-green-600 font-semibold">{r}</td>
                                    <td className="px-4 py-1.5 text-right tabular-nums font-bold text-amber-600">{w}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot className="bg-blue-50/30 border-t-2 border-blue-100">
                              <tr>
                                <td className="px-4 py-1.5 font-bold text-gray-800">Total</td>
                                <td className="px-4 py-1.5 text-right font-bold text-gray-800 tabular-nums">
                                  {sizeBreakupMap[row.id].reduce((s,r) => s + (parseInt(r.planned_qty)||0), 0)}
                                </td>
                                <td className="px-4 py-1.5 text-right font-bold text-green-700 tabular-nums">
                                  {sizeBreakupMap[row.id].reduce((s,r) => s + (parseInt(r.received_qty)||0), 0)}
                                </td>
                                <td className="px-4 py-1.5 text-right font-bold text-amber-700 tabular-nums">
                                  {sizeBreakupMap[row.id].reduce((s,r) => s + Math.max(0, (parseInt(r.planned_qty)||0) - (parseInt(r.received_qty)||0)), 0)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No size breakup data found for this order.</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function WIPDashboard() {
  const navigate = useNavigate()
  const [receiveWO, setReceiveWO] = useState(null)

  const { data: wipGrouped, isLoading: wipLoading }     = useWIPQuery()
  const { data: wipSummary, isLoading: summaryLoading } = useWIPSummaryQuery()

  const grouped = (wipGrouped && typeof wipGrouped === 'object' && !Array.isArray(wipGrouped)) ? wipGrouped : {}
  const overall = (wipSummary && typeof wipSummary === 'object') ? (wipSummary.overall ?? wipSummary) : {}

  const totalWO    = Number(overall.total_wip_orders) || 0
  const totalQty   = Number(overall.total_wip_qty)    || 0
  const totalValue = Object.values(grouped).flat().reduce(
    (sum, row) => sum + (Number(row.wip_value) || 0), 0
  )

  const toWOObj = (row) => ({
    id:           row.id,
    wo_number:    row.wo_number,
    wo_type:      row.wo_type,
    product_name: row.product_name,
    output_sku:   row.output_sku,
    bom_code:     row.bom_code,
    size_chart:   row.size_chart || row.product_size_chart,
    from_store:   row.from_store,
    to_store:     row.to_store,
    planned_qty:  row.planned_qty,
    received_qty: row.received_qty,
    status:       row.status,
  })

  const isLoading = wipLoading || summaryLoading

  const handleExportExcel = () => downloadFile('/api/export/wip/excel', 'WIP_Report.xlsx').catch(err => console.error('Export failed:', err))
  const handleExportPDF   = () => downloadFile('/api/export/wip/pdf', 'WIP_Report.pdf').catch(err => console.error('Export failed:', err))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 mb-4 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800">WIP Dashboard</h2>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn-secondary text-sm px-3 py-1.5 shadow-sm">Export Excel</button>
          <button onClick={handleExportPDF}   className="btn-secondary text-sm px-3 py-1.5 shadow-sm">Export PDF</button>
        </div>
      </div>

      {!isLoading && totalWO > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
          <p className="text-sm font-medium text-blue-900">
            <span className="font-bold">{totalWO} work order{totalWO !== 1 ? 's' : ''}</span> pending receipt —&nbsp;
            Total WIP Value: <span className="font-bold bg-white px-2 py-0.5 rounded border border-blue-100">{formatCurrency(totalValue)}</span>
          </p>
          <button onClick={() => navigate('/work-orders')} className="ml-auto text-xs text-blue-700 font-bold hover:underline whitespace-nowrap">
            View Work Orders →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <MetricCard title="Total WIP Orders" value={isLoading ? '…' : totalWO} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="amber" />
        <MetricCard title="Total WIP Qty" value={isLoading ? '…' : totalQty.toFixed(2)} sub="Pairs / Units" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} color="blue" />
        <MetricCard title="Total WIP Value" value={isLoading ? '…' : formatCurrency(totalValue)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="green" />
      </div>

      {isLoading && <div className="py-12"><Loader /></div>}

      {!isLoading && (
        <div className="space-y-6">
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
