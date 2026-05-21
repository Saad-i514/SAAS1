import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  Plus, Search, Trash2, X, Phone, Mail,
  Building2, History, Tag, Filter, CreditCard,
  DollarSign, TrendingDown, Calendar, Edit2,
} from 'lucide-react';
import BulkTransactionModal from '../components/BulkTransactionModal';

// ─── Supplier History Modal ──────────────────────────────────────────────────
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

  const categories = data ? ['all', ...data.category_summary.map(c => c.category)] : ['all'];
  const filteredItems = data?.items?.filter(i => activeCategory === 'all' || i.category === activeCategory) || [];

  const txTypeColor = {
    sale:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    purchase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    reverse:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    return:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    payment:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{supplier.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 truncate">{supplier.supplier_no} · {supplier.phone || 'No phone'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
              {[['Total Amount', `Rs ${Number(data.total_amount).toLocaleString()}`],
                ['Transactions', data.total_transactions],
                ['Total Units', data.total_qty]].map(([l, v]) => (
                <div key={l} className="text-center">
                  <p className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white">{v}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            {data.category_summary.length > 0 && (
              <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">By Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.category_summary.map((cat, i) => (
                    <button key={i} onClick={() => setActiveCategory(activeCategory === cat.category ? 'all' : cat.category)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${activeCategory === cat.category ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                      <Tag size={11} /><span>{cat.category}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${activeCategory === cat.category ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>{cat.transactions}</span>
                    </button>
                  ))}
                  {activeCategory !== 'all' && (
                    <button onClick={() => setActiveCategory('all')} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-all">
                      <X size={11} /><span>Clear</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                  <tr className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {['Date','Type','Product','Category','Qty','Unit Price','Total','Payment'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {filteredItems.length === 0 ? (
                    <tr><td colSpan="8" className="px-4 py-12 text-center text-gray-400 dark:text-slate-500">
                      <History size={32} className="mx-auto mb-2 opacity-50" /><p>No transactions found</p>
                    </td></tr>
                  ) : filteredItems.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">{item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-bold ${txTypeColor[item.type] || 'bg-gray-100 text-gray-700'}`}>{item.type?.toUpperCase()}</span></td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white max-w-[160px] truncate">{item.product_name || '-'}</td>
                      <td className="px-4 py-3"><span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-xs font-medium">{item.category}</span></td>
                      <td className="px-4 py-3 text-center font-bold text-gray-700 dark:text-slate-300">{item.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-slate-300">Rs {Number(item.unit_price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 dark:text-white">Rs {Number(item.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${item.payment_term === 'Cash' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{item.payment_term || 'Cash'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-slate-500"><p>Failed to load history</p></div>
        )}
      </div>
    </div>
  );
}

// ─── Supplier Payment Modal ──────────────────────────────────────────────────
function SupplierPaymentModal({ supplier, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/suppliers/${supplier.id}/payment`, { amount: parseFloat(amount), notes });
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pay Supplier</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{supplier.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Outstanding Balance</p>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">Rs {(supplier.outstanding_balance || 0).toLocaleString()}</p>
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

// ─── Edit Supplier Modal ─────────────────────────────────────────────────────
function EditSupplierModal({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: supplier.name || '', email: supplier.email || '',
    phone: supplier.phone || '', status: supplier.status || 'Active',
    payment_due_date: supplier.payment_due_date ? supplier.payment_due_date.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.put(`/suppliers/${supplier.id}`, {
        ...form,
        payment_due_date: form.payment_due_date || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Supplier</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}
          {[['Name *', 'name', 'text', true], ['Email', 'email', 'email', false], ['Phone', 'phone', 'tel', false]].map(([l, k, t, req]) => (
            <div key={k}>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{l}</label>
              <input type={t} required={req} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all">
                <option>Active</option><option>Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Payment Due</label>
              <input type="date" value={form.payment_due_date} onChange={e => setForm(f => ({ ...f, payment_due_date: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all" />
            </div>
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Suppliers Page ─────────────────────────────────────────────────────
function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ supplier_no: '', name: '', email: '', phone: '', status: 'Active' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [paymentSupplier, setPaymentSupplier] = useState(null);
  const [editSupplier, setEditSupplier] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const itemsPerPage = 15;

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/suppliers/');
      setSuppliers(data);
    } catch (err) { console.error(err); }
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
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to add supplier');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete supplier "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/suppliers/${id}`);
      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (err) { alert(err.response?.data?.detail || 'Failed to delete supplier'); }
  };

  const filtered = suppliers.filter(s => {
    const matchSearch = !search || [s.name, s.supplier_no, s.email, s.phone].some(v => String(v || '').toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Summary stats
  const totalOutstanding = suppliers.reduce((s, sup) => s + (sup.outstanding_balance || 0), 0);
  const overdueCount = suppliers.filter(s => s.payment_due_date && new Date(s.payment_due_date) < new Date() && (s.outstanding_balance || 0) > 0).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {selectedSupplier && <SupplierHistoryModal supplier={selectedSupplier} onClose={() => setSelectedSupplier(null)} />}
      {paymentSupplier && <SupplierPaymentModal supplier={paymentSupplier} onClose={() => setPaymentSupplier(null)} onSaved={() => { setPaymentSupplier(null); fetchSuppliers(); }} />}
      {editSupplier && <EditSupplierModal supplier={editSupplier} onClose={() => setEditSupplier(null)} onSaved={() => { setEditSupplier(null); fetchSuppliers(); }} />}
      <BulkTransactionModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} onSuccess={fetchSuppliers} />

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Suppliers</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">{suppliers.length} total suppliers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowBulkModal(true)}
            className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border border-emerald-200 dark:border-emerald-800">
            <Plus size={16} /><span>Bulk Purchase</span>
          </button>
          <button onClick={() => { setShowAddForm(!showAddForm); setFormError(''); }}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm">
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            <span>{showAddForm ? 'Cancel' : 'Add Supplier'}</span>
          </button>
        </div>
      </div>

      {/* Payment tracking summary */}
      {(totalOutstanding > 0 || overdueCount > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center flex-shrink-0"><TrendingDown size={18} className="text-amber-600 dark:text-amber-400" /></div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Total Owed</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">Rs {totalOutstanding.toLocaleString()}</p>
            </div>
          </div>
          <div className={`rounded-2xl border p-4 flex items-center space-x-3 ${overdueCount > 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${overdueCount > 0 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-slate-800'}`}><Calendar size={18} className={overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'} /></div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Overdue</p>
              <p className={`text-lg font-black ${overdueCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{overdueCount} supplier{overdueCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center flex-shrink-0"><DollarSign size={18} className="text-indigo-600 dark:text-indigo-400" /></div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Active Suppliers</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">{suppliers.filter(s => s.status === 'Active').length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 animate-slide-up">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5">New Supplier</h2>
          {formError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 font-medium">{formError}</div>}
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[['Supplier No *', 'supplier_no', 'text', 'SUP-001', true], ['Email', 'email', 'email', 'contact@supplier.com', false], ['Phone', 'phone', 'tel', '+1 (555) 000-0000', false]].map(([l, k, t, ph, req]) => (
              <div key={k} className={k === 'supplier_no' ? '' : ''}>
                <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{l}</label>
                <input required={req} type={t} placeholder={ph}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData[k]} onChange={e => setFormData(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Supplier Name *</label>
              <input required placeholder="Global Traders Inc."
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Status</label>
              <select className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                <option>Active</option><option>Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
              <button type="submit" disabled={submitting}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm">
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                <span>Save Supplier</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search suppliers..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
          </div>
          <div className="flex items-center space-x-2">
            <Filter size={14} className="text-gray-400" />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
              <option value="all">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
              <tr className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Supplier</th>
                <th className="px-5 py-3 text-left">Contact</th>
                <th className="px-5 py-3 text-right">Outstanding</th>
                <th className="px-5 py-3 text-left">Due Date</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">History</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan="7" className="px-5 py-4"><div className="h-8 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" /></td></tr>)
              ) : paginated.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-16 text-center">
                  <Building2 size={40} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                  <p className="text-gray-500 dark:text-slate-400 font-medium">No suppliers found</p>
                </td></tr>
              ) : paginated.map(s => {
                const isOverdue = s.payment_due_date && new Date(s.payment_due_date) < new Date() && (s.outstanding_balance || 0) > 0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 dark:text-indigo-400 font-black text-sm">{s.name[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{s.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">{s.supplier_no}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        {s.email && <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-slate-400"><Mail size={11} /><span>{s.email}</span></div>}
                        {s.phone && <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-slate-400"><Phone size={11} /><span>{s.phone}</span></div>}
                        {!s.email && !s.phone && <span className="text-xs text-gray-300 dark:text-slate-600">No contact info</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {(s.outstanding_balance || 0) > 0 ? (
                        <span className="font-bold font-mono text-amber-600 dark:text-amber-400">Rs {(s.outstanding_balance || 0).toLocaleString()}</span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {s.payment_due_date ? (
                        <span className={`text-xs font-semibold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-slate-300'}`}>
                          {isOverdue ? '⚠ ' : ''}{new Date(s.payment_due_date).toLocaleDateString()}
                        </span>
                      ) : <span className="text-xs text-gray-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />{s.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => setSelectedSupplier(s)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold transition-all border border-indigo-200 dark:border-indigo-800">
                        <History size={12} /><span>History</span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(s.outstanding_balance || 0) > 0 && (
                          <button onClick={() => setPaymentSupplier(s)} title="Record Payment"
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"><CreditCard size={14} /></button>
                        )}
                        <button onClick={() => setEditSupplier(s)} title="Edit"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(s.id, s.name)} title="Delete"
                          className="p-1.5 text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 font-medium">
          <span>Showing {paginated.length} of {filtered.length} suppliers</span>
          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all">Prev</button>
              <span className="px-3 py-1.5 font-bold text-gray-700 dark:text-slate-300">{currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all">Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Suppliers;
