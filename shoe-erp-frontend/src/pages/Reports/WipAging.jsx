import React from 'react';
import { useState } from 'react'
import { useWipAgingQuery } from '../../hooks/useReports'
import Loader from '../../components/common/Loader'
import { formatCurrency } from '../../utils/formatCurrency'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts'
import { today } from '../../utils/formatDate'

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function WipAging() {
  const [asOfDate, setAsOfDate] = useState(today())
  const { data, isLoading } = useWipAgingQuery({ as_of_date: asOfDate })
  const rep = data?.data

  if (isLoading) return <Loader />
  if (!rep) return null

  const handleExport = () => {
    const q = new URLSearchParams({ as_of_date: asOfDate }).toString()
    window.location.href = `/api/export/wip-aging/excel?${q}`
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 flex flex-wrap items-end gap-4 justify-between bg-white border border-gray-200">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">WIP As Of Date</label>
          <input type="date" className="input-field py-1.5" value={asOfDate} onChange={e => setAsOfDate(e.target.value)}/>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm">Export Excel</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total WIP Orders', value: rep.summary.total, color: 'text-gray-900' },
          { label: 'Total WIP Value (₹)', value: formatCurrency(rep.summary.value).replace('₹',''), color: 'text-rose-600' },
        ].map((k, i) => (
          <div key={i} className="card p-5 bg-white border border-gray-100 flex flex-col justify-center col-span-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-4xl font-black mt-2 tabular-nums ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aging Buckets Table */}
        <div className="card p-0 overflow-hidden border border-gray-200">
          <h3 className="px-5 py-4 text-sm font-bold text-gray-700 uppercase bg-gray-50 border-b border-gray-200">Aging Buckets Value</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-left font-semibold text-gray-500">Aging Bucket</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-500">Orders</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-500">Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {rep.aging.map((a, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-5 py-3 font-semibold text-gray-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i]}}/>
                    {a.bucket}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-bold">{a.count}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-600">{formatCurrency(a.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Breakdown pie */}
        <div className="card p-5 bg-white border border-gray-200 shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-bold text-gray-700 w-full uppercase">Value Distribution</h3>
          <ResponsiveContainer width="100%" height={260} className="mt-2">
            <PieChart>
              <Pie data={rep.aging} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" nameKey="bucket">
                {rep.aging.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Detail trace */}
      <div className="card p-0 overflow-hidden border border-gray-200">
        <h3 className="px-5 py-4 text-sm font-bold text-gray-700 uppercase bg-gray-50 border-b border-gray-200">Open Work Orders Aging Drilldown</h3>
        <div className="overflow-x-auto max-h-[400px]">
           <table className="w-full text-sm">
             <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 shadow-sm">
               <tr>
                 <th className="px-5 py-3 text-left font-semibold text-gray-500">WO Number</th>
                 <th className="px-5 py-3 text-left font-semibold text-gray-500">Product</th>
                 <th className="px-5 py-3 text-right font-semibold text-gray-500">WO Date</th>
                 <th className="px-5 py-3 text-right font-semibold text-gray-500">Age (Days)</th>
                 <th className="px-5 py-3 text-right font-semibold text-gray-500">WIP Qty</th>
                 <th className="px-5 py-3 text-right font-semibold text-gray-500">WIP Value (₹)</th>
               </tr>
             </thead>
             <tbody>
               {rep.details.map((m, i) => (
                 <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50/50 ${m.ageDays > 30 ? 'bg-red-50/30' : ''}`}>
                   <td className="px-5 py-3 font-mono font-bold text-gray-800">{m.woId}</td>
                   <td className="px-5 py-3 text-gray-600 truncate max-w-[200px]">{m.product}</td>
                   <td className="px-5 py-3 text-right tabular-nums text-gray-500">{m.woDate}</td>
                   <td className={`px-5 py-3 text-right tabular-nums font-bold ${m.ageDays > 30 ? 'text-red-700' : 'text-gray-800'}`}>{m.ageDays}</td>
                   <td className="px-5 py-3 text-right tabular-nums font-semibold">{m.wipQty.toFixed(2)}</td>
                   <td className="px-5 py-3 text-right tabular-nums text-amber-700">{formatCurrency(m.wipValue)}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  )
}
