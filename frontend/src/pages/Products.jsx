import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import {
  Plus, Search, Edit2, Trash2, X, Package,
  AlertTriangle, Users, ImagePlus, Image as ImageIcon,
  ShoppingCart, Activity,
} from 'lucide-react';
import TransactionModal from '../components/TransactionModal';
import BulkTransactionModal from '../components/BulkTransactionModal';
import CustomerSearchModal from '../components/CustomerSearchModal';

const PRESET_CATEGORIES = [
  'Electronics', 'Clothing', 'Food & Beverages', 'Furniture',
  'Stationery', 'Hardware', 'Cosmetics', 'Medicine', 'Toys',
  'Sports', 'Automotive', 'Books', 'Other',
];

// ── Image modal ──────────────────────────────────────────────────────────────
function ImageModal({ product, onClose, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post(`/products/${product.id}/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUpdated(data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    try {
      const { data } = await api.delete(`/products/${product.id}/image`);
      onUpdated(data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove image');
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal max-w-sm">
        <div className="modal-header">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Product Image</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{product.name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-4">
          {product.image_url ? (
            <div className="relative">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-48 object-contain rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
              />
              <button
                onClick={handleDelete}
                className="absolute top-2 right-2 w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center transition-all"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
              <ImageIcon size={32} className="mb-2 opacity-40" />
              <p className="text-xs">No image uploaded</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary w-full"
          >
            {uploading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <ImagePlus size={15} />
            }
            {uploading ? 'Uploading…' : product.image_url ? 'Replace Image' : 'Upload Image'}
          </button>
          <p className="text-xs text-center text-gray-400 dark:text-slate-500">JPEG, PNG or WebP · Max 500 KB</p>
        </div>
      </div>
    </div>
  );
}

// ── Product form modal ────────────────────────────────────────────────────────
function ProductModal({ product, allCategories, onClose, onSaved }) {
  const [form, setForm] = useState({
    article_no: product?.article_no || '',
    name:        product?.name || '',
    category:    product?.category || '',
    product_price: product?.product_price ?? '',
    sale_price:    product?.sale_price ?? '',
    in_hand_qty:   product?.in_hand_qty ?? '',
    status:        product?.status || 'Active',
  });
  const [customCat, setCustomCat] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const resolvedCat = form.category === '__custom__' ? customCat : form.category;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolvedCat) { setError('Please select or enter a category.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        category:      resolvedCat,
        product_price: parseFloat(form.product_price) || 0,
        sale_price:    parseFloat(form.sale_price) || 0,
        in_hand_qty:   parseInt(form.in_hand_qty) || 0,
      };
      if (product) {
        const { data } = await api.put(`/products/${product.id}`, payload);
        onSaved(data, 'edit');
      } else {
        const { data } = await api.post('/products/', payload);
        onSaved(data, 'add');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save product');
    } finally { setSaving(false); }
  };

  const margin = parseFloat(form.sale_price || 0) - parseFloat(form.product_price || 0);
  const marginPct = parseFloat(form.product_price) > 0
    ? ((margin / parseFloat(form.product_price)) * 100).toFixed(1)
    : null;

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal max-w-xl max-h-[95vh] overflow-y-auto">
        <div className="modal-header">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="btn-ghost btn btn-icon"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">{error}</div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="input-label">SKU *</label>
                <input required placeholder="ART-001" className="input" value={form.article_no} onChange={e => setForm(p => ({ ...p, article_no: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="input-label">Product Name *</label>
                <input required placeholder="Product name" className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Category *</label>
                <select required className="select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__custom__">+ Custom category</option>
                </select>
                {form.category === '__custom__' && (
                  <input required placeholder="Category name" className="input mt-2" value={customCat} onChange={e => setCustomCat(e.target.value)} />
                )}
              </div>
              <div>
                <label className="input-label">Status</label>
                <select className="select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="input-label">In-Hand Qty</label>
                <input type="number" min="0" placeholder="0" className="input" value={form.in_hand_qty} onChange={e => setForm(p => ({ ...p, in_hand_qty: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Purchase Price *</label>
                <input required type="number" min="0" step="0.01" placeholder="0.00" className="input" value={form.product_price} onChange={e => setForm(p => ({ ...p, product_price: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Sale Price *</label>
                <input required type="number" min="0" step="0.01" placeholder="0.00" className="input" value={form.sale_price} onChange={e => setForm(p => ({ ...p, sale_price: e.target.value }))} />
              </div>
            </div>
            {marginPct !== null && (
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium border ${
                margin >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
              }`}>
                <span>Margin</span>
                <span className="font-semibold tabular">Rs {margin.toFixed(2)} / unit ({marginPct}%)</span>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {product ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Products() {
  const [products, setProducts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal]               = useState(null); // null | 'add' | { type:'edit', product } | { type:'image', product }
  const [showTxModal, setShowTxModal]   = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showSearch, setShowSearch]     = useState(false);
  const [currentPage, setCurrentPage]   = useState(1);
  const ITEMS = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products/');
      setProducts(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const dbCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const allCategories = [...new Set([...PRESET_CATEGORIES, ...dbCategories])].sort();
  const filterCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const handleSaved = (updated, mode) => {
    if (mode === 'edit') setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    else setProducts(prev => [updated, ...prev]);
    setModal(null);
  };

  const handleImageUpdated = (updated) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setModal({ type: 'image', product: updated });
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) { alert(err.response?.data?.detail || 'Failed to delete'); }
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || [p.name, p.article_no, p.category].some(v => String(v || '').toLowerCase().includes(q));
    const matchCat    = categoryFilter === 'all' || p.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS, currentPage * ITEMS);
  const lowStock   = products.filter(p => p.in_hand_qty <= 5 && p.status === 'Active').length;

  return (
    <div className="page animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">
            {products.length} products
            {lowStock > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle size={12} /> {lowStock} low stock
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowSearch(true)} className="btn btn-secondary btn-sm">
            <Users size={14} /> Customer Search
          </button>
          <button onClick={() => setShowBulkModal(true)} className="btn btn-secondary btn-sm">
            <ShoppingCart size={14} /> Bulk Order
          </button>
          <button onClick={() => setShowTxModal(true)} className="btn btn-secondary btn-sm">
            <Activity size={14} /> Quick Transaction
          </button>
          <button onClick={() => setModal('add')} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      <TransactionModal isOpen={showTxModal} onClose={() => setShowTxModal(false)} onSuccess={fetchProducts} />
      <BulkTransactionModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} onSuccess={fetchProducts} />
      <CustomerSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />

      {/* ── Filters ── */}
      <div className="filter-bar">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products…"
            className="input pl-8 py-2 text-xs"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <select
          className="select py-2 text-xs w-auto"
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="all">All Categories</option>
          {filterCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="select py-2 text-xs w-auto"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>Product</th>
                <th>Category</th>
                <th className="text-right">Purchase</th>
                <th className="text-right">Sale</th>
                <th className="text-right">Margin</th>
                <th className="text-center">Stock</th>
                <th className="text-center">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="9" className="px-4 py-3">
                      <div className="h-7 skeleton rounded" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="empty-state">
                      <div className="empty-state-icon"><Package size={20} className="text-gray-400" /></div>
                      <p className="empty-state-title">No products found</p>
                      <p className="empty-state-desc">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map(p => {
                  const margin    = p.sale_price - p.product_price;
                  const marginPct = p.product_price > 0 ? ((margin / p.product_price) * 100).toFixed(1) : 0;
                  return (
                    <tr key={p.id} className="group">
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => setModal({ type: 'image', product: p })}
                          className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 flex items-center justify-center bg-gray-50 dark:bg-slate-800 hover:border-indigo-400 transition-all"
                        >
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            : <ImageIcon size={14} className="text-gray-300 dark:text-slate-600" />
                          }
                        </button>
                      </td>
                      <td>
                        <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 tabular">{p.article_no}</p>
                      </td>
                      <td>
                        <span className="badge badge-gray">{p.category || 'Uncategorized'}</span>
                      </td>
                      <td className="text-right tabular text-gray-600 dark:text-slate-300">
                        Rs {Number(p.product_price || 0).toFixed(2)}
                      </td>
                      <td className="text-right tabular font-medium text-gray-900 dark:text-white">
                        Rs {Number(p.sale_price || 0).toFixed(2)}
                      </td>
                      <td className="text-right">
                        <span className={`badge ${margin >= 0 ? 'badge-green' : 'badge-red'}`}>
                          {margin >= 0 ? '+' : ''}{marginPct}%
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`badge tabular ${
                          p.in_hand_qty > 10 ? 'badge-green' :
                          p.in_hand_qty > 0  ? 'badge-amber' :
                          'badge-red'
                        }`}>
                          {p.in_hand_qty}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`badge ${p.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setModal({ type: 'image', product: p })}
                            className="btn-ghost btn btn-icon"
                            title="Manage image"
                          >
                            <ImagePlus size={14} />
                          </button>
                          <button
                            onClick={() => setModal({ type: 'edit', product: p })}
                            className="btn-ghost btn btn-icon"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="btn-ghost btn btn-icon text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {filtered.length} of {products.length} products
          </p>
          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="pagination-btn"
              >
                Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {(modal === 'add' || modal?.type === 'edit') && (
        <ProductModal
          product={modal?.product}
          allCategories={allCategories}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.type === 'image' && (
        <ImageModal
          product={modal.product}
          onClose={() => setModal(null)}
          onUpdated={handleImageUpdated}
        />
      )}
    </div>
  );
}
