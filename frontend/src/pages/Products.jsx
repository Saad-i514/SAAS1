import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Plus, Search, Edit2, Trash2, X, Activity, Package, AlertTriangle, Users } from 'lucide-react';
import TransactionModal from '../components/TransactionModal';
import BulkTransactionModal from '../components/BulkTransactionModal';
import CustomerSearchModal from '../components/CustomerSearchModal';

// Common product categories — user can also type a custom one
const PRESET_CATEGORIES = [
  'Electronics', 'Clothing', 'Food & Beverages', 'Furniture',
  'Stationery', 'Hardware', 'Cosmetics', 'Medicine', 'Toys',
  'Sports', 'Automotive', 'Books', 'Other',
];

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [formData, setFormData] = useState({
    article_no: '', name: '', category: '', product_price: '',
    sale_price: '', in_hand_qty: '', status: 'Active'
  });
  const [customCategory, setCustomCategory] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products/');
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Merge preset + existing categories from DB
  const dbCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const allCategories = [...new Set([...PRESET_CATEGORIES, ...dbCategories])].sort();
  const filterCategories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  const openModal = (product = null) => {
    setFormError('');
    setCustomCategory('');
    if (product) {
      setFormData({
        article_no: product.article_no || '',
        name: product.name || '',
        category: product.category || '',
        product_price: product.product_price ?? '',
        sale_price: product.sale_price ?? '',
        in_hand_qty: product.in_hand_qty ?? '',
        status: product.status || 'Active',
      });
      setEditingProduct(product);
    } else {
      setFormData({ article_no: '', name: '', category: '', product_price: '', sale_price: '', in_hand_qty: '', status: 'Active' });
      setEditingProduct(null);
    }
    setIsModalOpen(true);
  };

  // Resolve final category: if "custom" selected, use customCategory text
  const resolvedCategory = formData.category === '__custom__' ? customCategory : formData.category;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!resolvedCategory) { setFormError('Please select or enter a category.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        category: resolvedCategory,
        product_price: parseFloat(formData.product_price) || 0,
        sale_price: parseFloat(formData.sale_price) || 0,
        in_hand_qty: parseInt(formData.in_hand_qty) || 0,
      };
      if (editingProduct) {
        const { data } = await api.put(`/products/${editingProduct.id}`, payload);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? data : p));
      } else {
        const { data } = await api.post('/products/', payload);
        setProducts(prev => [data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete product');
    }
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || [p.name, p.article_no, p.category].some(
      v => String(v || '').toLowerCase().includes(search.toLowerCase())
    );
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const lowStockCount = products.filter(p => p.in_hand_qty <= 5 && p.status === 'Active').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900">Products Inventory</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {products.length} products
            {lowStockCount > 0 && (
              <span className="ml-2 inline-flex items-center space-x-1 text-amber-600 font-semibold">
                <AlertTriangle size={12} />
                <span>{lowStockCount} low stock</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowCustomerSearch(true)}
            className="flex items-center justify-center space-x-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border border-purple-200">
            <Users size={16} />
            <span>Customer Search</span>
          </button>
          <button onClick={() => setShowBulkModal(true)}
            className="flex items-center justify-center space-x-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border border-emerald-200">
            <Activity size={16} />
            <span>Bulk Order</span>
          </button>
          <button onClick={() => setShowTransactionModal(true)}
            className="flex items-center justify-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border border-indigo-200">
            <Activity size={16} />
            <span>Quick Transaction</span>
          </button>
          <button onClick={() => openModal()}
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-indigo-500/20">
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <TransactionModal isOpen={showTransactionModal} onClose={() => setShowTransactionModal(false)} onSuccess={fetchProducts} />
      <BulkTransactionModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} onSuccess={fetchProducts} />
      <CustomerSearchModal isOpen={showCustomerSearch} onClose={() => setShowCustomerSearch(false)} />

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{formError}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Article No (SKU) *</label>
                  <input required placeholder="ART-101" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={formData.article_no} onChange={e => setFormData(p => ({ ...p, article_no: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Product Name *</label>
                  <input required placeholder="Premium Widget" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>

                {/* Category — required dropdown with custom option */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Category *</label>
                  <select required className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                    <option value="">— Select a category —</option>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__custom__">+ Enter custom category</option>
                  </select>
                  {formData.category === '__custom__' && (
                    <input required placeholder="Type category name..." className="mt-2 w-full px-3 py-2.5 bg-gray-50 border border-indigo-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      value={customCategory} onChange={e => setCustomCategory(e.target.value)} />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Status</label>
                  <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">In-Hand Qty</label>
                  <input type="number" min="0" placeholder="0" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={formData.in_hand_qty} onChange={e => setFormData(p => ({ ...p, in_hand_qty: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Purchase Price (Rs) *</label>
                  <input required type="number" min="0" step="0.01" placeholder="0.00" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={formData.product_price} onChange={e => setFormData(p => ({ ...p, product_price: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Sale Price (Rs) *</label>
                  <input required type="number" min="0" step="0.01" placeholder="0.00" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={formData.sale_price} onChange={e => setFormData(p => ({ ...p, sale_price: e.target.value }))} />
                </div>
                {formData.product_price && formData.sale_price && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <div className={`p-3 rounded-xl text-sm font-semibold flex items-center justify-between ${
                      parseFloat(formData.sale_price) > parseFloat(formData.product_price)
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <span>Margin Preview</span>
                      <span>
                        Rs {(parseFloat(formData.sale_price) - parseFloat(formData.product_price)).toFixed(2)} per unit
                        ({parseFloat(formData.product_price) > 0
                          ? (((parseFloat(formData.sale_price) - parseFloat(formData.product_price)) / parseFloat(formData.product_price)) * 100).toFixed(1)
                          : 0}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:flex-1 py-3 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="w-full sm:flex-1 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center space-x-2">
                  {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search products..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="flex items-center space-x-2">
            <select className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}>
              {filterCategories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
            </select>
            <select className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
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
                <th className="px-5 py-3 text-left">Product</th>
                <th className="px-5 py-3 text-left">Category</th>
                <th className="px-5 py-3 text-right">Purchase Price</th>
                <th className="px-5 py-3 text-right">Sale Price</th>
                <th className="px-5 py-3 text-right">Margin</th>
                <th className="px-5 py-3 text-center">Stock</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan="8" className="px-5 py-4"><div className="h-8 bg-gray-100 rounded-lg animate-pulse" /></td></tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan="8" className="px-5 py-16 text-center">
                  <Package size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No products found</p>
                </td></tr>
              ) : (
                paginated.map(p => {
                  const margin = p.sale_price - p.product_price;
                  const marginPct = p.product_price > 0 ? ((margin / p.product_price) * 100).toFixed(1) : 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-bold text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400 font-medium">{p.article_no}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-semibold">
                          {p.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-gray-600 font-medium">Rs {Number(p.product_price || 0).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900">Rs {Number(p.sale_price || 0).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${margin > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {margin >= 0 ? '+' : ''}{marginPct}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-black rounded-lg ${
                          p.in_hand_qty > 10 ? 'bg-emerald-100 text-emerald-800'
                          : p.in_hand_qty > 0 ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                        }`}>{p.in_hand_qty}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${p.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${p.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openModal(p)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>Showing {paginated.length} of {filtered.length} products</span>
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

export default Products;
