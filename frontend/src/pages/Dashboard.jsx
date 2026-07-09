import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import api from '../services/api';
import { useRealtimeUpdates } from '../services/useRealtimeUpdates';
import { useTheme } from '../context/theme-context';
import { fmtDateShort } from '../services/dateUtils';
import {
  TrendingUp, TrendingDown, ShoppingCart, RotateCcw,
  AlertTriangle, RefreshCw, Package, Users, Activity,
  Boxes, Wifi, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import BulkTransactionModal from '../components/BulkTransactionModal';
import CustomerSearchModal from '../components/CustomerSearchModal';

/* ── Design tokens — warm ink + cream monochrome ──────────────────────────── */
const C = {
  ink:     '#1c1815',
  ink2:    '#3a332a',
  taupe:   '#7a7063',
  sand:    '#a99c88',
  cream:   '#d6c9b0',
  emerald: '#3f7d5a',   // muted positive (semantic only)
  rose:    '#a6432e',   // muted negative (semantic only)
  amber:   '#a9762a',   // muted warning (semantic only)
};
// Monochrome ink→cream ramp for categorical charts
const PIE_COLORS = ['#1c1815', '#4a433b', '#7a7063', '#a99c88', '#c9bca3', '#ded2bb'];

const TIMEFRAMES = [
  { key: 'daily',   label: 'Today' },
  { key: 'weekly',  label: '7 Days' },
  { key: 'monthly', label: '30 Days' },
  { key: 'yearly',  label: '1 Year' },
  { key: 'all',     label: 'All Time' },
];

const fmt   = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtRs = (n) => `Rs\u00a0${fmt(n)}`;
const fmtK  = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return String(v);
};

