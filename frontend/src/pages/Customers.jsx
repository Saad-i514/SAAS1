import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  UserCircle, Plus, Search, X, Edit2, Trash2, CreditCard,
  Phone, Mail, MapPin, TrendingUp, AlertTriangle, ChevronDown,
  ChevronUp, DollarSign, History, CheckCircle, Download,
} from 'lucide-react';

const EMPTY_FORM = {
  name: '', phone: '', email: '', address: '',
  credit_limit: 0, status: 'Active', notes: '',
};

function StatCard({ label, value, sub, color = 'indigo', icon: Icon }) {
  const colors = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    emerald:'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        {Icon && <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}><Icon size={16} /></div>}
      </div>
      <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function CustomerModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState(customer ? { ...customer } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (customer) {
        await api.put(`/customers/${customer.id}`, form);
      } else {
        await api.post('/customers/', form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const field = (label, key, type = 'text', extra = {}) => (
    <div>
      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
      <input type={type} value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
        {...extra} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{customer ? 'Edit Customer' : 'Add Customer'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}
          {field('Name *', 'name', 'text', { required: true, placeholder: 'Customer / Shop name' })}
          <div className="grid grid-cols-2 gap-3">
            {field('Phone', 'phone', 'tel', { placeholder: '+92 300 0000000' })}
            {field('Email', 'email', 'email', { placeholder: 'email@example.com' })}
          </div>
          {field('Address', 'address', 'text', { placeholder: 'Street, City' })}
          <div className="grid grid-cols-2 gap-3">
            {field('Credit Limit (Rs)', 'credit_limit', 'number', { min: 0, step: 100 })}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all">
                <option>Active</option><option>Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Notes</label>
            <textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all resize-none" />
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
              {saving ? 'Saving…' : customer ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({ customer, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/customers/${customer.id}/payment`, { amount: parseFloat(amount), notes });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Record Payment</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{customer.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Outstanding Balance</p>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">Rs {(customer.outstanding_balance || 0).toLocaleString()}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Payment Amount (Rs)</label>
            <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
              {saving ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LedgerModal({ customer, onClose }) {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/customers/${customer.id}/ledger`).then(r => setLedger(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [customer.id]);

  const txColor = { sale: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', payment: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', return: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ledger — {customer.name}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Full transaction & credit history</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {loading ? <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading…</div> : !ledger ? <div className="text-center py-12 text-gray-400">Failed to load</div> : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[['Outstanding', `Rs ${(ledger.customer.outstanding_balance||0).toLocaleString()}`, 'amber'],
                  ['Credit Limit', `Rs ${(ledger.customer.credit_limit||0).toLocaleString()}`, 'indigo'],
                  ['Total Purchased', `Rs ${(ledger.customer.total_purchased||0).toLocaleString()}`, 'emerald'],
                  ['Total Paid', `Rs ${(ledger.customer.total_paid||0).toLocaleString()}`, 'blue']].map(([l,v,c]) => (
                  <div key={l} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">{l}</p>
                    <p className={`text-lg font-black mt-1 text-${c}-600 dark:text-${c}-400`}>{v}</p>
                  </div>
                ))}
              </div>
              {ledger.transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-slate-500"><History size={40} className="mx-auto mb-3 opacity-40" /><p>No transactions yet</p></div>
              ) : (
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                      <tr className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">Product</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {ledger.transactions.map((tx, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">{tx.date ? new Date(tx.date).toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-bold ${txColor[tx.type] || 'bg-gray-100 text-gray-700'}`}>{tx.type?.toUpperCase()}</span></td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{tx.product_name || '—'}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 dark:text-white">Rs {(tx.amount||0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">Rs {(tx.balance_after||0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([api.get('/customers/'), api.get('/customers/stats')]);
      setCustomers(cRes.data);
      setStats(sRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await api.delete(`/customers/${id}`); load(); } catch (e) { alert(e.response?.data?.detail || 'Delete failed'); }
    setDeleteId(null);
  };

  const handleImport = async () => {
    if (!window.confirm(
      'This will scan all your existing transactions and create Customer records for every unique customer name found.\n\n' +
      'No existing data will be modified or deleted. Safe to run.\n\nProceed?'
    )) return;
    setImporting(true);
    setImportResult(null);
    try {
      const { data } = await api.post('/customers/import-from-transactions');
      setImportResult(data);
      load(); // refresh list
    } catch (e) {
      alert(e.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleSort = (f) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc'); } };
  const SortIcon = ({ f }) => sortField === f ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) || (c.email || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const av = a[sortField] ?? ''; const bv = b[sortField] ?? '';
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const closeModal = () => setModal(null);
  const saved = () => { closeModal(); load(); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage customer accounts, credit limits & ledger</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleImport} disabled={importing}
            className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border border-emerald-200 dark:border-emerald-800 disabled:opacity-50">
            {importing
              ? <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
              : <Download size={16} />}
            <span>{importing ? 'Importing…' : 'Import from Transactions'}</span>
          </button>
          <button onClick={() => setModal({ type: 'add' })}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm">
            <Plus size={16} /><span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{importResult.message}</p>
              {importResult.created_names?.length > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Added: {importResult.created_names.slice(0, 8).join(', ')}{importResult.created_names.length > 8 ? ` +${importResult.created_names.length - 8} more` : ''}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setImportResult(null)} className="text-emerald-500 hover:text-emerald-700 flex-shrink-0"><X size={16} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Customers" value={stats.total_customers ?? '—'} icon={UserCircle} color="indigo" />
        <StatCard label="Total Outstanding" value={`Rs ${(stats.total_outstanding || 0).toLocaleString()}`} icon={DollarSign} color="red" />
        <StatCard label="Over Credit Limit" value={stats.customers_over_limit ?? 0} sub="customers exceeding their limit" icon={AlertTriangle} color="red" />
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by name, phone, or email…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">Loading customers…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <UserCircle size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-semibold">{search ? 'No customers match your search' : 'No customers yet'}</p>
            {!search && <p className="text-sm mt-1">Click "Add Customer" to get started</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <tr className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  {[['name','Name'],['phone','Phone'],['outstanding_balance','Outstanding'],['credit_limit','Credit Limit'],['status','Status']].map(([f,l]) => (
                    <th key={f} className="px-4 py-3 text-left cursor-pointer hover:text-gray-700 dark:hover:text-white select-none" onClick={() => handleSort(f)}>
                      <span className="flex items-center gap-1">{l}<SortIcon f={f} /></span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filtered.map(c => {
                  const overLimit = c.credit_limit > 0 && c.outstanding_balance > c.credit_limit;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm flex-shrink-0">{c.name[0].toUpperCase()}</div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                            {c.email && <p className="text-xs text-gray-400 dark:text-slate-500">{c.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{c.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold font-mono ${overLimit ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          Rs {(c.outstanding_balance || 0).toLocaleString()}
                        </span>
                        {overLimit && <span className="ml-1 text-xs text-red-500">⚠ Over limit</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-slate-300">Rs {(c.credit_limit || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end space-x-1">
                          <button onClick={() => setModal({ type: 'ledger', customer: c })} title="View Ledger" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"><History size={15} /></button>
                          <button onClick={() => setModal({ type: 'pay', customer: c })} title="Record Payment" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"><CreditCard size={15} /></button>
                          <button onClick={() => setModal({ type: 'edit', customer: c })} title="Edit" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"><Edit2 size={15} /></button>
                          <button onClick={() => setDeleteId(c.id)} title="Delete" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'add' && <CustomerModal onClose={closeModal} onSaved={saved} />}
      {modal?.type === 'edit' && <CustomerModal customer={modal.customer} onClose={closeModal} onSaved={saved} />}
      {modal?.type === 'pay' && <PaymentModal customer={modal.customer} onClose={closeModal} onSaved={saved} />}
      {modal?.type === 'ledger' && <LedgerModal customer={modal.customer} onClose={closeModal} />}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={20} className="text-red-600" /></div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Customer?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">This action cannot be undone.</p>
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
