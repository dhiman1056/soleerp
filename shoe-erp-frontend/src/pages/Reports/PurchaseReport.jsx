import React, { useState, useMemo } from 'react'
import { usePOsQuery, useGRNList, usePRNList } from '../../hooks/usePurchaseOrders'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate }     from '../../utils/formatDate'
import { today }          from '../../utils/formatDate'
import DirectGRNForm from '../PurchaseOrder/DirectGRNForm'

const TABS = ['Purchase Orders', 'GRN Report', 'PRN Report']

// ── Metric card ───────────────────────────────────────────────────
const Card = ({ label, value, sub, color = 'text-gray-900' }) => (
  <div className="card p-5">
    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
    <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
)

// ── Date range helper ─────────────────────────────────────────────
const monthStart = () => {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}

// ── PO Tab ────────────────────────────────────────────────────────
function POTab() {
  const [status, setStatus] = useState('')
  const { data, isLoading } = usePOsQuery({ status })
  const pos = Array.isArray(data) ? data : []

  const totalValue   = pos.reduce((s, p) => s + (parseFloat(p.total_value)||0), 0)
  const draftCount   = pos.filter(p => p.status === 'DRAFT').length
  const sentCount    = pos.filter(p => p.status === 'SENT').length
  const pendingCount = pos.filter(p => ['SENT','PARTIAL','PARTIAL_RECEIVED'].includes(p.status)).length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total POs"       value={pos.length} />
        <Card label="Total Value"     value={formatCurrency(totalValue)} />
        <Card label="Outstanding POs" value={pendingCount} color="text-amber-700" />
        <Card label="Draft"           value={draftCount}  color="text-gray-500" />
      </div>

      <div className="flex gap-3 items-center">
        <select value={status} onChange={e => setStatus(e.target.value)} className="input-field max-w-[160px]">
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PARTIAL">Partial</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">PO No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pos.map(po => (
                  <tr key={po.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{po.po_no}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(po.po_date)}</td>
                    <td className="px-4 py-3 font-medium">{po.supplier_name || po.supplier_display || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(po.total_value)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        po.status === 'RECEIVED' ? 'bg-green-100 text-green-700' :
                        po.status === 'SENT'     ? 'bg-blue-100 text-blue-700'  :
                        ['PARTIAL','PARTIAL_RECEIVED'].includes(po.status) ? 'bg-yellow-100 text-yellow-800' :
                        po.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {(po.status||'').replace(/_/g,' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pos.length === 0 && <div className="p-6 text-center text-gray-400">No purchase orders found.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── GRN Tab ───────────────────────────────────────────────────────
function GRNTab() {
  const [from, setFrom] = useState(monthStart())
  const [to,   setTo]   = useState(today())
  const [showDirect, setShowDirect] = useState(false)

  const { data, isLoading } = useGRNList({ from_date: from, to_date: to })
  const grns = Array.isArray(data) ? data : []

  const totalValue  = grns.reduce((s, g) => s + (parseFloat(g.total_value)||0), 0)
  const directCount = grns.filter(g => !g.po_id).length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card label="Total GRNs"    value={grns.length} />
        <Card label="Total Value"   value={formatCurrency(totalValue)} color="text-green-700" />
        <Card label="Direct GRNs"   value={directCount} sub="Without PO" />
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="input-field" />
        </div>
        <button onClick={() => setShowDirect(true)} className="btn-primary">
          + Direct GRN (No PO)
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">GRN No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">PO Ref</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grns.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{g.grn_no}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(g.grn_date)}</td>
                    <td className="px-4 py-3 font-medium">{g.supplier_name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">{g.po_no || <span className="text-gray-400 italic">Direct</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{g.line_count} items</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(g.total_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {grns.length === 0 && <div className="p-6 text-center text-gray-400">No GRNs in selected date range.</div>}
          </div>
        )}
      </div>

      <DirectGRNForm isOpen={showDirect} onClose={() => setShowDirect(false)} />
    </div>
  )
}

// ── PRN Tab ───────────────────────────────────────────────────────
function PRNTab() {
  const [from, setFrom] = useState(monthStart())
  const [to,   setTo]   = useState(today())

  const { data, isLoading } = usePRNList({ from_date: from, to_date: to })
  const prns = Array.isArray(data) ? data : []

  const totalValue = prns.reduce((s, p) => s + (parseFloat(p.total_value)||0), 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card label="Total Returns"  value={prns.length} />
        <Card label="Total Returned" value={formatCurrency(totalValue)} color="text-red-700" />
      </div>

      <div className="flex gap-3 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="input-field" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">PRN No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">GRN Ref</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prns.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-red-700">{p.prn_no}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.prn_date)}</td>
                    <td className="px-4 py-3 font-medium">{p.supplier_name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.grn_no || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-700">{formatCurrency(p.total_value)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {prns.length === 0 && <div className="p-6 text-center text-gray-400">No purchase returns in selected date range.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main PurchaseReport ────────────────────────────────────────────
export default function PurchaseReport() {
  const [tab, setTab] = useState(0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Purchase Reports</h1>
        <p className="text-sm text-gray-500">Purchase Orders, GRNs, and Returns overview</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <POTab />}
      {tab === 1 && <GRNTab />}
      {tab === 2 && <PRNTab />}
    </div>
  )
}
