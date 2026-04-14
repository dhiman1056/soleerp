import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import {
  useAnalyticsOverview,
  useProductionTrend,
  useMaterialConsumptionTrend,
  useProductMix,
  useWipByAge,
  useSupplierPerformance
} from '../hooks/useAnalytics'
import { useNotificationsQuery } from '../hooks/useNotifications'
import { useLowStockAlertsQuery } from '../hooks/useInventory'
import MetricCard from '../components/common/MetricCard.jsx'
import { formatCurrency } from '../utils/formatCurrency.js'
import { SkeletonCard, SkeletonChart, SkeletonRow } from '../components/common/Skeleton.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import { formatDistanceToNow } from 'date-fns'

const COLORS = {
  green: '#10b981', amber: '#f59e0b', orange: '#f97316',
  red: '#ef4444', blue: '#3b82f6', teal: '#14b8a6', purple: '#8b5cf6'
}

const PIE_COLORS = [COLORS.green, COLORS.amber, COLORS.orange, COLORS.red]
const BAR_COLORS = [COLORS.blue, COLORS.teal, COLORS.purple, COLORS.amber, COLORS.green]

export default function Dashboard() {
  const navigate = useNavigate()
  const [trendPeriod, setTrendPeriod] = useState('30d')
  const [mixPeriod,   setMixPeriod]   = useState('30d')

  // All analytics hooks return res.data.data (the payload object) directly
  const { data: overview,  isLoading: overviewLoading } = useAnalyticsOverview()
  const { data: prodTrend, isLoading: trendLoading }    = useProductionTrend(trendPeriod, 'day')
  const { data: matTrend,  isLoading: matLoading }      = useMaterialConsumptionTrend('30d')
  const { data: prodMix,   isLoading: mixLoading }      = useProductMix(mixPeriod)
  const { data: wipAge,    isLoading: wipLoading }      = useWipByAge()
  const { data: suppliers, isLoading: supLoading }      = useSupplierPerformance('90d')

  // These hooks also return payload directly (array)
  const { data: notifData } = useNotificationsQuery()
  const { data: alertsData } = useLowStockAlertsQuery()

  const notifications = Array.isArray(notifData) ? notifData : []
  const lowStock      = (Array.isArray(alertsData) ? alertsData : []).slice(0, 5)

  // ── Chart data helpers ───────────────────────────────────────────────────────
  const getChartData = (data, keys) => {
    if (!data || !Array.isArray(data.labels)) return []
    return data.labels.map((label, i) => {
      const obj = { name: label }
      keys.forEach(k => { obj[k] = Array.isArray(data[k]) ? (data[k][i] ?? 0) : 0 })
      return obj
    })
  }

  const getPieData = (data) => {
    if (!data || !Array.isArray(data.buckets)) return []
    return data.buckets.map((b, i) => ({
      name:     b,
      value:    Array.isArray(data.counts) ? (data.counts[i] ?? 0) : 0,
      valValue: Array.isArray(data.values) ? (data.values[i] ?? 0) : 0,
    }))
  }

  const getStackedData = (data) => {
    if (!data || !Array.isArray(data.series)) return []
    const materials = Array.isArray(data.materials) ? data.materials : []
    return data.series.map(s => {
      const obj = { name: s.month }
      materials.forEach((m, i) => { obj[m] = Array.isArray(s.values) ? (s.values[i] ?? 0) : 0 })
      return obj
    })
  }

  // ── KPI convenience aliases ──────────────────────────────────────────────────
  const o      = (overview && typeof overview === 'object') ? overview : {}
  const upDown = o.production?.trend === 'UP' ? '↑' : o.production?.trend === 'DOWN' ? '↓' : '-'

  const supplierList   = Array.isArray(suppliers?.suppliers) ? suppliers.suppliers : []
  const wipAgePieData  = getPieData(wipAge)
  const wipTotalOrders = wipAgePieData.reduce((a, b) => a + (Number(b.value) || 0), 0)
  const materials      = Array.isArray(matTrend?.materials) ? matTrend.materials : []

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {overviewLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
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
              value={`${Number(o.wip?.totalQty) || 0} units`}
              subtitle={`${Number(o.wip?.totalOrders) || 0} orders`}
              color="orange"
            />
            <MetricCard
              title="Stock Value"
              value={formatCurrency(Number(o.inventory?.totalStockValue) || 0)}
              subtitle={`${Number(o.inventory?.lowStockCount) || 0} low stock`}
              color="teal"
            />
            <MetricCard
              title="Open POs"
              value={Number(o.procurement?.openPOs) || 0}
              subtitle={formatCurrency(Number(o.procurement?.openPOValue) || 0)}
              color="purple"
            />
            <MetricCard
              title="Unread Alerts"
              value={Number(o.notifications?.unread) || 0}
              subtitle={`${Number(o.notifications?.critical) || 0} critical`}
              color={(Number(o.notifications?.critical) || 0) > 0 ? 'red' : 'gray'}
            />
          </>
        )}
      </div>

      {/* Row 2: Production Trend + WIP Age */}
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
                  <Line type="monotone" dataKey="planned"  name="Planned"  stroke={COLORS.blue}  strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="received" name="Received" stroke={COLORS.green} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="wip"      name="WIP"      stroke={COLORS.amber} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
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
                    data={wipAgePieData}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={100}
                    paddingAngle={5} dataKey="value"
                  >
                    {wipAgePieData.map((_, index) => (
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
                  <p className="text-2xl font-bold text-gray-900">{wipTotalOrders}</p>
                  <p className="text-xs text-gray-500">Orders</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Product Mix + Material Consumption */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                <YAxis fontSize={12} stroke="#9CA3AF" tickFormatter={val => `₹${val / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {materials.map((m, i) => (
                  <Bar key={m} dataKey={m} stackId="a" fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 4: Supplier Performance + Notifications + Low Stock */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
        {/* Supplier Performance */}
        <div className="card col-span-1 xl:col-span-4 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Supplier Performance</h2>
          </div>
          {supLoading ? (
            <div className="p-5"><table className="w-full"><tbody><SkeletonRow count={3} /></tbody></table></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3">Supplier</th>
                    <th className="px-5 py-3">Value</th>
                    <th className="px-5 py-3">On-Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supplierList.slice(0, 5).map(s => (
                    <tr key={s.id}>
                      <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[150px]">{s.name}</td>
                      <td className="px-5 py-3 text-gray-500">{formatCurrency(Number(s.totalValue) || 0)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden w-20">
                            <div
                              className={`h-full ${(Number(s.onTimeRate) || 0) >= 80 ? 'bg-green-500' : (Number(s.onTimeRate) || 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Number(s.onTimeRate) || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{Number(s.onTimeRate) || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {supplierList.length === 0 && (
                    <tr><td colSpan="3" className="p-4"><EmptyState message="No data" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="card col-span-1 xl:col-span-3 p-0 flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
            <button className="text-xs text-blue-600">View All</button>
          </div>
          <div className="divide-y divide-gray-50 p-2">
            {notifications.slice(0, 5).map(n => (
              <div key={n.id} className="p-3 flex items-start gap-3 hover:bg-gray-50 rounded-lg">
                <div className={`mt-0.5 w-2 h-2 rounded-full ${n.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-blue-500'}`} />
                <div>
                  <p className="text-sm text-gray-800 line-clamp-2">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                  </p>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <span className="p-4 text-center block text-sm text-gray-400">No notifications</span>
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="card col-span-1 xl:col-span-3 p-0 flex flex-col">
          <div className="px-5 py-4 border-b border-red-100 bg-red-50/50 flex justify-between">
            <h2 className="text-sm font-semibold text-red-800">Low Stock</h2>
            <button onClick={() => navigate('/inventory/stock')} className="text-xs text-red-600">Inventory →</button>
          </div>
          <div className="divide-y divide-red-50 p-2">
            {lowStock.map(s => {
              const currentQty   = Number(s.current_qty)   || 0
              const reorderLevel = Number(s.reorder_level) || 1
              const pct = Math.min(100, Math.max(0, (currentQty / reorderLevel) * 100))
              return (
                <div key={s.sku_code} className="p-3 hover:bg-red-50/50 rounded-lg cursor-pointer max-w-full">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">{s.sku_code}</p>
                    <p className="text-xs font-mono text-red-600">
                      {currentQty.toFixed(2)} / {(Number(s.reorder_level) || 0).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 truncate">{s.description}</p>
                  <div className="w-full h-1.5 bg-red-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {lowStock.length === 0 && (
              <span className="p-4 text-center block text-sm text-gray-400">Stock levels healthy</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
