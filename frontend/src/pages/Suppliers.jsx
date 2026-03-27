import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  Plus, Search, Trash2, X, Phone, Mail,
  Building2, History, Tag, Filter
} from 'lucide-react';
import BulkTransactionModal from '../components/BulkTransactionModal';

// ─── Supplier Sales History Modal ───────────────────────────────────────────
function SupplierHistoryModal({ supplier, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/reports/supplier-sales/${supplier.id}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [supplier.id]);

  const categories = data ? ['all', ...data.category_summary.map(c => c.category)] : ['all'];
  const filteredItems = data?.items?.filter(item =>
    activeCategory === 'all' || item.category === activeCategory
  ) || [];

  const txTypeColor = {
    sale: 'bg-emerald-100 text-emerald-700',
    purchase: 'bg-blue-100 text-blue-700',
    reverse: 'bg-orange-100 text-orange-700',
    return: 'bg-orange-100 text-orange-700',
    payment: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 size={20} className="text-indigo-600 sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">{supplier.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{supplier.supplier_no} · {supplier.phone || 'No phone'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 sm:p-6 border-b border-gray-100 flex-shrink-0">
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-black text-gray-900">Rs {Number(data.total_amount).toLocaleString()}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Total Amount</p>
              </div>
              <div className="text-center border-x border-gray-100">
                <p className="text-lg sm:text-2xl font-black text-gray-900">{data.total_transactions}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Transactions</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-black text-gray-900">{data.total_qty}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Total Units</p>
              </div>
            </div>

            {/* Category Summary */}
            {data.category_summary.length > 0 && (
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">By Category</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {data.category_summary.map((cat, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveCategory(activeCategory === cat.category ? 'all' : cat.category)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        activeCategory === cat.category
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <Tag size={11} />
                      <span>{cat.category}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
                        activeCategory === cat.category ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>{cat.transactions}</span>
                    </button>
                  ))}
                  {activeCategory !== 'all' && (
                    <button
                      onClick={() => setActiveCategory('all')}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 transition-all"
                    >
                      <X size={11} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Transactions Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-gray-400">
                        <History size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No transactions found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${txTypeColor[item.type] || 'bg-gray-100 text-gray-700'}`}>
                            {item.type?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 max-w-[160px] truncate">{item.product_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs font-medium">{item.category}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-600">Rs {Number(item.unit_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">Rs {Number(item.total_amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${item.payment_term === 'Cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.payment_term || 'Cash'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Failed to load history</p>
          </div>
        )}
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const itemsPerPage = 15;

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/suppliers/');
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/suppliers/', formData);
      setSuppliers(prev => [data, ...prev]);
      setShowAddForm(false);
      setFormData({ supplier_no: '', name: '', email: '', phone: '', status: 'Active' });
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to add supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete supplier "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/suppliers/${id}`);
      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete supplier');
    }
  };

  const filtered = suppliers.filter(s => {
    const matchSearch = !search || [s.name, s.supplier_no, s.email, s.phone].some(
      v => String(v || '').toLowerCase().includes(search.toLowerCase())
    );
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-5 animate-fade-in">
      {selectedSupplier && (
        <SupplierHistoryModal
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
        />
      )}
      <BulkTransactionModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} onSuccess={fetchSuppliers} />

      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900">Suppliers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{suppliers.length} total suppliers</p>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <button onClick={() => setShowBulkModal(true)}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-3 sm:py-2.5 rounded-xl font-semibold text-sm transition-all border border-emerald-200">
            <Plus size={16} />
            <span>Bulk Purchase</span>
          </button>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setFormError(''); }}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 sm:py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-indigo-500/20"
          >
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            <span>{showAddForm ? 'Cancel' : 'Add Supplier'}</span>
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slide-up">
          <h2 className="text-base font-bold text-gray-900 mb-5">New Supplier</h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{formError}</div>
          )}
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Supplier No *</label>
              <input required placeholder="SUP-001" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={formData.supplier_no} onChange={e => setFormData(p => ({ ...p, supplier_no: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Supplier Name *</label>
              <input required placeholder="Global Traders Inc." className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" placeholder="contact@supplier.com" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Phone</label>
              <input placeholder="+1 (555) 000-0000" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Status</label>
              <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row justify-end pt-2 space-y-2 sm:space-y-0 sm:space-x-2">
              <button type="submit" disabled={submitting} className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-3 sm:py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm">
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                <span>Save Supplier</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter size={14} className="text-gray-400" />
            <select
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Supplier</th>
                <th className="px-5 py-3 text-left">Contact</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">History</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="5" className="px-5 py-4">
                      <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-16 text-center">
                    <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No suppliers found</p>
                    <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                paginated.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 font-black text-sm">{s.name[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-400 font-medium">{s.supplier_no}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        {s.email && (
                          <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                            <Mail size={11} />
                            <span>{s.email}</span>
                          </div>
                        )}
                        {s.phone && (
                          <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                            <Phone size={11} />
                            <span>{s.phone}</span>
                          </div>
                        )}
                        {!s.email && !s.phone && <span className="text-xs text-gray-300">No contact info</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => setSelectedSupplier(s)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all border border-indigo-200"
                      >
                        <History size={12} />
                        <span>View History</span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>Showing {paginated.length} of {filtered.length} suppliers</span>
          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Prev</button>
              <span className="px-3 py-1.5 font-bold text-gray-700">{currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Suppliers;
