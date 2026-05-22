import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  UserCircle, Plus, Search, X, Edit2, Trash2, CreditCard,
  AlertTriangle, ChevronDown, ChevronUp, DollarSign,
  History, CheckCircle, Download,
} from 'lucide-react';
import { fmtDateShort } from '../services/dateUtils';

const EMPTY_FORM = { name: '', phone: '', email: '', address: '', credit_limit: 0, status: 'Active', notes: '' };

// ── Customer form modal ───────────────────────────────────────────────────────
function CustomerModal({ customer, onClose, onSaved }) {
  const [form, setForm]   = useState(customer ? { ...customer } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (customer) await api.put(`/customers/${customer.id}`, form);
      else          await api.post('/customers/', form);
      onSaved();
    } catch (err) { setError(err.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  const inp = (label, key, type = 'text', extra = {}) => (
    <div>
      <label className="input-label">{label}</label>
      <input type={type} value={form[key] ?? ''} className="input"
        onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
        {...extra} />
    </div>
  );

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal max-w-lg">
        <div className="modal-header">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{customer ? 'Edit Customer' : 'Add Customer'}</h2>
          <button onClick={onClose} className="btn-ghost btn btn-icon"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {error && <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">{error}</div>}
            {inp('Name *', 'name', 'text', { required: true, placeholder: 'Customer / Shop name' })}
            <div className="grid grid-cols-2 gap-3">
              {inp('Phone', 'phone', 'tel', { placeholder: '+92 300 0000000' })}
              {inp('Email', 'email', 'email', { placeholder: 'email@example.com' })}
            </div>
            {inp('Address', 'address', 'text', { placeholder: 'Street, City' })}
            <div className="grid grid-cols-2 gap-3">
              {inp('Credit Limit (Rs)', 'credit_limit', 'number', { min: 0, step: 100 })}
              <div>
                <label className="input-label">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="select">
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="input-label">Notes</label>
              <textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="input resize-none" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {customer ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Payment modal ─────────────────────────────────────────────────────────────
function PaymentModal({ customer, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true); setError('');
    try { await api.post(`/customers/${customer.id}/payment`, { amount: parseFloat(amount), notes }); onSaved(); }
    catch (err) { setError(err.response?.data?.detail || 'Payment failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal max-w-sm">
        <div className="modal-header">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Record Payment</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{customer.name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn btn-icon"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {error && <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">{error}</div>}
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Outstanding Balance</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular mt-1">
                Rs {(customer.outstanding_balance || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="input-label">Payment Amount (Rs)</label>
              <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus className="input" />
            </div>
            <div>
              <label className="input-label">Notes (optional)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Ledger modal ──────────────────────────────────────────────────────────────
function LedgerModal({ customer, onClose }) {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/customers/${customer.id}/ledger`)
      .then(r => setLedger(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customer.id]);

  const txBadge = {
    sale: 'badge-green', payment: 'badge-blue', return: 'badge-amber',
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal max-w-3xl max-h-[90vh] flex flex-col">
        <div className="modal-header flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Ledger — {customer.name}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Full transaction & credit history</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn btn-icon"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">Loading…</div>
          ) : !ledger ? (
            <div className="text-center py-12 text-sm text-gray-400">Failed to load</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  ['Outstanding',     `Rs ${(ledger.customer.outstanding_balance||0).toLocaleString()}`, 'amber'],
                  ['Credit Limit',    `Rs ${(ledger.customer.credit_limit||0).toLocaleString()}`,        'indigo'],
                  ['Total Purchased', `Rs ${(ledger.customer.total_purchased||0).toLocaleString()}`,     'emerald'],
                  ['Total Paid',      `Rs ${(ledger.customer.total_paid||0).toLocaleString()}`,          'blue'],
                ].map(([l, v, c]) => (
                  <div key={l} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{l}</p>
                    <p className={`text-base font-bold mt-1 tabular text-${c}-600 dark:text-${c}-400`}>{v}</p>
                  </div>
                ))}
              </div>
              {ledger.transactions.length === 0 ? (
                <div className="empty-state py-10">
                  <div className="empty-state-icon"><History size={18} className="text-gray-400" /></div>
                  <p className="empty-state-title">No transactions yet</p>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th><th>Type</th><th>Product</th>
                        <th className="text-right">Amount</th><th className="text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.transactions.map((tx, i) => (
                        <tr key={i}>
                          <td className="text-gray-500 dark:text-slate-400 whitespace-nowrap tabular">
                            {tx.date ? fmtDateShort(tx.date) : '—'}
                          </td>
                          <td><span className={`badge ${txBadge[tx.type] || 'badge-gray'}`}>{tx.type?.toUpperCase()}</span></td>
                          <td className="font-medium text-gray-900 dark:text-white">{tx.product_name || '—'}</td>
                          <td className="text-right font-semibold tabular text-gray-900 dark:text-white">Rs {(tx.amount||0).toFixed(2)}</td>
                          <td className="text-right tabular text-violet-600 dark:text-violet-400 font-semibold">Rs {(tx.balance_after||0).toFixed(2)}</td>
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null);
  const [deleteId, setDeleteId]   = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir]     = useState('asc');
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
    try { await api.delete(`/customers/${id}`); load(); }
    catch (e) { alert(e.response?.data?.detail || 'Delete failed'); }
    setDeleteId(null);
  };

  const handleImport = async () => {
    if (!window.confirm(
      'This will scan all existing transactions and create Customer records for every unique customer name found.\n\nNo existing data will be modified. Safe to run.\n\nProceed?'
    )) return;
    setImporting(true); setImportResult(null);
    try {
      const { data } = await api.post('/customers/import-from-transactions');
      setImportResult(data);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Import failed'); }
    finally { setImporting(false); }
  };

  const handleSort = (f) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
  };
  const SortIcon = ({ f }) => sortField === f
    ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
    : null;

  const filtered = customers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const av = a[sortField] ?? ''; const bv = b[sortField] ?? '';
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const closeModal = () => setModal(null);
  const saved = () => { closeModal(); load(); };

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage accounts, credit limits & ledger</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleImport} disabled={importing} className="btn btn-secondary btn-sm">
            {importing
              ? <div className="w-3.5 h-3.5 border-2 border-gray-400/30 border-t-gray-500 rounded-full animate-spin" />
              : <Download size={14} />
            }
            {importing ? 'Importing…' : 'Import from Transactions'}
          </button>
          <button onClick={() => setModal({ type: 'add' })} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Customer
          </button>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="flex items-start justify-between gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-slide-up">
          <div className="flex items-start gap-3">
            <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{importResult.message}</p>
              {importResult.created_names?.length > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Added: {importResult.created_names.slice(0, 8).join(', ')}
                  {importResult.created_names.length > 8 ? ` +${importResult.created_names.length - 8} more` : ''}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setImportResult(null)} className="text-emerald-500 hover:text-emerald-700 flex-shrink-0"><X size={15} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Customers',  value: stats.total_customers ?? '—',                                  icon: UserCircle,   accent: 'indigo' },
          { label: 'Total Outstanding',value: `Rs ${(stats.total_outstanding || 0).toLocaleString()}`,       icon: DollarSign,   accent: 'amber' },
          { label: 'Over Credit Limit',value: stats.customers_over_limit ?? 0,                               icon: AlertTriangle,accent: 'red' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              accent === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20' :
              accent === 'red'   ? 'bg-red-50 dark:bg-red-900/20' :
              'bg-violet-50 dark:bg-violet-900/20'
            }`}>
              <Icon size={18} className={
                accent === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                accent === 'red'   ? 'text-red-600 dark:text-red-400' :
                'text-violet-600 dark:text-violet-400'
              } />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white tabular mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="filter-bar">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by name, phone, or email…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-8 py-2 text-xs" />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn-ghost btn btn-sm text-red-500 hover:text-red-600">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-slate-500">Loading customers…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><UserCircle size={20} className="text-gray-400" /></div>
            <p className="empty-state-title">{search ? 'No customers match your search' : 'No customers yet'}</p>
            {!search && <p className="empty-state-desc">Click "Add Customer" or import from transactions</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {[['name','Name'],['phone','Phone'],['outstanding_balance','Outstanding'],['credit_limit','Credit Limit'],['status','Status']].map(([f, l]) => (
                    <th key={f} className="cursor-pointer hover:text-gray-600 dark:hover:text-slate-200 select-none" onClick={() => handleSort(f)}>
                      <span className="flex items-center gap-1">{l}<SortIcon f={f} /></span>
                    </th>
                  ))}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const overLimit = c.credit_limit > 0 && c.outstanding_balance > c.credit_limit;
                  return (
                    <tr key={c.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-600 dark:text-violet-400 font-semibold text-xs flex-shrink-0">
                            {c.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                            {c.email && <p className="text-xs text-gray-400 dark:text-slate-500">{c.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-600 dark:text-slate-300">{c.phone || '—'}</td>
                      <td>
                        <span className={`font-semibold tabular ${overLimit ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          Rs {(c.outstanding_balance || 0).toLocaleString()}
                        </span>
                        {overLimit && <span className="ml-1.5 badge badge-red">Over limit</span>}
                      </td>
                      <td className="tabular text-gray-600 dark:text-slate-300">Rs {(c.credit_limit || 0).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${c.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{c.status}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setModal({ type: 'ledger', customer: c })} className="btn-ghost btn btn-icon" title="View Ledger"><History size={14} /></button>
                          <button onClick={() => setModal({ type: 'pay', customer: c })} className="btn-ghost btn btn-icon" title="Record Payment"><CreditCard size={14} /></button>
                          <button onClick={() => setModal({ type: 'edit', customer: c })} className="btn-ghost btn btn-icon" title="Edit"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteId(c.id)} className="btn-ghost btn btn-icon text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete"><Trash2 size={14} /></button>
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
      {modal?.type === 'add'    && <CustomerModal onClose={closeModal} onSaved={saved} />}
      {modal?.type === 'edit'   && <CustomerModal customer={modal.customer} onClose={closeModal} onSaved={saved} />}
      {modal?.type === 'pay'    && <PaymentModal customer={modal.customer} onClose={closeModal} onSaved={saved} />}
      {modal?.type === 'ledger' && <LedgerModal customer={modal.customer} onClose={closeModal} />}

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal max-w-sm p-6 text-center">
            <div className="w-11 h-11 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Delete Customer?</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">This action cannot be undone.</p>
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
