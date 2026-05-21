import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  ArrowLeftRight, Search, Filter, X, Trash2, ChevronDown,
  ChevronUp, Download, RefreshCw, TrendingUp, ShoppingCart,
  RotateCcw, CreditCard, Package,
} from 'lucide-react';

const TX_TYPES = ['all', 'sale', 'purchase', 'return', 'reverse', 'payment'];
const TIMEFRAMES = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

const typeStyle = {
  sale:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  purchase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  return:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  reverse:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  payment:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const typeIcon = { sale: TrendingUp, purchase: ShoppingCart, return: RotateCcw, reverse: RotateCcw, payment: CreditCard };

function SummaryCard({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center space-x-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [txType, setTxType] = useState('all');
  const [timeframe, setTimeframe] = useState('monthly');
  const [orderNo, setOrderNo] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const userRole = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').role; } catch { return ''; } })();
  const isAdmin = userRole === 'Admin' || userRole === 'SuperAdmin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeframe,
        limit: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      });
      if (txType !== 'all') params.set('transaction_type', txType);
      if (search.trim()) params.set('customer_name', search.trim());
      if (orderNo.trim()) params.set('order_no', orderNo.trim());
      const { data } = await api.get(`/transactions/?${params}`);
      setTransactions(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [timeframe, txType, search, orderNo, page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await api.delete(`/transactions/${id}`); load(); } catch (e) { alert(e.response?.data?.detail || 'Delete failed'); }
    setDeleteId(null);
  };

  const handleSort = (f) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc'); } };
  const SortIcon = ({ f }) => sortField === f ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  const sorted = [...transactions].sort((a, b) => {
    let av = a[sortField], bv = b[sortField];
    if (sortField === 'date') { av = new Date(av); bv = new Date(bv); }
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  // Summary stats from current view
  const summary = transactions.reduce((acc, tx) => {
    acc.total += tx.debit || 0;
    acc[tx.type?.value || tx.type] = (acc[tx.type?.value || tx.type] || 0) + (tx.debit || 0);
    return acc;
  }, { total: 0 });

  const exportCSV = () => {
    const rows = [['Date','Type','Order No','Product','Customer','Qty','Unit Price','Discount','Amount','Payment Term']];
    sorted.forEach(tx => rows.push([
      tx.date ? new Date(tx.date).toLocaleDateString() : '',
      tx.type, tx.order_no || '', tx.product_name || '', tx.customer_name || '',
      tx.quantity || 0, tx.unit_price || 0, tx.discount || 0, tx.debit || 0, tx.payment_term || '',
    ]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `transactions_${timeframe}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Full transaction history with filters</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={load} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all" title="Refresh"><RefreshCw size={16} /></button>
          <button onClick={exportCSV} className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
            <Download size={15} /><span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Amount" value={`Rs ${summary.total.toLocaleString(undefined,{maximumFractionDigits:0})}`} color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" icon={ArrowLeftRight} />
        <SummaryCard label="Sales" value={`Rs ${(summary.sale||0).toLocaleString(undefined,{maximumFractionDigits:0})}`} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" icon={TrendingUp} />
        <SummaryCard label="Purchases" value={`Rs ${(summary.purchase||0).toLocaleString(undefined,{maximumFractionDigits:0})}`} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" icon={ShoppingCart} />
        <SummaryCard label="Payments" value={`Rs ${(summary.payment||0).toLocaleString(undefined,{maximumFractionDigits:0})}`} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" icon={CreditCard} />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {TIMEFRAMES.map(tf => (
            <button key={tf.value} onClick={() => { setTimeframe(tf.value); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${timeframe === tf.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
              {tf.label}
            </button>
          ))}
          <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 self-center" />
          {TX_TYPES.map(t => (
            <button key={t} onClick={() => { setTxType(t); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all capitalize ${txType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by customer name…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div className="relative sm:w-48">
            <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Order number…" value={orderNo} onChange={e => { setOrderNo(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all" />
          </div>
          {(search || orderNo || txType !== 'all') && (
            <button onClick={() => { setSearch(''); setOrderNo(''); setTxType('all'); setPage(0); }}
              className="flex items-center space-x-1 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
              <X size={14} /><span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">Loading transactions…</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <ArrowLeftRight size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-semibold">No transactions found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                  <tr className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {[['date','Date'],['type','Type'],['order_no','Order'],['product_name','Product'],['customer_name','Customer'],['quantity','Qty'],['debit','Amount'],['payment_term','Payment']].map(([f,l]) => (
                      <th key={f} className="px-4 py-3 text-left cursor-pointer hover:text-gray-700 dark:hover:text-white select-none whitespace-nowrap" onClick={() => handleSort(f)}>
                        <span className="flex items-center gap-1">{l}<SortIcon f={f} /></span>
                      </th>
                    ))}
                    {isAdmin && <th className="px-4 py-3 text-right">Del</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {sorted.map(tx => {
                    const TIcon = typeIcon[tx.type] || Package;
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">{tx.date ? new Date(tx.date).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${typeStyle[tx.type] || 'bg-gray-100 text-gray-700'}`}>
                            <TIcon size={11} />{tx.type?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300 font-mono text-xs">{tx.order_no || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white max-w-[140px] truncate">{tx.product_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300 max-w-[120px] truncate">{tx.customer_name || '—'}</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-700 dark:text-slate-300">{tx.quantity || 0}</td>
                        <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">Rs {(tx.debit || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${tx.payment_term === 'Cash' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {tx.payment_term || 'Cash'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => setDeleteId(tx.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ml-auto"><Trash2 size={13} /></button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-800">
              <p className="text-xs text-gray-500 dark:text-slate-400">Showing {sorted.length} of {sorted.length >= PAGE_SIZE ? `${PAGE_SIZE}+` : sorted.length} results</p>
              <div className="flex items-center space-x-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Prev</button>
                <span className="text-xs text-gray-500 dark:text-slate-400">Page {page + 1}</span>
                <button disabled={sorted.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={20} className="text-red-600" /></div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Transaction?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">This cannot be undone. Stock levels will not be automatically reversed.</p>
            <div className="flex space-x-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
