import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import toast from 'react-hot-toast'
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
import { useWorkOrders } from '../hooks/useWorkOrders'
import { useAuth } from '../hooks/useAuth'
import MetricCard from '../components/common/MetricCard.jsx'
import { formatCurrency } from '../utils/formatCurrency.js'
import { SkeletonCard, SkeletonChart, SkeletonRow } from '../components/common/Skeleton.jsx'
import { formatDistanceToNow } from 'date-fns'

const THEME = {
  indigo: '#4f46e5',
  teal: '#0d9488',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  blue: '#0284c7',
  purple: '#9333ea',
  slate: '#64748b'
}

const PIE_COLORS = [THEME.emerald, THEME.blue, THEME.amber, THEME.rose, THEME.purple]
const BAR_COLORS = [THEME.indigo, THEME.teal, THEME.purple, THEME.amber, THEME.emerald]

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [trendPeriod, setTrendPeriod] = useState('30d')
  const [mixPeriod, setMixPeriod]     = useState('30d')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Analytics hooks
  const { data: overview,  isLoading: overviewLoading, refetch: refetchOverview } = useAnalyticsOverview()
  const { data: prodTrend, isLoading: trendLoading, refetch: refetchTrend }       = useProductionTrend(trendPeriod, 'day')
  const { data: matTrend,  isLoading: matLoading }                                = useMaterialConsumptionTrend('30d')
  const { data: prodMix,   isLoading: mixLoading }                                = useProductMix(mixPeriod)
  const { data: wipAge,    isLoading: wipLoading }                                = useWipByAge()
  const { data: suppliers, isLoading: supLoading }                                = useSupplierPerformance('90d')

  // Operational hooks
  const { data: notifData }  = useNotificationsQuery()
  const { data: alertsData } = useLowStockAlertsQuery()
  const { data: workOrdersData, isLoading: woLoading } = useWorkOrders()

  const notifications = Array.isArray(notifData) ? notifData : []
  const lowStock      = (Array.isArray(alertsData) ? alertsData : []).slice(0, 5)
  const workOrders    = (Array.isArray(workOrdersData) ? workOrdersData : []).slice(0, 5)

  // ── Manual refresh handler ──────────────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['work-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      ])
      toast.success('Dashboard metrics refreshed')
    } catch {
      toast.error('Failed to refresh data')
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  // ── Data Transformation Helpers ─────────────────────────────────────────────
  const getChartData = (data, keys) => {
    if (!data || !Array.isArray(data.labels) || data.labels.length === 0) return []
    return data.labels.map((label, i) => {
      const obj = { name: label }
      keys.forEach(k => { obj[k] = Array.isArray(data[k]) ? (data[k][i] ?? 0) : 0 })
      return obj
    })
  }

  const getPieData = (data) => {
    if (!data || !Array.isArray(data.buckets) || data.buckets.length === 0) return []
    return data.buckets.map((b, i) => ({
      name:     b,
      value:    Array.isArray(data.counts) ? (data.counts[i] ?? 0) : 0,
      valValue: Array.isArray(data.values) ? (data.values[i] ?? 0) : 0,
    }))
  }

  const getStackedData = (data) => {
    if (!data || !Array.isArray(data.series) || data.series.length === 0) return []
    const materials = Array.isArray(data.materials) ? data.materials : []
    return data.series.map(s => {
      const obj = { name: s.month }
      materials.forEach((m, i) => { obj[m] = Array.isArray(s.values) ? (s.values[i] ?? 0) : 0 })
      return obj
    })
  }

  // ── KPI Convenience Aliases ─────────────────────────────────────────────────
  const o = (overview && typeof overview === 'object') ? overview : {}
  const completionRate = Number(o.production?.thisMonth?.completionRate) || 0
  const completionTrend = o.production?.trend === 'UP' ? 'up' : o.production?.trend === 'DOWN' ? 'down' : null

  const supplierList   = Array.isArray(suppliers?.suppliers) ? suppliers.suppliers : []
  const wipAgePieData  = getPieData(wipAge)
  const wipTotalOrders = wipAgePieData.reduce((a, b) => a + (Number(b.value) || 0), 0)
  const materials      = Array.isArray(matTrend?.materials) ? matTrend.materials : []
  const prodTrendData  = getChartData(prodTrend, ['planned', 'received', 'wip'])
  const prodMixData    = getChartData(prodMix, ['qty', 'value'])
  const stackedMatData = getStackedData(matTrend)

  // Current Date display
  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Hero Operations Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/40">
        {/* Ambient background glows */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Plant 1: Operational (Shift A)
              </span>
              <span className="text-xs text-indigo-200/70 font-medium">
                {currentDateStr}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.name || 'Director'}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 max-w-xl leading-relaxed">
              Footwear Manufacturing & Supply Chain Command Center. Live throughput, work-in-progress buffers, and material procurement.
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            <button
              onClick={() => navigate('/work-orders')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-950/40 hover:shadow-indigo-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Work Order
            </button>

            <button
              onClick={() => navigate('/purchase-orders')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-medium border border-white/15 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              New PO
            </button>

            <button
              onClick={() => navigate('/wip')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-medium border border-white/15 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Floor WIP
            </button>

            <button
              onClick={handleRefresh}
              title="Refresh live metrics"
              className="inline-flex items-center justify-center p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <svg
                className={`w-4 h-4 text-indigo-200 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Row 1: Executive KPI Strip ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {overviewLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              title="Monthly Output"
              value={`${o.production?.thisMonth?.received ?? 0} / ${o.production?.thisMonth?.planned ?? 0}`}
              subtitle="Target: Output vs Planned Pairs"
              color="blue"
              badge="Throughput"
              onClick={() => navigate('/work-orders')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />

            <MetricCard
              title="Completion Rate"
              value={`${completionRate}%`}
              subtitle="Floor Plan Adherence"
              color={completionRate >= 80 ? 'green' : completionRate >= 50 ? 'amber' : 'orange'}
              trend={completionTrend}
              trendValue={completionTrend ? `${completionRate}%` : null}
              badge={completionRate >= 80 ? 'Optimal' : 'Active'}
              onClick={() => navigate('/reports/production')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

            <MetricCard
              title="Active WIP"
              value={`${Number(o.wip?.totalQty) || 0} units`}
              subtitle={`${Number(o.wip?.totalOrders) || 0} production batches`}
              color="amber"
              badge="On Floor"
              onClick={() => navigate('/wip')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />

            <MetricCard
              title="Stock Value"
              value={formatCurrency(Number(o.inventory?.totalStockValue) || 0)}
              subtitle={`${Number(o.inventory?.lowStockCount) || 0} items at reorder`}
              color="teal"
              badge={(Number(o.inventory?.lowStockCount) || 0) > 0 ? 'Review Reorder' : 'Healthy'}
              onClick={() => navigate('/inventory/stock')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
            />

            <MetricCard
              title="Procurement POs"
              value={`${Number(o.procurement?.openPOs) || 0} Open`}
              subtitle={formatCurrency(Number(o.procurement?.openPOValue) || 0)}
              color="purple"
              badge="Suppliers"
              onClick={() => navigate('/purchase-orders')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />

            <MetricCard
              title="System Alerts"
              value={Number(o.notifications?.unread) || 0}
              subtitle={`${Number(o.notifications?.critical) || 0} critical priority`}
              color={(Number(o.notifications?.critical) || 0) > 0 ? 'red' : 'gray'}
              badge={(Number(o.notifications?.critical) || 0) > 0 ? 'Requires Action' : 'All Clear'}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* ─── Row 2: Production Velocity + WIP Aging ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Production Throughput Chart */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm xl:col-span-8 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Production Throughput & Target Velocity
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time tracking of planned pairs, completed goods, and active floor WIP volume.
              </p>
            </div>

            {/* Time Period Selector Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 self-start sm:self-auto">
              {[
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: '90d', label: '90 Days' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTrendPeriod(tab.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    trendPeriod === tab.id
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {trendLoading ? (
            <SkeletonChart />
          ) : prodTrendData.length > 0 ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={prodTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.indigo} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={THEME.indigo} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.emerald} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={THEME.emerald} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradWip" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.amber} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={THEME.amber} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} />
                  <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '16px', fontSize: '12px', fontWeight: 500 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="planned"
                    name="Planned (Pairs)"
                    stroke={THEME.indigo}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradPlanned)"
                  />
                  <Area
                    type="monotone"
                    dataKey="received"
                    name="Received (Pairs)"
                    stroke={THEME.emerald}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradReceived)"
                  />
                  <Area
                    type="monotone"
                    dataKey="wip"
                    name="WIP Active"
                    stroke={THEME.amber}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#gradWip)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[320px] w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No Production History for this Period</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Work orders logged during this period will automatically map planned output against completed pairs here.
              </p>
              <button
                onClick={() => navigate('/work-orders')}
                className="btn-primary text-xs py-2 px-4 shadow-sm"
              >
                + Launch New Work Order
              </button>
            </div>
          )}
        </div>

        {/* WIP Aging & Stage Distribution */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm xl:col-span-4 flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <h2 className="text-base font-bold text-slate-900 tracking-tight">WIP Aging Breakdown</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Floor Buffer
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Distribution of ongoing shoe manufacturing lots by age.</p>
          </div>

          {wipLoading ? (
            <SkeletonChart />
          ) : (
            <div className="flex-1 flex flex-col justify-center min-h-[260px]">
              <div className="relative h-[200px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wipAgePieData.length > 0 ? wipAgePieData : [{ name: 'Ready', value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {wipAgePieData.length > 0 ? (
                        wipAgePieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))
                      ) : (
                        <Cell fill="#e2e8f0" />
                      )}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [`${value} Orders (${formatCurrency(props.payload.valValue || 0)})`, name]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '10px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{wipTotalOrders}</p>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Batches</p>
                  </div>
                </div>
              </div>

              {/* Floor Stage Legend & Breakdown */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                {wipAgePieData.length > 0 ? (
                  wipAgePieData.map((bucket, i) => (
                    <div key={bucket.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="font-medium text-slate-700">{bucket.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900 font-mono">
                        {bucket.value} <span className="text-[10px] text-slate-400 font-normal">({formatCurrency(bucket.valValue)})</span>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2">
                    <p className="text-xs text-slate-400">All floor staging queues clear</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Row 3: Active Production Batches + Product Category Mix ──────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Active Work Orders */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm xl:col-span-7 flex flex-col justify-between overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Production Batches</h2>
                <p className="text-xs text-slate-500">Recently scheduled & active work orders on the assembly line.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/work-orders')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              View All →
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            {woLoading ? (
              <div className="p-4"><SkeletonRow count={4} /></div>
            ) : workOrders.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">WO Code</th>
                    <th className="py-3 px-4">Product SKU</th>
                    <th className="py-3 px-4 text-center">Progress</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workOrders.map((wo) => {
                    const planned = Number(wo.planned_qty) || 0
                    const received = Number(wo.received_qty) || 0
                    const pct = planned > 0 ? Math.min(100, Math.round((received / planned) * 100)) : 0

                    return (
                      <tr key={wo.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-indigo-900">
                          {wo.wo_code}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{wo.sku_code || '—'}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{wo.product_description || wo.design_no || 'Footwear Batch'}</p>
                        </td>
                        <td className="py-3 px-4 text-center min-w-[120px]">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono font-medium text-slate-600">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                            wo.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            wo.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {wo.status || 'PLANNED'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => navigate(`/work-orders/${wo.id}`)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <p className="text-sm font-semibold text-slate-700">No active work orders</p>
                <p className="text-xs text-slate-400 mt-1 mb-3">Launch a work order to monitor floor production progress.</p>
                <button onClick={() => navigate('/work-orders')} className="btn-primary text-xs py-1.5 px-3">
                  + Create Work Order
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Product Mix Bar Chart */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm xl:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Product Mix Volume</h2>
                <p className="text-xs text-slate-500">Distribution across categories.</p>
              </div>
            </div>

            <select
              className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg py-1 px-2.5 outline-none"
              value={mixPeriod}
              onChange={e => setMixPeriod(e.target.value)}
            >
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
            </select>
          </div>

          {mixLoading ? (
            <SkeletonChart />
          ) : prodMixData.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prodMixData} layout="vertical" margin={{ left: 20, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" fontSize={11} stroke="#94a3b8" width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '10px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="qty" name="Pairs Output" fill={THEME.teal} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center text-center p-4">
              <p className="text-xs text-slate-400">No category mix metrics logged for this window.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Row 4: Material Consumption + Supplier Performance + Low Stock ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Raw Material Consumption */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm xl:col-span-5 flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Material Consumption</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Top raw materials consumed in production lots.</p>
          </div>

          {matLoading ? (
            <SkeletonChart />
          ) : stackedMatData.length > 0 ? (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedMatData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={val => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {materials.map((m, i) => (
                    <Bar key={m} dataKey={m} stackId="a" fill={BAR_COLORS[i % BAR_COLORS.length]} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-center p-4">
              <p className="text-xs text-slate-400">No material consumption recorded yet.</p>
            </div>
          )}
        </div>

        {/* Top Suppliers */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm xl:col-span-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Supplier Reliability</h2>
            </div>
            <button onClick={() => navigate('/suppliers')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              Suppliers →
            </button>
          </div>

          {supLoading ? (
            <div className="space-y-3"><SkeletonRow count={3} /></div>
          ) : supplierList.length > 0 ? (
            <div className="space-y-3.5">
              {supplierList.slice(0, 4).map(s => {
                const onTime = Number(s.onTimeRate) || 0
                return (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{s.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{formatCurrency(Number(s.totalValue) || 0)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                        onTime >= 85 ? 'bg-emerald-100 text-emerald-800' : onTime >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {onTime}% On-Time
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-center p-4">
              <p className="text-xs text-slate-400">No vendor purchase history logged yet.</p>
            </div>
          )}
        </div>

        {/* Low Stock Watchlist */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm xl:col-span-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Reorder Watch</h2>
            </div>
            <button onClick={() => navigate('/inventory/stock')} className="text-xs font-semibold text-rose-600 hover:text-rose-800">
              Stock →
            </button>
          </div>

          <div className="space-y-3">
            {lowStock.length > 0 ? (
              lowStock.slice(0, 3).map(s => {
                const current = Number(s.current_qty) || 0
                const reorder = Number(s.reorder_level) || 1
                const pct = Math.min(100, Math.max(0, Math.round((current / reorder) * 100)))

                return (
                  <div key={s.sku_code} className="p-3 rounded-xl bg-rose-50/40 border border-rose-100/80">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs font-bold text-slate-900 truncate max-w-[120px]">{s.sku_code}</span>
                      <span className="text-[11px] font-bold text-rose-600 font-mono">
                        {current} / {reorder}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mb-2">{s.description}</p>
                    <div className="w-full h-1.5 bg-rose-200/60 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
                <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-700">Stock Levels Healthy</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No critical materials at reorder threshold.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
