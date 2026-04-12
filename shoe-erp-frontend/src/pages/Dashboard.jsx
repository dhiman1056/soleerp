import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  useAnalyticsOverview, 
  useProductionTrend, 
  useMaterialConsumptionTrend, 
  useProductMix, 
  useWipByAge, 
  useSupplierPerformance 
} from '../hooks/useAnalytics';
import { useNotificationsQuery } from '../hooks/useNotifications';
import { useLowStockAlertsQuery } from '../hooks/useInventory';
import MetricCard from '../components/common/MetricCard.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';
import { SkeletonCard, SkeletonChart, SkeletonRow } from '../components/common/Skeleton.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatDistanceToNow } from 'date-fns';

const COLORS = {
  green: '#10b981', amber: '#f59e0b', orange: '#f97316', red: '#ef4444', blue: '#3b82f6', teal: '#14b8a6', purple: '#8b5cf6'
};

const PIE_COLORS = [COLORS.green, COLORS.amber, COLORS.orange, COLORS.red];
const BAR_COLORS = [COLORS.blue, COLORS.teal, COLORS.purple, COLORS.amber, COLORS.green];

export default function Dashboard() {
  const navigate = useNavigate();
  const [trendPeriod, setTrendPeriod] = useState('30d');
  const [mixPeriod, setMixPeriod] = useState('30d');
  
  // Queries
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();
  const { data: prodTrend, isLoading: trendLoading } = useProductionTrend(trendPeriod, 'day');
  const { data: matTrend, isLoading: matLoading } = useMaterialConsumptionTrend('30d');
  const { data: prodMix, isLoading: mixLoading } = useProductMix(mixPeriod);
  const { data: wipAge, isLoading: wipLoading } = useWipByAge();
  const { data: suppliers, isLoading: supLoading } = useSupplierPerformance('90d');
  
  const { data: notifRes } = useNotificationsQuery();
  const { data: alertsRes } = useLowStockAlertsQuery();

  const notifications = Array.isArray(notifRes?.data) ? notifRes.data : [];
  const lowStock = (Array.isArray(alertsRes?.data) ? alertsRes.data : []).slice(0, 5);

  const getChartData = (data, keys) => {
    if (!data?.labels) return [];
    return data.labels.map((label, i) => {
      const obj = { name: label };
      keys.forEach(k => obj[k] = data[k][i]);
      return obj;
    });
  };

  const getPieData = (data) => {
    if (!data?.buckets) return [];
    return data.buckets.map((b, i) => ({ name: b, value: data.counts[i], valValue: data.values[i] }));
  };

  const getStackedData = (data) => {
    if (!data?.series) return [];
    return data.series.map(s => {
      const obj = { name: s.month };
      data.materials.forEach((m, i) => obj[m] = s.values[i]);
      return obj;
    });
  };

  // Row 1 Metric Cards Preparation
  const o = (overview && typeof overview === 'object') ? overview : {};
  const upDown = (o.production?.trend === 'UP') ? '↑' : (o.production?.trend === 'DOWN' ? '↓' : '-');
  
  return (
    <div className="space-y-6">
      {/* Row 1: KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {overviewLoading ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />) : (
          <>
            <MetricCard 
              title="Production (This Month)" 
              value={`${o.production?.thisMonth?.received ?? '-'} / ${o.production?.thisMonth?.planned ?? '-'}`} 
              color="blue" 
            />
            <MetricCard 
              title={`Completion Rate (${upDown})`} 
              value={`${Number(o.production?.thisMonth?.completionRate) || 0}%`} 
              color={o.production?.trend === 'UP' ? 'green' : 'amber'} 
            />
            <MetricCard 
              title="Total WIP" 
              value={formatCurrency(Number(o.wip?.totalValue) || 0)} 
              subtitle={`${o.wip?.totalOrders ?? 0} orders`}
              color="orange" 
            />
            <MetricCard 
              title="Stock Value" 
              value={formatCurrency(Number(o.inventory?.totalStockValue) || 0)} 
              subtitle={`${o.inventory?.lowStockCount ?? 0} low stock`}
              color="teal" 
            />
            <MetricCard 
              title="Open POs" 
              value={o.procurement?.openPOs ?? 0} 
              subtitle={formatCurrency(Number(o.procurement?.openPOValue) || 0)}
              color="purple" 
            />
            <MetricCard 
              title="Unread Alerts" 
              value={o.notifications?.unread ?? 0} 
              subtitle={`${o.notifications?.critical ?? 0} critical`}
              color={(o.notifications?.critical ?? 0) > 0 ? "red" : "gray"} 
            />
          </>
        )}
      </div>

      {/* Row 2: Trend & WIP Age */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="card xl:col-span-7 p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Production Trend</h2>
            <select className="input-field py-1" value={trendPeriod} onChange={e => setTrendPeriod(e.target.value)}>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
            </select>
          </div>
          {trendLoading ? <SkeletonChart /> : (
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartData(prodTrend, ['planned', 'received', 'wip'])}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="#9CA3AF" />
                  <YAxis fontSize={12} tickMargin={10} stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="planned" name="Planned" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="received" name="Received" stroke={COLORS.green} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="wip" name="WIP" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="card xl:col-span-5 p-5 flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">WIP by Age</h2>
          </div>
          {wipLoading ? <SkeletonChart /> : (
            <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getPieData(wipAge)}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={100}
                    paddingAngle={5} dataKey="value"
                  >
                    {getPieData(wipAge).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [`${value} Orders (₹${props.payload.valValue})`, name]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-[-36px]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{(Array.isArray(wipAge?.counts) ? wipAge.counts : []).reduce((a, b) => a + b, 0)}</p>
                  <p className="text-xs text-gray-500">Orders</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Mix & Consumption */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1">
        <div className="card p-5 min-h-[350px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Product Mix</h2>
            <select className="input-field py-1" value={mixPeriod} onChange={e => setMixPeriod(e.target.value)}>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
            </select>
          </div>
          {mixLoading ? <SkeletonChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={getChartData(prodMix, ['qty', 'value'])} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" fontSize={12} stroke="#9CA3AF" />
                <YAxis dataKey="name" type="category" fontSize={12} stroke="#9CA3AF" width={80} />
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="qty" name="Qty (Pairs)" fill={COLORS.teal} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-5 min-h-[350px]">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Material Consumption (Top 5)</h2>
          {matLoading ? <SkeletonChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={getStackedData(matTrend)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} stroke="#9CA3AF" />
                <YAxis fontSize={12} stroke="#9CA3AF" tickFormatter={val => `₹${val/1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {(Array.isArray(matTrend?.materials) ? matTrend.materials : []).map((m, i) => (
                  <Bar key={m} dataKey={m} stackId="a" fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 4: Tables/Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
        <div className="card col-span-1 xl:col-span-4 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Supplier Performance</h2></div>
          {supLoading ? <div className="p-5"><table className="w-full"><tbody><SkeletonRow count={3} /></tbody></table></div> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr><th className="px-5 py-3">Supplier</th><th className="px-5 py-3">Value</th><th className="px-5 py-3">On-Time</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {(Array.isArray(suppliers?.suppliers) ? suppliers.suppliers : []).slice(0, 5).map(s => (
                    <tr key={s.id}>
                      <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[150px]">{s.name}</td>
                      <td className="px-5 py-3 text-gray-500">{formatCurrency(s.totalValue)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden w-20">
                            <div className={`h-full ${s.onTimeRate >= 80 ? 'bg-green-500' : s.onTimeRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.onTimeRate}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500">{s.onTimeRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(Array.isArray(suppliers?.suppliers) ? suppliers.suppliers : []).length === 0 && <tr><td colSpan="3" className="p-4"><EmptyState message="No data" /></td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="card col-span-1 xl:col-span-3 p-0 flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
            <button className="text-xs text-blue-600">View All</button>
          </div>
          <div className="divide-y divide-gray-50 p-2">
            {(Array.isArray(notifications) ? notifications : []).slice(0, 5).map(n => (
              <div key={n.id} className="p-3 flex items-start gap-3 hover:bg-gray-50 rounded-lg">
                <div className={`mt-0.5 w-2 h-2 rounded-full ${n.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                <div>
                  <p className="text-sm text-gray-800 line-clamp-2">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
            {notifications.length === 0 && <span className="p-4 text-center block text-sm text-gray-400">No notifications</span>}
          </div>
        </div>

        <div className="card col-span-1 xl:col-span-3 p-0 flex flex-col">
          <div className="px-5 py-4 border-b border-red-100 bg-red-50/50 flex justify-between">
            <h2 className="text-sm font-semibold text-red-800">Low Stock</h2>
            <button onClick={() => navigate('/inventory/stock')} className="text-xs text-red-600">Inventory →</button>
          </div>
          <div className="divide-y divide-red-50 p-2">
            {lowStock.map(s => {
              const pct = Math.min(100, Math.max(0, ((Number(s.current_qty) || 0) / (Number(s.reorder_level) || 1)) * 100));
              return (
                <div key={s.sku_code} className="p-3 hover:bg-red-50/50 rounded-lg cursor-pointer max-w-full">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">{s.sku_code}</p>
                    <p className="text-xs font-mono text-red-600">{(parseFloat(s.current_qty) || 0).toFixed(2)} / {(parseFloat(s.reorder_level) || 0).toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 truncate">{s.description}</p>
                  <div className="w-full h-1.5 bg-red-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
            {lowStock.length === 0 && <span className="p-4 text-center block text-sm text-gray-400">Stock levels healthy</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
