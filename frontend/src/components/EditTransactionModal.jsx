import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { X, AlertCircle, CheckCircle2, Pencil } from 'lucide-react';

/**
 * Edit an existing transaction (bill line). Sends a partial update to
 * PUT /transactions/{id}; the backend reverses the original stock/ledger
 * effects and re-applies the new values atomically.
 */
export default function EditTransactionModal({ isOpen, onClose, onSuccess, transaction }) {
  const [form, setForm] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products/');
      setProducts(data);
      return data;
    } catch (e) { console.error(e); return []; }
  }, []);

  useEffect(() => {
    if (!isOpen || !transaction) return;
    setError('');
    setSuccess(false);
    loadProducts().then((prods) => {
      const match = prods.find(p => p.name === transaction.product_name);
      setForm({
        product_id: match ? String(match.id) : '',
        product_name: transaction.product_name || '',
        quantity: transaction.quantity ?? 1,
        unit_price: transaction.unit_price ?? 0,
        discount: transaction.discount ?? 0,
        customer_name: transaction.customer_name || '',
        payment_term: transaction.payment_term || 'Cash',
        order_no: transaction.order_no || '',
        date: transaction.date || '',
      });
    });
  }, [isOpen, transaction, loadProducts]);

  if (!isOpen || !transaction) return null;

  const type = transaction.type?.value || transaction.type || 'sale';
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleProduct = (productId) => {
    const p = products.find(pr => String(pr.id) === String(productId));
    set('product_id', productId);
    setForm(prev => ({
      ...prev,
      product_id: productId,
      product_name: p ? p.name : '',
      unit_price: p ? (type === 'sale' || type === 'reverse' ? p.sale_price : p.product_price) : prev.unit_price,
    }));
  };

  const lineTotal = Math.max(
    0,
    (parseFloat(form?.quantity) || 0) * (parseFloat(form?.unit_price) || 0) - (parseFloat(form?.discount) || 0)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const qty = parseInt(form.quantity) || 0;
    const price = parseFloat(form.unit_price) || 0;
    const disc = parseFloat(form.discount) || 0;
    if (qty <= 0) return setError('Quantity must be at least 1.');
    if (price < 0) return setError('Unit price cannot be negative.');
    if (disc < 0) return setError('Discount cannot be negative.');
    if (disc > qty * price) return setError('Discount cannot exceed the total amount.');

    setLoading(true);
    try {
      await api.put(`/transactions/${transaction.id}`, {
        product_name: form.product_name || undefined,
        quantity: qty,
        unit_price: price,
        discount: disc,
        customer_name: form.customer_name || null,
        payment_term: form.payment_term,
        order_no: form.order_no || null,
        date: form.date || undefined,
      });
      setSuccess(true);
      setTimeout(() => { onSuccess?.(); onClose(); setSuccess(false); }, 900);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-violet-600" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Edit Transaction</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {type?.toUpperCase()} · #{transaction.id} {transaction.order_no ? `· ${transaction.order_no}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn btn-icon"><X size={16} /></button>
        </div>

        {success ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Transaction updated</p>
            <p className="text-xs text-gray-500 mt-1">Stock &amp; balances recalculated.</p>
          </div>
        ) : form && (
          <form onSubmit={handleSubmit} className="modal-body space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className="input-label">Product</label>
              <select className="select" value={form.product_id} onChange={e => handleProduct(e.target.value)}>
                <option value="">Select product…</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.article_no ? ` (${p.article_no})` : ''} — {p.in_hand_qty} in stock
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="input-label">Quantity</label>
                <input type="number" min="1" className="input" value={form.quantity}
                  onChange={e => set('quantity', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Unit Price</label>
                <input type="number" min="0" step="0.01" className="input" value={form.unit_price}
                  onChange={e => set('unit_price', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Discount</label>
                <input type="number" min="0" step="0.01" className="input" value={form.discount}
                  onChange={e => set('discount', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Customer / Shop</label>
                <input type="text" className="input" value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Payment</label>
                <select className="select" value={form.payment_term} onChange={e => set('payment_term', e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="input-label">Order No</label>
                <input type="text" className="input" value={form.order_no}
                  onChange={e => set('order_no', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Date</label>
                <input type="date" className="input" value={form.date}
                  onChange={e => set('date', e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg p-3 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">New Total</span>
              <span className="text-lg font-bold text-violet-900 dark:text-violet-200 tabular">Rs {lineTotal.toFixed(2)}</span>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
