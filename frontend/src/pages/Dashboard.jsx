import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import api from '../services/api';
import {
  DollarSign, ShoppingCart, TrendingUp, TrendingDown, Package,
  RotateCcw, AlertTriangle, ArrowUpRight, ArrowDownRight,
  RefreshCw, Calendar, Boxes, Users, Activity
} from 'lucide-react';

const CHART_COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#3b82f6', '#10b981'];

const TIMEFRAMES = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: '7 Days' },
  { key: 'monthly', label: '30 Days' },
  { key: 'yearly', label: '1 Year' },
  { key: 'all', label: 'All Time' },
];

// eslint-disable-next-line no-unused-vars
function StatCard({ title, value, subtitle, icon: Icon, iconColor, trend, gradient }) {
  const iconWrapClass = `w-10 h-10 rounded-xl flex items-center justify-center ${gradient ? 'bg-white/20' : (iconColor?.replace('text-', 'bg-')?.replace('-600', '-100') || 'bg-gray-100')}`;
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 ${gradient || 'bg-white border border-gray-100 shadow-sm'} group hover:-translate-y-0.5 transition-all duration-200`}>
      {!gradient && (
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${iconColor?.replace('text-', 'bg-')}`} />
      )}
      <div className="flex items-start justify-between mb-3">
        <div className={iconWrapClass}>
          <Icon size={20} className={gradient ? 'text-white' : iconColor} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 text-xs font-semibold px-2 py-1 rounded-full ${
            trend >= 0
              ? (gradient ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700')
              : (gradient ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700')
          }`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className={`text-sm font-medium mb-1 ${gradient ? 'text-white/80' : 'text-gray-500'}`}>{title}</p>
      <p className={`text-2xl font-black tracking-tight ${gradient ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {subtitle && <p className={`text-xs mt-1.5 font-medium ${gradient ? 'text-white/70' : 'text-gray-400'}`}>{subtitle}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
        <div className="w-16 h-6 bg-gray-200 rounded-full" />
      </div>
      <div className="w-24 h-4 bg-gray-200 rounded mb-2" />
      <div className="w-32 h-8 bg-gray-200 rounded" />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-4 text-sm">
        <p className="font-bold text-gray-800 mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center space-x-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600">{p.name}:</span>
            <span className="font-bold text-gray-900">${Number(p.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('monthly');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, chartsRes, recentRes] = await Promise.all([
        api.get(`/dashboard/summary?timeframe=${timeframe}`),
        api.get('/dashboard/charts'),
        api.get('/dashboard/recent-transactions?limit=8'),
      ]);
      setSummary(summaryRes.data);
      setCharts(chartsRes.data);
      setRecentTx(recentRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isProfit = (summary?.profit || 0) >= (summary?.loss || 0);
  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtCurrency = (n) => `$${fmt(n)}`;

  const txTypeConfig = {
    sale: { label: 'Sale', color: 'bg-emerald-100 text-emerald-700' },
    purchase: { label: 'Purchase', color: 'bg-blue-100 text-blue-700' },
    reverse: { label: 'Return', color: 'bg-orange-100 text-orange-700' },
    return: { label: 'Return', color: 'bg-orange-100 text-orange-700' },
    payment: { label: 'Payment', color: 'bg-purple-100 text-purple-700' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Business Overview</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading data...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.key}
                onClick={() => setTimeframe(tf.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  timeframe === tf.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={isProfit ? 'Net Profit' : 'Net Loss'}
            value={fmtCurrency(isProfit ? summary?.profit : summary?.loss)}
            subtitle={`${TIMEFRAMES.find(t => t.key === timeframe)?.label} period`}
            icon={isProfit ? TrendingUp : TrendingDown}
            gradient={isProfit
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20'
              : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/20'
            }
          />
          <StatCard
            title="Total Sales"
            value={fmtCurrency(summary?.sales_amount)}
            subtitle={`Cost: ${fmtCurrency(summary?.cost_price)}`}
            icon={DollarSign}
            iconColor="text-blue-600"
          />
          <StatCard
            title="Items Sold"
            value={fmt(summary?.sales_items)}
            subtitle="units in period"
            icon={ShoppingCart}
            iconColor="text-purple-600"
          />
          <StatCard
            title="Returns"
            value={fmtCurrency(summary?.returns_amount)}
            subtitle={`${fmt(summary?.returns_items)} items returned`}
            icon={RotateCcw}
            iconColor="text-rose-600"
          />
        </div>
      )}

      {/* Secondary KPIs */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Boxes size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Products</p>
              <p className="text-xl font-black text-gray-900">{fmt(summary?.product_count)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Suppliers</p>
              <p className="text-xl font-black text-gray-900">{fmt(summary?.supplier_count)}</p>
            </div>
          </div>
          <div className={`rounded-2xl border shadow-sm p-4 flex items-center space-x-4 ${
            (summary?.low_stock_count || 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              (summary?.low_stock_count || 0) > 0 ? 'bg-amber-100' : 'bg-gray-100'
            }`}>
              <AlertTriangle size={18} className={(summary?.low_stock_count || 0) > 0 ? 'text-amber-600' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Low Stock</p>
              <p className={`text-xl font-black ${(summary?.low_stock_count || 0) > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                {fmt(summary?.low_stock_count)}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center space-x-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Activity size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Purchases</p>
              <p className="text-xl font-black text-gray-900">{fmtCurrency(summary?.total_purchase)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 12-Month Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Revenue Trend</h3>
              <p className="text-xs text-gray-500 mt-0.5">12-month sales vs purchases</p>
            </div>
          </div>
          <div className="h-64 sm:h-72">
            {loading ? (
              <div className="h-full bg-gray-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts?.monthly_sales || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2.5} fill="url(#salesGrad)" name="Sales ($)" dot={false} activeDot={{ r: 5, fill: '#6366f1' }} />
                  <Area type="monotone" dataKey="purchases" stroke="#94a3b8" strokeWidth={2} fill="url(#purchaseGrad)" name="Purchases ($)" dot={false} activeDot={{ r: 4, fill: '#94a3b8' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900">Product Categories</h3>
            <p className="text-xs text-gray-500 mt-0.5">Distribution by count</p>
          </div>
          <div className="h-40 sm:h-48">
            {loading ? (
              <div className="h-full bg-gray-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.sales_distribution || []}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {charts?.sales_distribution?.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Legend */}
          <div className="mt-2 space-y-2">
            {charts?.sales_distribution?.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-xs text-gray-600 truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Products + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-gray-900">Top Products</h3>
              <p className="text-xs text-gray-500 mt-0.5">Last 30 days by quantity</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : charts?.top_products?.length > 0 ? (
            <div className="space-y-3">
              {charts.top_products.map((p, i) => {
                const maxQty = charts.top_products[0]?.qty || 1;
                const pct = Math.round((p.qty / maxQty) * 100);
                return (
                  <div key={i} className="flex items-center space-x-3">
                    <span className="text-xs font-black text-gray-400 w-4 flex-shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800 truncate">{p.name}</span>
                        <span className="text-xs font-bold text-gray-600 ml-2 flex-shrink-0">{p.qty} units</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Package size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sales data yet</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-gray-900">Recent Activity</h3>
              <p className="text-xs text-gray-500 mt-0.5">Latest transactions</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentTx.length > 0 ? (
            <div className="space-y-2">
              {recentTx.map((tx) => {
                const cfg = txTypeConfig[tx.type] || { label: tx.type, color: 'bg-gray-100 text-gray-700' };
                return (
                  <div key={tx.id} className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Activity size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{tx.product_name || tx.customer_name || 'Transaction'}</p>
                      <p className="text-xs text-gray-400">{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">${Number(tx.debit || 0).toLocaleString()}</p>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Activity size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