/* ── KPI Card ──────────────────────────────────────────────────────────────── */
function KpiCard({ title, value, sub, icon: Icon, featured = false }) {
  // Chips are warm-neutral; the featured tile is always solid ink (cream text).
  const chipBg   = 'bg-[#efe6d4] dark:bg-white/[0.06]';
  const chipText = 'text-[#3a332a] dark:text-[#e7dcc6]';
  const p = { bg: chipBg, text: chipText, grad: 'from-[#2a241d] to-[#14110e]' };

  if (featured) {
    return (
      <div className={`glass-accent lift p-5 flex flex-col gap-3 bg-gradient-to-br ${p.grad}`}>
        <div className="relative z-10 flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25">
            <Icon size={19} className="text-white" />
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest">{title}</p>
          <p className="text-white text-[28px] font-bold tabular leading-tight mt-1 drop-shadow-sm">{value}</p>
          {sub && <p className="text-white/60 text-xs mt-1.5">{sub}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card lift p-5 flex flex-col gap-3">
      <div className={`glass-chip w-10 h-10 ${p.bg}`}>
        <Icon size={18} className={p.text} />
      </div>
      <div>
        <p className="text-gray-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-widest">{title}</p>
        <p className="text-gray-900 dark:text-white text-[24px] font-bold tabular leading-tight mt-1">{value}</p>
        {sub && <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonKpi() {
  return (
    <div className="glass-card p-5 space-y-3 animate-pulse">
      <div className="w-10 h-10 skeleton rounded-xl" />
      <div className="space-y-2">
        <div className="h-2.5 skeleton rounded w-16" />
        <div className="h-7 skeleton rounded w-24" />
        <div className="h-2 skeleton rounded w-20" />
      </div>
    </div>
  );
}

/* ── Chart tooltip ─────────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1e2433] border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-gray-700 dark:text-slate-200 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-700">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: p.color || p.fill }} />
            <span className="text-gray-500 dark:text-slate-400">{p.name}</span>
          </div>
          <span className="font-semibold text-gray-800 dark:text-white tabular">
            Rs {Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Donut center label ─────────────────────────────────────────────────────── */
const DonutLabel = ({ viewBox, total }) => {
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-6" className="fill-gray-900 dark:fill-white" style={{ fontSize: 18, fontWeight: 700 }}>
        {total}
      </tspan>
      <tspan x={cx} dy="18" style={{ fontSize: 10, fill: '#94a3b8' }}>
        products
      </tspan>
    </text>
  );
};

/* ── Main component ─────────────────────────────────────────────────────────── */
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
  const requestSeqRef = useRef(0);
  const { dark } = useTheme();

  // Theme-aware monochrome chart palette (dark inks on light, cream tints on dark)
  const chart = dark
    ? { ink: '#efe6d4', ink2: '#c9bca3', sand: '#5a5140', grid: 'rgba(242,234,219,0.08)', axis: '#857a68',
        ramp: ['#efe6d4', '#c9bca3', '#9a8f7e', '#6f6653', '#4a4235', '#37301f'] }
    : { ink: '#1c1815', ink2: '#3a332a', sand: '#c9bca3', grid: '#e7ddca', axis: '#9a8f7e',
        ramp: PIE_COLORS };

  const fetchData = useCallback(async () => {
    const requestId = requestSeqRef.current + 1;
    requestSeqRef.current = requestId;

    setLoading(true);
    setError(null);
    setSummary(null);

    const [summaryRes, chartsRes, recentRes] = await Promise.allSettled([
      api.get('/dashboard/summary', { params: { timeframe } }),
      api.get('/dashboard/charts'),
      api.get('/dashboard/recent-transactions', { params: { limit: 8 } }),
    ]);

    if (requestSeqRef.current !== requestId) return;

    const failures = [];
    if (summaryRes.status === 'fulfilled') {
      setSummary(summaryRes.value.data);
    } else {
      failures.push(summaryRes.reason);
    }

    if (chartsRes.status === 'fulfilled') {
      setCharts(chartsRes.value.data);
    } else {
      failures.push(chartsRes.reason);
      setCharts(null);
    }

    if (recentRes.status === 'fulfilled') {
      setRecentTx(recentRes.value.data);
    } else {
      failures.push(recentRes.reason);
      setRecentTx([]);
    }

    if (failures.length) {
      const err = failures[0];
      setError(err?.response?.data?.detail || err?.message || 'Failed to load');
    } else {
      setLastUpdated(new Date());
    }

    setLoading(false);
  }, [timeframe]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const debounceRef = useRef(null);
  useRealtimeUpdates((event) => {
    setLiveEvent(event);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(), 1500);
  });

  const isProfit = (summary?.profit || 0) >= (summary?.loss || 0);
  const totalProducts = charts?.sales_distribution?.reduce((s, i) => s + i.value, 0) || 0;

  const txBadge = { sale: 'badge-green', purchase: 'badge-blue', reverse: 'badge-amber', return: 'badge-amber', payment: 'badge-purple' };
  const txLabel = { sale: 'Sale', purchase: 'Purchase', reverse: 'Return', return: 'Return', payment: 'Payment' };

  return (
    <div className="page animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Business Overview</h1>
          <p className="page-subtitle flex items-center gap-2">
            {error ? <span className="text-red-500">Failed to load</span>
              : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}`
              : loading ? 'Loading…' : 'Ready'}
            {liveEvent && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                <Wifi size={11} /> Live
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowSearch(true)} className="btn btn-secondary btn-sm">
            <Users size={14} /><span className="hidden sm:inline">Customer Search</span>
          </button>
          <button onClick={() => setShowBulk(true)} className="btn btn-secondary btn-sm">
            <ShoppingCart size={14} /><span className="hidden sm:inline">Bulk Order</span>
          </button>
          <button onClick={fetchData} disabled={loading} className="btn btn-secondary btn-icon">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex items-center glass rounded-xl p-0.5">
            {TIMEFRAMES.map(tf => (
              <button key={tf.key} onClick={() => setTimeframe(tf.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  timeframe === tf.key
                    ? 'bg-[#1c1815] text-[#f5efe2] dark:bg-[#efe6d4] dark:text-[#1c1815] shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}>
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
            <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
          <button onClick={fetchData} className="text-xs font-semibold text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {/* ── Primary KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading || !summary ? [...Array(4)].map((_, i) => <SkeletonKpi key={i} />) : (
          <>
            <KpiCard
              title={isProfit ? 'Net Profit' : 'Net Loss'}
              value={fmtRs(isProfit ? summary?.profit : summary?.loss)}
              sub={`${TIMEFRAMES.find(t => t.key === timeframe)?.label} period`}
              icon={isProfit ? TrendingUp : TrendingDown}
              color={isProfit ? 'emerald' : 'rose'}
              featured
            />
            <KpiCard title="Total Sales"  value={fmtRs(summary?.sales_amount)}  sub={`Cost: ${fmtRs(summary?.cost_price)}`} icon={TrendingUp}   color="violet" />
            <KpiCard title="Items Sold"   value={fmt(summary?.sales_items)}      sub="units in period"                       icon={ShoppingCart} color="blue" />
            <KpiCard title="Returns"      value={fmtRs(summary?.returns_amount)} sub={`${fmt(summary?.returns_items)} items`} icon={RotateCcw}   color="amber" />
          </>
        )}
      </div>

      {/* ── Secondary KPIs ── */}
      {!loading && summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Products',   value: fmt(summary?.product_count),    icon: Boxes,         color: 'text-[#3a332a] dark:text-[#e7dcc6]', bg: '' },
            { label: 'Suppliers',  value: fmt(summary?.supplier_count),   icon: Users,         color: 'text-[#3a332a] dark:text-[#e7dcc6]', bg: '' },
            { label: 'Low Stock',  value: fmt(summary?.low_stock_count),  icon: AlertTriangle, color: (summary?.low_stock_count||0)>0 ? 'text-amber-700 dark:text-amber-500' : 'text-[#3a332a] dark:text-[#e7dcc6]', bg: (summary?.low_stock_count||0)>0 ? 'bg-amber-100/60 dark:bg-amber-900/15' : '' },
            { label: 'Purchases',  value: fmtRs(summary?.total_purchase), icon: Activity,      color: 'text-[#3a332a] dark:text-[#e7dcc6]', bg: '' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-card lift px-4 py-3.5 flex items-center gap-3">
              <div className={`glass-chip w-9 h-9 flex-shrink-0 ${bg}`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-wide font-medium">{label}</p>
                <p className="text-[15px] font-bold text-gray-900 dark:text-white tabular mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Revenue — ComposedChart: bars + line */}
        <div className="glass-card lg:col-span-2">
          <div className="card-header">
            <div>
              <p className="section-title">Revenue Trend</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">12-month sales vs purchases</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block" style={{background:chart.ink}} />Sales</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block" style={{background:chart.sand}} />Purchases</span>
            </div>
          </div>
          <div className="p-4 h-[260px]">
            {loading ? <div className="h-full skeleton rounded-lg" /> :
             charts?.monthly_sales?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={charts.monthly_sales} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={2}>
                  <defs>
                    <linearGradient id="barSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={chart.ink} stopOpacity={1} />
                      <stop offset="100%" stopColor={chart.ink2} stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke={chart.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} tickFormatter={fmtK} width={42} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: dark ? 'rgba(242,234,219,0.06)' : 'rgba(28,24,20,0.05)' }} />
                  <Bar dataKey="sales" name="Sales" fill="url(#barSales)" radius={[4,4,0,0]} maxBarSize={28} />
                  <Bar dataKey="purchases" name="Purchases" fill={chart.sand} radius={[4,4,0,0]} maxBarSize={28} />
                  <Line type="monotone" dataKey="sales" stroke={chart.ink} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: chart.ink }} legendType="none" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">No data available</div>
            )}
          </div>
        </div>

        {/* Category donut */}
        <div className="glass-card flex flex-col">
          <div className="card-header">
            <div>
              <p className="section-title">Product Categories</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Distribution by count</p>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <div className="h-44">
              {loading ? <div className="h-full skeleton rounded-lg" /> :
               charts?.sales_distribution?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.sales_distribution}
                      cx="50%" cy="50%"
                      innerRadius={52} outerRadius={74}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      labelLine={false}
                    >
                      {charts.sales_distribution.map((_, i) => (
                        <Cell key={i} fill={chart.ramp[i % chart.ramp.length]} />
                      ))}
                      <DonutLabel total={totalProducts} />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No categories</div>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {charts?.sales_distribution?.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: chart.ramp[i % chart.ramp.length] }} />
                    <span className="text-xs text-gray-600 dark:text-slate-300 truncate">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 tabular ml-2">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top products */}
        <div className="glass-card">
          <div className="card-header">
            <div>
              <p className="section-title">Top Products</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Last 30 days by quantity sold</p>
            </div>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-9 skeleton rounded-lg" />)}</div>
            ) : charts?.top_products?.length ? (
              <div className="space-y-3.5">
                {charts.top_products.map((p, i) => {
                  const pct = Math.round((p.qty / (charts.top_products[0]?.qty || 1)) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-300 dark:text-slate-600 w-5 flex-shrink-0 tabular text-right">#{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px] font-medium text-gray-800 dark:text-slate-200 truncate">{p.name}</span>
                          <span className="text-xs text-gray-500 dark:text-slate-400 ml-2 flex-shrink-0 tabular">{p.qty} units</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: chart.ramp[i % chart.ramp.length] }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state py-8">
                <div className="empty-state-icon"><Package size={18} className="text-gray-400" /></div>
                <p className="empty-state-title">No sales data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="glass-card">
          <div className="card-header">
            <div>
              <p className="section-title">Recent Activity</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Latest transactions</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-800/70">
            {loading ? (
              <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-11 skeleton rounded-lg" />)}</div>
            ) : recentTx.length ? recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-800 dark:text-slate-200 truncate">
                    {tx.product_name || tx.customer_name || 'Transaction'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                    {tx.date ? fmtDateShort(tx.date) : ''}
                    {tx.customer_name && tx.product_name ? ` · ${tx.customer_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge ${txBadge[tx.type] || 'badge-gray'}`}>{txLabel[tx.type] || tx.type}</span>
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white tabular">
                    Rs {Number(tx.debit || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )) : (
              <div className="empty-state py-8">
                <div className="empty-state-icon"><Activity size={18} className="text-gray-400" /></div>
                <p className="empty-state-title">No recent transactions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
