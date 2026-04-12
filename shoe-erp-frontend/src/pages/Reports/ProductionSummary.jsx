import React, { useState } from 'react';
import { useProductionSummaryQuery } from '../../hooks/useReports';
import Loader from '../../components/common/Loader';
import { formatCurrency } from '../../utils/formatCurrency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { today } from '../../utils/formatDate';

const COLORS = ['#1A56DB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ProductionSummary() {
  const [filters, setFilters] = useState({
     from_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
     to_date: today(),
  });

  const { data, isLoading } = useProductionSummaryQuery(filters);
  const rep = data?.data;

  if (isLoading) return <Loader />;
  if (!rep) return null;

  const handleExport = () => {
    const q = new URLSearchParams(filters).toString();
    window.location.href = `/api/export/production/excel?${q}`;
  };

  return (
    <div className="space-y-6">
      {/* Target Control Layer */}
      <div className="card p-4 flex flex-wrap items-end gap-4 justify-between bg-white border border-gray-200">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">From Date</label>
            <input type="date" className="input-field py-1.5" value={filters.from_date} onChange={e => setFilters(p => ({...p, from_date: e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">To Date</label>
            <input type="date" className="input-field py-1.5" value={filters.to_date} onChange={e => setFilters(p => ({...p, to_date: e.target.value}))}/>
          </div>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-2">
          <span>Export Excel</span>
        </button>
      </div>

      {/* Top Value KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Planned Qty', value: Number(rep?.summary?.total_planned_qty ?? 0).toFixed(0), color: 'text-blue-700' },
          { label: 'Total Received Qty', value: Number(rep?.summary?.total_received_qty ?? 0).toFixed(0), color: 'text-green-700' },
          { label: 'Total WIP (Open)', value: Number(rep?.summary?.total_wip_qty ?? 0).toFixed(0), color: 'text-amber-600' },
          { label: 'Overall Completion', value: Number(rep?.summary?.completion_rate ?? 0).toFixed(2) + '%', color: 'text-purple-700' },
        ].map((k, i) => (
          <div key={i} className="card p-5 bg-white border border-gray-100 flex flex-col justify-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-3xl font-black mt-2 tabular-nums ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Trend Graph */}
        <div className="col-span-2 card p-5 bg-white border border-gray-200 shadow-sm min-h-[350px]">
          <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase">Daily Production Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={rep?.dailyTrend ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB"/>
              <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6B7280'}} tickMargin={10}/>
              <YAxis tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
              <Legend verticalAlign="top" height={36}/>
              <Line type="monotone" dataKey="planned" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={{r: 6}} name="Planned Qty"/>
              <Line type="monotone" dataKey="received" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{r: 6}} name="Received Qty"/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown pie */}
        <div className="col-span-1 card p-5 bg-white border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase text-center">Work Order Types</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={(rep?.byWoType ?? []).map(v => ({name: v?.wo_type ?? 'Unknown', value: Number(v?.orders ?? 0)}))} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {(rep?.byWoType ?? []).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid Table */}
      <div className="card p-0 overflow-hidden border border-gray-200">
        <h3 className="px-5 py-4 text-sm font-bold text-gray-700 uppercase bg-gray-50 border-b border-gray-200">Production by Product (Top Metrics)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-5 py-3 text-left font-semibold text-gray-500">Product SKU</th>
              <th className="px-5 py-3 text-left font-semibold text-gray-500">Description</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-500">Planned Qty</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-500">Received Qty</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-500">WIP Qty</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-500">Valuation (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(rep?.byProduct ?? []).slice(0, 10).map((p, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3 font-mono font-bold text-gray-800">{p?.fg_sku ?? '-'}</td>
                <td className="px-5 py-3 text-gray-600 line-clamp-1">{p?.fg_desc ?? '-'}</td>
                <td className="px-5 py-3 text-right tabular-nums">{Number(p?.planned ?? 0).toFixed(2)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-green-700 font-bold">{Number(p?.received ?? 0).toFixed(2)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-amber-600">{Number(p?.wip ?? 0).toFixed(2)}</td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold">{formatCurrency(p?.value ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
