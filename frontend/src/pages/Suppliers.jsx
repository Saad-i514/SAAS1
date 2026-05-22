import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  Plus, Search, Trash2, X, Phone, Mail,
  Building2, History, Tag, Filter, CreditCard,
  DollarSign, TrendingDown, Calendar, Edit2, RefreshCw,
} from 'lucide-react';
import BulkTransactionModal from '../components/BulkTransactionModal';

// ── Supplier History Modal ────────────────────────────────────────────────────
function SupplierHistoryModal({ supplier, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    api.get(`/reports/supplier-sales/${supplier.id}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [supplier.id]);

  const filteredItems = data?.items?.filter(
    i => activeCategory === 'all' || i.category === activeCategory
  ) || [];

  const txBadge = {
    sale: 'badge-green', purchase: 'badge-blue',
    reverse: 'badge-amber', return: 'badge-amber', payment: 'badge-purple',
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal max-w-4xl max-h-[90vh] flex flex-col">
        <div className="modal-header flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{supplier.name}</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">{supplier.supplier_no}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn btn-icon flex-shrink-0"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
              {[
                ['Total Amount', `Rs ${Number(data.total_amount).toLocaleString()}`],
                ['Transactions', data.total_transactions],
                ['Total Units',  data.total_qty],
              ].map(([l, v]) => (
                <div key={l} className="text-center">
                  <p className="text-xl font-bold text-gray-900 dark:text-white tabular">{v}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            {data.category_summary.length > 0 && (
              <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  {data.category_summary.map((cat, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveCategory(activeCategory === cat.category ? 'all' : cat.category)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        activeCategory === cat.category
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      <Tag size={10} />{cat.category}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        activeCategory === cat.category ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                      }`}>{cat.transactions}</span>
                    </button>
                  ))}
                  {activeCategory !== 'all' && (
                    <button onClick={() => setActiveCategory('all')} className="btn-ghost btn btn-sm gap-1">
                      <X size={10} /> Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto">
              <table className="data-table">
                <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800">
                  <tr>
                    {['Date','Type','Product','Category','Qty','Unit Price','Total','Payment'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr><td colSpan="8">
                      <div className="empty-state py-10">
                        <div className="empty-state-icon"><History size={18} className="text-gray-400" /></div>
                        <p className="empty-state-title">No transactions found</p>
                      </div>
                    </td></tr>
                  ) : filteredItems.map((item, i) => (
                    <tr key={i}>
                      <td className="text-gray-500 dark:text-slate-400 whitespace-nowrap tabular">
                        {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                      </td>
                      <td><span className={`badge ${txBadge[item.type] || 'badge-gray'}`}>{item.type?.toUpperCase()}</span></td>
                      <td className="font-medium text-gray-900 dark:text-white max-w-[160px] truncate">{item.product_name || '—'}</td>
                      <td><span className="badge badge-gray">{item.category}</span></td>
                      <td className="text-center font-medium tabular">{item.quantity}</td>
                      <td className="text-right tabular text-gray-600 dark:text-slate-300">Rs {Number(item.unit_price).toFixed(2)}</td>
                      <td className="text-right tabular font-semibold text-gray-900 dark:text-white">Rs {Number(item.total_amount).toFixed(2)}</td>
                      <td className="text-center">
                        <span className={`badge ${item.payment_term === 'Cash' ? 'badge-green' : 'badge-blue'}`}>
                          {item.payment_term || 'Cash'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">Failed to load</div>
        )}
      </div>
    </div>
  );
}

// ── Payment Modal ─────────────────────────────────────────────────────────────
function SupplierPaymentModal({ supplier, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/suppliers/${supplier.id}/payment`, { amount: parseFloat(amount), notes });
      onSaved();
    } catch (err) { setError(err.response?.data?.detail || 'Payment failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal max-w-sm">
        <div className="modal-header">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Pay Supplier</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{supplier.name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn btn-icon"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {error && <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">{error}</div>}
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Outstanding Balance</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular mt-1">
                Rs {(supplier.outstanding_balance || 0).toLocaleString()}
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

// ── Edit Supplier Modal ───────────────────────────────────────────────────────
function EditSupplierModal({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: supplier.name || '', email: supplier.email || '',
    phone: supplier.phone || '', status: supplier.status || 'Active',
    payment_due_date: supplier.payment_due_date ? supplier.payment_due_date.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.put(`/suppliers/${supplier.id}`, { ...form, payment_due_date: form.payment_due_date || null });
      onSaved();
    } catch (err) { setError(err.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal max-w-md">
        <div className="modal-header">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Edit Supplier</h2>
          <button onClick={onClose} className="btn-ghost btn btn-icon"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {error && <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">{error}</div>}
            <div>
              <label className="input-label">Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="select">
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
              <div>
                <label className="input-label">Payment Due</label>
                <input type="date" value={form.payment_due_date} onChange={e => setForm(f => ({ ...f, payment_due_date: e.target.value }))} className="input" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Suppliers() {
  const [suppliers, setSuppliers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData]     = useState({ supplier_no: '', name: '', email: '', phone: '', status: 'Active' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [paymentSupplier, setPaymentSupplier]   = useState(null);
  const [editSupplier, setEditSupplier]         = useState(null);
  const [statusFilter, setStatusFilter]         = useState('all');
  const [currentPage, setCurrentPage]           = useState(1);
  const [showBulkModal, setShowBulkModal]       = useState(false);
  const PER_PAGE = 15;

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/suppliers/'); setSuppliers(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleAdd = async (e) => {
    e.preventDefault(); setFormError(''); setSubmitting(true);
    try {
      const { data } = await api.post('/suppliers/', formData);
      setSuppliers(prev => [data, ...prev]);
      setShowAddForm(false);
      setFormData({ supplier_no: '', name: '', email: '', phone: '', status: 'Active' });
    } catch (err) { setFormError(err.response?.data?.detail || 'Failed to add supplier'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete supplier "${name}"?`)) return;
    try { await api.delete(`/suppliers/${id}`); setSuppliers(prev => prev.filter(s => s.id !== id)); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to delete'); }
  };

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search || [s.name, s.supplier_no, s.email, s.phone].some(v => String(v || '').toLowerCase().includes(q));
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const totalOutstanding = suppliers.reduce((s, sup) => s + (sup.outstanding_balance || 0), 0);
  const overdueCount = suppliers.filter(s =>
    s.payment_due_date && new Date(s.payment_due_date) < new Date() && (s.outstanding_balance || 0) > 0
  ).length;

  return (
    <div className="page animate-fade-in">
      {selectedSupplier && <SupplierHistoryModal supplier={selectedSupplier} onClose={() => setSelectedSupplier(null)} />}
      {paymentSupplier  && <SupplierPaymentModal supplier={paymentSupplier} onClose={() => setPaymentSupplier(null)} onSaved={() => { setPaymentSupplier(null); fetchSuppliers(); }} />}
      {editSupplier     && <EditSupplierModal supplier={editSupplier} onClose={() => setEditSupplier(null)} onSaved={() => { setEditSupplier(null); fetchSuppliers(); }} />}
      <BulkTransactionModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} onSuccess={fetchSuppliers} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">{suppliers.length} total suppliers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={fetchSuppliers} className="btn btn-secondary btn-icon"><RefreshCw size={15} /></button>
          <button onClick={() => setShowBulkModal(true)} className="btn btn-secondary btn-sm">
            <Plus size={14} /> Bulk Purchase
          </button>
          <button onClick={() => { setShowAddForm(!showAddForm); setFormError(''); }} className="btn btn-primary btn-sm">
            {showAddForm ? <X size={14} /> : <Plus size={14} />}
            {showAddForm ? 'Cancel' : 'Add Supplier'}
          </button>
        </div>
      </div>

      {/* Summary cards — only show when there's data */}
      {(totalOutstanding > 0 || overdueCount > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingDown size={15} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Total Owed</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white tabular">Rs {totalOutstanding.toLocaleString()}</p>
            </div>
          </div>
          <div className={`card px-4 py-3 flex items-center gap-3 ${overdueCount > 0 ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/5' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${overdueCount > 0 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-slate-800'}`}>
              <Calendar size={15} className={overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Overdue</p>
              <p className={`text-sm font-semibold tabular ${overdueCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {overdueCount} supplier{overdueCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign size={15} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Active</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white tabular">
                {suppliers.filter(s => s.status === 'Active').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <p className="section-title">New Supplier</p>
          </div>
          <div className="card-body">
            {formError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">{formError}</div>}
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Supplier No *</label>
                <input required placeholder="SUP-001" className="input" value={formData.supplier_no} onChange={e => setFormData(p => ({ ...p, supplier_no: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="input-label">Supplier Name *</label>
                <input required placeholder="Global Traders Inc." className="input" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Email</label>
                <input type="email" placeholder="contact@supplier.com" className="input" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input type="tel" placeholder="+1 (555) 000-0000" className="input" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Status</label>
                <select className="select" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters + Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search suppliers…" className="input pl-8 py-2 text-xs" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-gray-400" />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="select py-2 text-xs w-auto">
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Contact</th>
                <th className="text-right">Outstanding</th>
                <th>Due Date</th>
                <th className="text-center">Status</th>
                <th className="text-center">History</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan="7" className="px-4 py-3"><div className="h-7 skeleton rounded" /></td></tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan="7">
                  <div className="empty-state">
                    <div className="empty-state-icon"><Building2 size={20} className="text-gray-400" /></div>
                    <p className="empty-state-title">No suppliers found</p>
                  </div>
                </td></tr>
              ) : paginated.map(s => {
                const isOverdue = s.payment_due_date && new Date(s.payment_due_date) < new Date() && (s.outstanding_balance || 0) > 0;
                return (
                  <tr key={s.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs">{s.name[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 tabular">{s.supplier_no}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        {s.email && <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400"><Mail size={11} />{s.email}</div>}
                        {s.phone && <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400"><Phone size={11} />{s.phone}</div>}
                        {!s.email && !s.phone && <span className="text-xs text-gray-300 dark:text-slate-600">No contact</span>}
                      </div>
                    </td>
                    <td className="text-right">
                      {(s.outstanding_balance || 0) > 0
                        ? <span className="font-semibold tabular text-amber-600 dark:text-amber-400">Rs {(s.outstanding_balance || 0).toLocaleString()}</span>
                        : <span className="text-gray-300 dark:text-slate-600">—</span>
                      }
                    </td>
                    <td>
                      {s.payment_due_date
                        ? <span className={`text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-slate-300'}`}>
                            {isOverdue ? '⚠ ' : ''}{new Date(s.payment_due_date).toLocaleDateString()}
                          </span>
                        : <span className="text-gray-300 dark:text-slate-600">—</span>
                      }
                    </td>
                    <td className="text-center">
                      <span className={`badge ${s.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <button onClick={() => setSelectedSupplier(s)} className="btn btn-secondary btn-sm gap-1">
                        <History size={12} /> History
                      </button>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(s.outstanding_balance || 0) > 0 && (
                          <button onClick={() => setPaymentSupplier(s)} className="btn-ghost btn btn-icon" title="Record Payment">
                            <CreditCard size={14} />
                          </button>
                        )}
                        <button onClick={() => setEditSupplier(s)} className="btn-ghost btn btn-icon" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(s.id, s.name)} className="btn-ghost btn btn-icon text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {filtered.length} of {suppliers.length} suppliers
          </p>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="pagination-btn">Prev</button>
              <span className="px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 font-medium">{currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="pagination-btn">Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
