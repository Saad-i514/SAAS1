import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { X, RotateCcw, ShoppingCart, Package, AlertCircle, CheckCircle2 } from 'lucide-react';

const TX_TYPES = [
  { value: 'purchase', label: 'Purchase', desc: 'Add stock', icon: Package, color: 'indigo' },
  { value: 'sale', label: 'Sale', desc: 'Sell items', icon: ShoppingCart, color: 'emerald' },
  { value: 'reverse', label: 'Return', desc: 'Return items', icon: RotateCcw, color: 'orange' },
];

const colorMap = {
  indigo: { active: 'bg-indigo-50 border-indigo-400 text-indigo-700', icon: 'text-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700' },
  emerald: { active: 'bg-emerald-50 border-emerald-400 text-emerald-700', icon: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  orange: { active: 'bg-orange-50 border-orange-400 text-orange-700', icon: 'text-orange-600', btn: 'bg-orange-600 hover:bg-orange-700' },
};

function TransactionModal({ isOpen, onClose, onSuccess, initialProduct }) {
  const [formData, setFormData] = useState({
    type: 'sale',
    date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    product_name: initialProduct || '',
    quantity: 1,
    unit_price: 0,
    payment_term: 'Cash',
    debit: 0,
    customer_name: '',
    add_to_stock: false,
    order_no: '',
    discount: 0,
  });
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [suppRes, prodRes] = await Promise.all([
        api.get('/suppliers/'),
        api.get('/products/'),
      ]);
      setSuppliers(suppRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Failed to load modal data:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setError('');
      setSuccess(false);
    }
  }, [isOpen, loadData]);

  // Auto-calculate total
  useEffect(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.unit_price) || 0;
    const disc = parseFloat(formData.discount) || 0;
    const total = Math.max(0, qty * price - disc);
    setFormData(prev => ({ ...prev, debit: parseFloat(total.toFixed(2)) }));
  }, [formData.quantity, formData.unit_price, formData.discount]);

  const handleProductChange = (productName) => {
    const product = products.find(p => p.name === productName);
    const autoPrice = product
      ? (formData.type === 'sale' || formData.type === 'reverse' ? product.sale_price : product.product_price)
      : 0;
    setFormData(prev => ({ ...prev, product_name: productName, unit_price: autoPrice || 0 }));
  };

  const handleTypeChange = (type) => {
    setFormData(prev => {
      const product = products.find(p => p.name === prev.product_name);
      const autoPrice = product
        ? (type === 'sale' || type === 'reverse' ? product.sale_price : product.product_price)
        : prev.unit_price;
      return { ...prev, type, unit_price: autoPrice || 0 };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const qty = parseInt(formData.quantity) || 0;
    const price = parseFloat(formData.unit_price) || 0;
    const disc = parseFloat(formData.discount) || 0;

    if (qty <= 0) {
      setError('Quantity must be at least 1.');
      setLoading(false);
      return;
    }
    if (price < 0) {
      setError('Unit price cannot be negative.');
      setLoading(false);
      return;
    }
    if (disc < 0) {
      setError('Discount cannot be negative.');
      setLoading(false);
      return;
    }
    if (disc > qty * price) {
      setError('Discount cannot exceed the total amount.');
      setLoading(false);
      return;
    }

    // Validate stock for sales
    if (formData.type === 'sale') {
      const product = products.find(p => p.name === formData.product_name);
      if (product && product.in_hand_qty < qty) {
        setError(`Insufficient stock. Available: ${product.in_hand_qty} units`);
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        debit: parseFloat(formData.debit),
        discount: parseFloat(formData.discount) || 0,
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        // type is already lowercase
      };
      await api.post('/transactions/', payload);
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccess(false);
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const activeType = TX_TYPES.find(t => t.value === formData.type);
  const colors = colorMap[activeType?.color || 'indigo'];
  const selectedProduct = products.find(p => p.name === formData.product_name);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Record Transaction</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Add a new business transaction</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">Transaction Recorded!</p>
            <p className="text-gray-500 text-sm mt-1">Inventory has been updated.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Transaction Type */}
            <div className="grid grid-cols-3 gap-2">
              {TX_TYPES.map(({ value, label, desc, color }) => {
                const Icon = TX_TYPES.find(t => t.value === value)?.icon;
                return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleTypeChange(value)}
                  className={`flex flex-col items-center p-2.5 sm:p-3 rounded-xl border-2 transition-all duration-200 min-h-[72px] sm:min-h-[80px] ${
                    formData.type === value
                      ? colorMap[color].active
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} className={`sm:w-[18px] sm:h-[18px] ${formData.type === value ? colorMap[color].icon : 'text-gray-400'}`} />
                  <span className="text-xs font-bold mt-1">{label}</span>
                  <span className="text-xs opacity-70 hidden sm:inline">{desc}</span>
                </button>
              );
              })}
            </div>

            {error && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.date}
                  onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              {/* Order No */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Order No</label>
                <input
                  type="text"
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.order_no}
                  onChange={e => setFormData(p => ({ ...p, order_no: e.target.value }))}
                />
              </div>

              {/* Supplier (for purchase) */}
              {formData.type === 'purchase' && (
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Supplier *</label>
                  <select
                    required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    value={formData.supplier_id}
                    onChange={e => setFormData(p => ({ ...p, supplier_id: e.target.value }))}
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.supplier_no})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer (for sale/reverse) */}
              {(formData.type === 'sale' || formData.type === 'reverse') && (
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Customer / Shop Name</label>
                  <input
                    type="text"
                    placeholder="Customer or shop name"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    value={formData.customer_name}
                    onChange={e => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                  />
                </div>
              )}

              {/* Product */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Product *</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.product_name}
                  onChange={e => handleProductChange(e.target.value)}
                >
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} — {p.in_hand_qty} in stock
                    </option>
                  ))}
                </select>
                {selectedProduct && formData.type === 'sale' && selectedProduct.in_hand_qty <= 5 && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    ⚠ Low stock: only {selectedProduct.in_hand_qty} units available
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.quantity}
                  onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                />
              </div>

              {/* Unit Price */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Unit Price (Rs) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.unit_price}
                  onChange={e => setFormData(p => ({ ...p, unit_price: e.target.value }))}
                />
              </div>

              {/* Discount */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Discount (Rs)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.discount}
                  onChange={e => setFormData(p => ({ ...p, discount: e.target.value }))}
                />
              </div>

              {/* Payment Term */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Payment</label>
                <select
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.payment_term}
                  onChange={e => setFormData(p => ({ ...p, payment_term: e.target.value }))}
                >
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            {/* Total Amount Display */}
            <div className={`rounded-xl p-4 border-2 ${colors.active}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Total Amount</span>
                <span className="text-2xl font-black">Rs {Number(formData.debit).toFixed(2)}</span>
              </div>
              {parseFloat(formData.discount) > 0 && (
                <p className="text-xs mt-1 opacity-70">
                  Subtotal: Rs {(parseFloat(formData.quantity || 0) * parseFloat(formData.unit_price || 0)).toFixed(2)} — Discount: Rs {parseFloat(formData.discount).toFixed(2)}
                </p>
              )}
            </div>

            {/* Return to stock option */}
            {formData.type === 'reverse' && (
              <label className="flex items-start space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 text-orange-600 rounded border-orange-300 focus:ring-orange-500"
                  checked={formData.add_to_stock}
                  onChange={e => setFormData(p => ({ ...p, add_to_stock: e.target.checked }))}
                />
                <div>
                  <p className="text-sm font-bold text-orange-900">Add returned items back to stock</p>
                  <p className="text-xs text-orange-700 mt-0.5">Will increase in-hand quantity by {formData.quantity} units</p>
                </div>
              </label>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:flex-1 py-3 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`w-full sm:flex-1 py-3 sm:py-2.5 text-white font-bold rounded-xl transition-all text-sm shadow-lg flex items-center justify-center space-x-2 disabled:opacity-60 ${colors.btn}`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Record {activeType?.label}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default TransactionModal;
