import React, { useState } from 'react';
import { useStockValuationQuery } from '../../hooks/useReports';
import Loader from '../../components/common/Loader';
import { formatCurrency } from '../../utils/formatCurrency';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981'];

export default function StockValuation() {
  const [category, setCategory] = useState('ALL');

  const { data, isLoading } = useStockValuationQuery({ category });

  // queryFn returns the unwrapped object with safe defaults
  const summary = data?.summary ?? {};
  const items   = Array.isArray(data?.items) ? data.items : [];

  if (isLoading) return <Loader />;

  const byCategory = summary?.byCategory ?? {};

  const pieData = [
    { name: 'Raw Material',     value: Number(byCategory?.RAW_MATERIAL?.value  ?? 0) },
    { name: 'Semi-Finished',    value: Number(byCategory?.SEMI_FINISHED?.value ?? 0) },
    { name: 'Finished Product', value: Number(byCategory?.FINISHED?.value      ?? 0) },
  ].filter(d => d.value > 0);

  const lowStockCount = items.filter(i => i?.isLowStock).length;

  const handleExport = () => {
    const q = new URLSearchParams({ category }).toString();
    window.location.href = `/api/export/stock-valuation/excel?${q}`;
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-end gap-4 justify-between bg-white border border-gray-200">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Category Filter</label>
          <select
            className="input-field py-1.5 min-w-[200px]"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="RAW_MATERIAL">Raw Materials</option>
            <option value="SEMI_FINISHED">Semi-Finished Goods</option>
            <option value="FINISHED">Finished Goods</option>
          </select>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm">Export Excel</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Value Cards */}
        <div className="flex flex-col gap-4">
          <div className="card p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col justify-center shadow-lg flex-1">
            <p className="text-xs font-bold text-blue-300 uppercase tracking-widest">Total Stock Valuation</p>
            <p className="text-4xl font-black mt-2 tabular-nums">{formatCurrency(summary?.totalValue ?? 0)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5 bg-white border border-gray-100 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unique SKUs</p>
              <p className="text-2xl font-black mt-1 tabular-nums text-gray-800">
                {Number(summary?.totalSkus ?? 0)}
              </p>
            </div>
            <div className="card p-5 bg-white border border-gray-100 flex flex-col justify-center relative overflow-hidden">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Low Stock Items</p>
              <p className="text-2xl font-black mt-1 tabular-nums text-amber-600">{lowStockCount}</p>
              <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
            </div>
          </div>
        </div>

        {/* Distribution Pie */}
        {category === 'ALL' && (
          <div className="card p-5 bg-white border border-gray-200 shadow-sm flex flex-col items-center">
            <h3 className="text-sm font-bold text-gray-700 w-full uppercase">Capital Distribution</h3>
            <ResponsiveContainer width="100%" height={230} className="mt-2">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" nameKey="name">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={val => formatCurrency(val)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Stock Assets List */}
      <div className="card p-0 overflow-hidden border border-gray-200">
        <h3 className="px-5 py-4 text-sm font-bold text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
          Stock Assets List
        </h3>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 shadow-sm">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-gray-500">SKU</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500">Description</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500">Category</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-500">Available Qty</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-500">Avg Cost (₹)</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-500">Total Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m, i) => (
                <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50/50 ${m?.isLowStock ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-5 py-3 font-mono font-bold text-gray-800">{m?.sku ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-600 truncate max-w-[200px]">
                    {m?.description ?? '-'} ({m?.uom ?? '-'})
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded text-gray-600 font-bold">
                      {(m?.category ?? '').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span className={m?.isLowStock ? 'text-amber-700 font-bold' : ''}>
                      {Number(m?.qty ?? 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-500">
                    {Number(m?.avgRate ?? 0).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold">
                    {formatCurrency(m?.value ?? 0)}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">No stock data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
