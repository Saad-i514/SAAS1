import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  Search, X, Trash2, ChevronDown, ChevronUp,
  Download, RefreshCw, TrendingUp, ShoppingCart,
  RotateCcw, CreditCard, Package, ArrowLeftRight,
} from 'lucide-react';
import { fmtDateShort } from '../services/dateUtils';

const TX_TYPES = ['all', 'sale', 'purchase', 'return', 'reverse', 'payment'];
const TIMEFRAMES = [
  { value: 'daily',   label: 'Today' },
  { value: 'weekly',  label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'all',     label: 'All Time' },
];

const TYPE_BADGE = {
  sale:     'badge-green',
  purchase: 'badge-blue',
  return:   'badge-amber',
  reverse:  'badge-amber',
  payment:  'badge-purple',
};

const TYPE_ICON = {
  sale: TrendingUp, purchase: ShoppingCart,
  return: RotateCcw, reverse: RotateCcw, payment: CreditCard,
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [txType, setTxType]     = useState('all');
  const [timeframe, setTimeframe] = useState('monthly');
  const [orderNo, setOrderNo]   = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir]   = useState('desc');
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage]         = useState(0);
  const PAGE = 50;

  const userRole = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').role; } catch { return ''; } })();
  const isAdmin  = userRole === 'Admin' || userRole === 'SuperAdmin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ timeframe, limit: PAGE, skip: page * PAGE });
      if (txType !== 'all') params.set('transaction_type', txType);
      if (search.trim())    params.set('customer_name', search.trim());
      if (orderNo.trim())   params.set('order_no', orderNo.trim());
      const { data } = await api.get(`/transactions/?${params}`);
      setTransactions(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [timeframe, txType, search, orderNo, page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await api.delete(`/transactions/${id}`); load(); }
    catch (e) { alert(e.response?.data?.detail || 'Delete failed'); }
    setDeleteId(null);
  };

  const handleSort = (f) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
  };

  const SortIcon = ({ f }) => sortField === f
    ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
    : null;

  const sorted = [...transactions].sort((a, b) => {
    let av = a[sortField], bv = b[sortField];
    if (sortField === 'date') { av = new Date(av); bv = new Date(bv); }
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const summary = transactions.reduce((acc, tx) => {
    acc.total += tx.debit || 0;
    const t = tx.type?.value || tx.type;
    acc[t] = (acc[t] || 0) + (tx.debit || 0);
    return acc;
  }, { total: 0 });

  const exportCSV = () => {
    const rows = [['Date','Type','Order No','Product','Customer','Qty','Unit Price','Discount','Amount','Payment']];
    sorted.forEach(tx => rows.push([
      tx.date ? fmtDateShort(tx.date) : '',
      tx.type, tx.order_no || '', tx.product_name || '', tx.customer_name || '',
      tx.quantity || 0, tx.unit_price || 0, tx.discount || 0, tx.debit || 0, tx.payment_term || '',
    ]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `transactions_${timeframe}.csv`;
    a.click();
  };

  const fmtRs = (n) => `Rs ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="page animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Full transaction history with filters</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn btn-secondary btn-icon">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportCSV} className="btn btn-secondary btn-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: fmtRs(summary.total),    badge: 'badge-blue',   icon: ArrowLeftRight },
          { label: 'Sales',     value: fmtRs(summary.sale),     badge: 'badge-green',  icon: TrendingUp },
          { label: 'Purchases', value: fmtRs(summary.purchase), badge: 'badge-blue',   icon: ShoppingCart },
          { label: 'Payments',  value: fmtRs(summary.payment),  badge: 'badge-purple', icon: CreditCard },
        ].map(({ label, value, badge, icon: Icon }) => (
          <div key={label} className="card px-4 py-3 flex items-center gap-3">
            <span className={`badge ${badge} flex-shrink-0`}><Icon size={12} /></span>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white tabular">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 space-y-3">
        {/* Timeframe + type pills */}
        <div className="flex flex-wrap gap-1.5">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              onClick={() => { setTimeframe(tf.value); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                timeframe === tf.value
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300'
              }`}
            >
              {tf.label}
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 self-center mx-1" />
          {TX_TYPES.map(t => (
            <button
              key={t}
              onClick={() => { setTxType(t); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                txType === t
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300'
              }`}
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>

        {/* Search inputs */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name…"
              className="input pl-8 py-2 text-xs"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <div className="relative sm:w-44">
            <input
              type="text"
              placeholder="Order number…"
              className="input py-2 text-xs"
              value={orderNo}
              onChange={e => { setOrderNo(e.target.value); setPage(0); }}
            />
          </div>
          {(search || orderNo || txType !== 'all') && (
            <button
              onClick={() => { setSearch(''); setOrderNo(''); setTxType('all'); setPage(0); }}
              className="btn btn-ghost btn-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-slate-500">Loading transactions…</div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ArrowLeftRight size={20} className="text-gray-400" /></div>
            <p className="empty-state-title">No transactions found</p>
            <p className="empty-state-desc">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {[
                      ['date',         'Date'],
                      ['type',         'Type'],
                      ['order_no',     'Order'],
                      ['product_name', 'Product'],
                      ['customer_name','Customer'],
                      ['quantity',     'Qty'],
                      ['debit',        'Amount'],
                      ['payment_term', 'Payment'],
                    ].map(([f, l]) => (
                      <th
                        key={f}
                        className="cursor-pointer hover:text-gray-600 dark:hover:text-slate-200 select-none"
                        onClick={() => handleSort(f)}
                      >
                        <span className="flex items-center gap-1">{l}<SortIcon f={f} /></span>
                      </th>
                    ))}
                    {isAdmin && <th className="text-right">Del</th>}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(tx => {
                    const Icon = TYPE_ICON[tx.type] || Package;
                    return (
                      <tr key={tx.id} className="group">
                        <td className="text-gray-500 dark:text-slate-400 tabular whitespace-nowrap">
                          {tx.date ? fmtDateShort(tx.date) : '—'}
                        </td>
                        <td>
                          <span className={`badge ${TYPE_BADGE[tx.type] || 'badge-gray'} gap-1`}>
                            <Icon size={10} />
                            {tx.type?.toUpperCase()}
                          </span>
                        </td>
                        <td className="font-mono text-xs text-gray-500 dark:text-slate-400">
                          {tx.order_no || '—'}
                        </td>
                        <td className="font-medium text-gray-900 dark:text-white max-w-[140px] truncate">
                          {tx.product_name || '—'}
                        </td>
                        <td className="max-w-[120px] truncate text-gray-600 dark:text-slate-300">
                          {tx.customer_name || '—'}
                        </td>
                        <td className="text-center font-medium tabular">{tx.quantity || 0}</td>
                        <td className="font-semibold tabular text-gray-900 dark:text-white whitespace-nowrap">
                          Rs {(tx.debit || 0).toFixed(2)}
                        </td>
                        <td>
                          <span className={`badge ${tx.payment_term === 'Cash' ? 'badge-green' : 'badge-blue'}`}>
                            {tx.payment_term || 'Cash'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="text-right">
                            <button
                              onClick={() => setDeleteId(tx.id)}
                              className="btn-ghost btn btn-icon opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {sorted.length >= PAGE ? `${PAGE}+ results` : `${sorted.length} results`}
              </p>
              <div className="pagination">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="pagination-btn">Prev</button>
                <span className="px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 font-medium">Page {page + 1}</span>
                <button disabled={sorted.length < PAGE} onClick={() => setPage(p => p + 1)} className="pagination-btn">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Delete confirm ── */}
      {deleteId && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal max-w-sm p-6 text-center">
            <div className="w-11 h-11 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Delete Transaction?</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">This cannot be undone. Stock levels will not be reversed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="btn btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
