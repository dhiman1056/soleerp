import React, { useState } from 'react';
import { useMaterialConsumptionQuery } from '../../hooks/useReports';
import Loader from '../../components/common/Loader';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { today } from '../../utils/formatDate';

export default function MaterialConsumption() {
  const [filters, setFilters] = useState({
    from_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
    to_date: today(),
  });

  const { data, isLoading } = useMaterialConsumptionQuery(filters);

  // queryFn returns unwrapped data object with safe defaults
  const summary    = data?.summary ?? {};
  const byMaterial = Array.isArray(data?.byMaterial) ? data.byMaterial : [];

  if (isLoading) return <Loader />;

  const handleExport = () => {
    const q = new URLSearchParams(filters).toString();
    window.location.href = `/api/export/consumption/excel?${q}`;
  };

  // Top 10 consumed materials by value — safe sort/slice since byMaterial is guaranteed array
  const topConsumed = [...byMaterial]
    .sort((a, b) => Number(b?.totalConsumptionValue ?? 0) - Number(a?.totalConsumptionValue ?? 0))
    .slice(0, 10)
    .map(r => ({
      name:           r?.rmSku ?? '-',
      ConsumedValue:  Number(r?.totalConsumptionValue ?? 0),
      PurchasedValue: Number(r?.purchased ?? 0) * Number(r?.avgRate ?? 0),
    }));

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-end gap-4 justify-between bg-white border border-gray-200">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">From Date</label>
            <input
              type="date"
              className="input-field py-1.5"
              value={filters.from_date}
              onChange={e => setFilters(p => ({ ...p, from_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">To Date</label>
            <input
              type="date"
              className="input-field py-1.5"
              value={filters.to_date}
              onChange={e => setFilters(p => ({ ...p, to_date: e.target.value }))}
            />
          </div>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm">Export Excel</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'RM SKUs Consumed',       value: Number(summary?.totalMaterialsConsumed ?? 0),                     color: 'text-blue-700'   },
          { label: 'Total Purchase Val (₹)', value: formatCurrency(summary?.totalPurchaseValue   ?? 0).replace('₹', ''), color: 'text-purple-700' },
          { label: 'Total Consumption (₹)',  value: formatCurrency(summary?.totalConsumptionValue ?? 0).replace('₹', ''), color: 'text-rose-600'   },
          { label: 'Consumption Ratio',      value: Number(summary?.consumptionRatio ?? 0).toFixed(2) + '%',            color: 'text-amber-600'  },
        ].map((k, i) => (
          <div key={i} className="card p-5 bg-white border border-gray-100 flex flex-col justify-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-2 tabular-nums ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="card p-5 bg-white border border-gray-200 shadow-sm min-h-[350px]">
        <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase">Top 10 Materials by Consumption Value</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topConsumed}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              width={80}
              tickFormatter={val => `₹${(val / 1000).toFixed(0)}k`}
            />
            <RechartsTooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              cursor={{ fill: '#F3F4F6' }}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar yAxisId="left" dataKey="ConsumedValue"  name="Consumption (₹)" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40} />
            <Bar yAxisId="left" dataKey="PurchasedValue" name="Purchased (₹)"   fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Material Ledger Table */}
      <div className="card p-0 overflow-hidden border border-gray-200">
        <h3 className="px-5 py-4 text-sm font-bold text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
          Material Ledger Table
        </h3>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 shadow-sm">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-gray-500">RM SKU</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500">Description</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-500">Opening</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-500 text-purple-700">Purchased Qty</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-500 text-rose-600">Consumed Qty</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-500">Closing</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-500">Total RM Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {byMaterial.map((m, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-mono font-bold text-gray-800">{m?.rmSku ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-600 line-clamp-1">{m?.description ?? '-'} ({m?.uom ?? '-'})</td>
                  <td className="px-5 py-3 text-right tabular-nums">{Number(m?.openingStock ?? 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-purple-700 font-bold">{Number(m?.purchased ?? 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-rose-600 font-bold">{Number(m?.consumed ?? 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{Number(m?.closingStock ?? 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold">{formatCurrency(m?.totalConsumptionValue ?? 0)}</td>
                </tr>
              ))}
              {byMaterial.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400">No data for selected period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
