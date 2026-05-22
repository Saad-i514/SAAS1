import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import api from '../services/api';
import { useRealtimeUpdates } from '../services/useRealtimeUpdates';
import { fmtDateShort } from '../services/dateUtils';
import {
  TrendingUp, TrendingDown, ShoppingCart, RotateCcw,
  AlertTriangle, RefreshCw, Package, Users, Activity,
  Boxes, ArrowUpRight, ArrowDownRight, Wifi,
} from 'lucide-react';
import BulkTransactionModal from '../components/BulkTransactionModal';
import CustomerSearchModal from '../components/CustomerSearchModal';

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#3b82f6'];

const TIMEFRAMES = [
  { key: 'daily',   label: 'Today' },
  { key: 'weekly',  label: '7 Days' },
  { key: 'monthly', label: '30 Days' },
  { key: 'yearly',  label: '1 Year' },
  { key: 'all',     label: 'All Time' },
];

const fmtK = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return String(v);
};

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtRs = (n) => `Rs ${fmt(n)}`;

function KpiCard({ title, value, sub, icon: Icon, accent = 'indigo', gradient = false, trend }) {
  const accents = {
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20',  icon: 'text-indigo-600 dark:text-indigo-400',  dot: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',       icon: 'text-rose-600 dark:text-rose-400',       dot: 'bg-rose-500' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',     icon: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20',   icon: 'text-purple-600 dark:text-purple-400',   dot: 'bg-purple-500' },
  };
  const a = accents[accent] || accents.indigo;

  if (gradient) {
    return (
      <div className={`rounded-xl p-5 flex flex-col gap-3 ${
        accent === 'emerald'
          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
          : 'bg-gradient-to-br from-rose-500 to-red-600'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Icon size={16} className="text-white" />
          </div>
          {trend !== undefined && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-white/80">
              {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div>
          <p className="text-white/70 text-xs font-medium">{title}</p>
          <p className="text-white text-2xl font-bold tabular mt-0.5">{value}</p>
          {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.bg}`}>
          <Icon size={16} className={a.icon} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${
            trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
          }`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-gray-500 dark:text-slate-400 text-xs font-medium">{title}</p>
        <p className="text-gray-900 dark:text-white text-2xl font-bold tabular mt-0.5">{value}</p>
        {sub && <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonKpi() {
  return (
    <div className="card p-5 space-y-3 animate-pulse">
      <div className="w-8 h-8 skeleton rounded-lg" />
      <div className="space-y-2">
        <div className="h-3 skeleton rounded w-20" />
        <div className="h-7 skeleton rounded w-28" />
      </div>
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1e2433] border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 dark:text-slate-300 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-slate-400">{p.name}:</span>
          <span className="font-semibold text-gray-800 dark:text-white">Rs {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [summary, setSummary]   = useState(null);
  const [charts, setCharts]     = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [timeframe, setTimeframe] = useState('monthly');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveEvent, setLiveEvent]     = useState(null);
  const [showBulk, setShowBulk]       = useState(false);
  const [showSearch, setShowSearch]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, cRes, rRes] = await Promise.all([
        api.get(`/dashboard/summary?timeframe=${timeframe}`),
        api.get('/dashboard/charts'),
        api.get('/dashboard/recent-transactions?limit=8'),
      ]);
      setSummary(sRes.data);
      setCharts(cRes.data);
      setRecentTx(rRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const debounceRef = useRef(null);
  useRealtimeUpdates((event) => {
    setLiveEvent(event);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(), 1500);
  });

  const isProfit = (summary?.profit || 0) >= (summary?.loss || 0);

  const txBadge = {
    sale:     'badge-green',
    purchase: 'badge-blue',
    reverse:  'badge-amber',
    return:   'badge-amber',
    payment:  'badge-purple',
  };
  const txLabel = { sale: 'Sale', purchase: 'Purchase', reverse: 'Return', return: 'Return', payment: 'Payment' };

  return (
    <div className="page animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Business Overview</h1>
          <p className="page-subtitle flex items-center gap-2">
            {error
              ? <span className="text-red-500">Failed to load data</span>
              : lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString()}`
                : loading ? 'Loading…' : 'Ready'
            }
            {liveEvent && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                <Wifi size={11} /> Live
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowSearch(true)} className="btn btn-secondary btn-sm">
            <Users size={14} />
            <span className="hidden sm:inline">Customer Search</span>
          </button>
          <button onClick={() => setShowBulk(true)} className="btn btn-secondary btn-sm">
            <ShoppingCart size={14} />
            <span className="hidden sm:inline">Bulk Order</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-secondary btn-icon"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {/* Timeframe tabs */}
          <div className="flex items-center bg-white dark:bg-[#161b27] border border-gray-200 dark:border-slate-700 rounded-lg p-0.5">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.key}
                onClick={() => setTimeframe(tf.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  timeframe === tf.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <BulkTransactionModal isOpen={showBulk} onClose={() => setShowBulk(false)} onSuccess={fetchData} />
      <CustomerSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />

      {/* ── Error ── */}
      {error && !loading && (
        <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
          <button onClick={fetchData} className="text-xs font-semibold text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => <SkeletonKpi key={i} />)
        ) : (
          <>
            <KpiCard
              title={isProfit ? 'Net Profit' : 'Net Loss'}
              value={fmtRs(isProfit ? summary?.profit : summary?.loss)}
              sub={`${TIMEFRAMES.find(t => t.key === timeframe)?.label} period`}
              icon={isProfit ? TrendingUp : TrendingDown}
              accent={isProfit ? 'emerald' : 'rose'}
              gradient
            />
            <KpiCard
              title="Total Sales"
              value={fmtRs(summary?.sales_amount)}
              sub={`Cost: ${fmtRs(summary?.cost_price)}`}
              icon={TrendingUp}
              accent="indigo"
            />
            <KpiCard
              title="Items Sold"
              value={fmt(summary?.sales_items)}
              sub="units in period"
              icon={ShoppingCart}
              accent="purple"
            />
            <KpiCard
              title="Returns"
              value={fmtRs(summary?.returns_amount)}
              sub={`${fmt(summary?.returns_items)} items`}
              icon={RotateCcw}
              accent="rose"
            />
          </>
        )}
      </div>

      {/* ── Secondary KPIs ── */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Products',   value: fmt(summary?.product_count),  icon: Boxes,         accent: 'indigo' },
            { label: 'Suppliers',  value: fmt(summary?.supplier_count), icon: Users,         accent: 'indigo' },
            { label: 'Low Stock',  value: fmt(summary?.low_stock_count),icon: AlertTriangle, accent: (summary?.low_stock_count || 0) > 0 ? 'amber' : 'indigo' },
            { label: 'Purchases',  value: fmtRs(summary?.total_purchase), icon: Activity,    accent: 'emerald' },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="card px-4 py-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                accent === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20' :
                accent === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                'bg-indigo-50 dark:bg-indigo-900/20'
              }`}>
                <Icon size={15} className={
                  accent === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                  accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                  'text-indigo-600 dark:text-indigo-400'
                } />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
                <p className="text-base font-bold text-gray-900 dark:text-white tabular">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Revenue trend */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div>
              <p className="section-title">Revenue Trend</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">12-month sales vs purchases</p>
            </div>
          </div>
          <div className="p-4 h-64">
            {loading ? (
              <div className="h-full skeleton rounded-lg" />
            ) : charts?.monthly_sales?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthly_sales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPurch" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-slate-800" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={fmtK} width={44} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="sales"     stroke="#6366f1" strokeWidth={2} fill="url(#gSales)" name="Sales"     dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                  <Area type="monotone" dataKey="purchases" stroke="#94a3b8" strokeWidth={1.5} fill="url(#gPurch)" name="Purchases" dot={false} activeDot={{ r: 3, fill: '#94a3b8' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">No data</div>
            )}
          </div>
        </div>

        {/* Category donut */}
        <div className="card">
          <div className="card-header">
            <div>
              <p className="section-title">Categories</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">By product count</p>
            </div>
          </div>
          <div className="p-4">
            <div className="h-40">
              {loading ? (
                <div className="h-full skeleton rounded-lg" />
              ) : charts?.sales_distribution?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.sales_distribution}
                      cx="50%" cy="50%"
                      innerRadius={48} outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {charts.sales_distribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No categories</div>
              )}
            </div>
            <div className="mt-3 space-y-1.5">
              {charts?.sales_distribution?.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-gray-600 dark:text-slate-300 truncate max-w-[110px]">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 tabular">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top products */}
        <div className="card">
          <div className="card-header">
            <div>
              <p className="section-title">Top Products</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Last 30 days by quantity</p>
            </div>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-9 skeleton rounded-lg" />)}
              </div>
            ) : charts?.top_products?.length ? (
              <div className="space-y-3">
                {charts.top_products.map((p, i) => {
                  const pct = Math.round((p.qty / (charts.top_products[0]?.qty || 1)) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-400 w-5 flex-shrink-0 tabular">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 dark:text-white truncate">{p.name}</span>
                          <span className="text-xs text-gray-500 dark:text-slate-400 ml-2 flex-shrink-0 tabular">{p.qty} units</span>
                        </div>
                        <div className="h-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state py-10">
                <div className="empty-state-icon"><Package size={20} className="text-gray-400" /></div>
                <p className="empty-state-title">No sales data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card">
          <div className="card-header">
            <div>
              <p className="section-title">Recent Activity</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Latest transactions</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-10 skeleton rounded-lg" />)}
              </div>
            ) : recentTx.length ? (
              recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {tx.product_name || tx.customer_name || 'Transaction'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {tx.date ? fmtDateShort(tx.date) : ''}
                      {tx.customer_name && tx.product_name ? ` · ${tx.customer_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge ${txBadge[tx.type] || 'badge-gray'}`}>
                      {txLabel[tx.type] || tx.type}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white tabular">
                      Rs {Number(tx.debit || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state py-10">
                <div className="empty-state-icon"><Activity size={20} className="text-gray-400" /></div>
                <p className="empty-state-title">No recent transactions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
