import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  X, Plus, Trash2, Package, ShoppingCart, RotateCcw,
  AlertCircle, CheckCircle2
} from 'lucide-react';

const TX_TYPES = [
  { value: 'purchase', label: 'Purchase', icon: Package, color: 'indigo' },
  { value: 'sale',     label: 'Sale',     icon: ShoppingCart, color: 'emerald' },
  { value: 'reverse',  label: 'Return',   icon: RotateCcw,    color: 'orange' },
];

const colorMap = {
  indigo:  { active: 'bg-indigo-50 border-indigo-400 text-indigo-700',  icon: 'text-indigo-600',  btn: 'bg-indigo-600 hover:bg-indigo-700' },
  emerald: { active: 'bg-emerald-50 border-emerald-400 text-emerald-700', icon: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  orange:  { active: 'bg-orange-50 border-orange-400 text-orange-700',  icon: 'text-orange-600',  btn: 'bg-orange-600 hover:bg-orange-700' },
};

const emptyItem = () => ({ product_name: '', quantity: 1, unit_price: 0, discount: 0 });

function BulkTransactionModal({ isOpen, onClose, onSuccess }) {
  const [txType, setTxType]           = useState('sale');
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0]);
  const [orderNo, setOrderNo]         = useState('');
  const [customerName, setCustomerName] = useState('');
  const [supplierId, setSupplierId]   = useState('');
  const [paymentTerm, setPaymentTerm] = useState('Cash');
  const [addToStock, setAddToStock]   = useState(false);
  const [items, setItems]             = useState([emptyItem()]);
  const [suppliers, setSuppliers]     = useState([]);
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sRes, pRes] = await Promise.all([api.get('/suppliers/'), api.get('/products/')]);
      setSuppliers(sRes.data);
      setProducts(pRes.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setError('');
      setSuccess(false);
      // Reset form
      setTxType('sale');
      setDate(new Date().toISOString().split('T')[0]);
      setOrderNo('');
      setCustomerName('');
      setSupplierId('');
      setPaymentTerm('Cash');
      setAddToStock(false);
      setItems([emptyItem()]);
    }
  }, [isOpen, loadData]);

  // When type changes, re-price all items
  const handleTypeChange = (type) => {
    setTxType(type);
    setItems(prev => prev.map(item => {
      const p = products.find(p => p.name === item.product_name);
      if (!p) return item;
      return { ...item, unit_price: type === 'sale' || type === 'reverse' ? p.sale_price : p.product_price };
    }));
  };

  const handleProductChange = (idx, productName) => {
    const p = products.find(pr => pr.name === productName);
    const price = p ? (txType === 'sale' || txType === 'reverse' ? p.sale_price : p.product_price) : 0;
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, product_name: productName, unit_price: price || 0 } : item));
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addRow = () => setItems(prev => [...prev, emptyItem()]);
  const removeRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const lineTotal = (item) => Math.max(0, (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) - (parseFloat(item.discount) || 0));
  const grandTotal = items.reduce((s, item) => s + lineTotal(item), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side stock check for sales
    if (txType === 'sale') {
      for (const item of items) {
        const p = products.find(pr => pr.name === item.product_name);
        if (p && p.in_hand_qty < parseInt(item.quantity)) {
          setError(`Insufficient stock for "${item.product_name}". Available: ${p.in_hand_qty}, Requested: ${item.quantity}`);
          return;
        }
      }
    }

    // Validate all rows
    for (const item of items) {
      if (!item.product_name) { setError('All rows must have a product selected.'); return; }
      const qty = parseInt(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const disc = parseFloat(item.discount) || 0;
      if (qty <= 0) { setError('All quantities must be greater than 0.'); return; }
      if (price < 0) { setError('Unit price cannot be negative.'); return; }
      if (disc < 0) { setError('Discount cannot be negative.'); return; }
      if (disc > qty * price) { setError(`Discount for "${item.product_name}" exceeds the line total.`); return; }
    }

    // Validate supplier for purchase
    if (txType === 'purchase' && !supplierId) {
      setError('Please select a supplier for purchase orders.');
      return;
    }

    // Validate customer for sale/reverse
    if ((txType === 'sale' || txType === 'reverse') && !customerName.trim()) {
      setError('Please enter a customer / shop name.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/transactions/bulk', {
        type: txType,
        order_no: orderNo || undefined,
        date: date ? new Date(date).toISOString() : undefined,
        supplier_id: supplierId ? parseInt(supplierId) : null,
        customer_name: customerName || null,
        payment_term: paymentTerm,
        add_to_stock: addToStock,
        items: items.map(item => ({
          product_name: item.product_name,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
          discount: parseFloat(item.discount) || 0,
        })),
      });
      setSuccess(true);
      setTimeout(() => { onSuccess?.(); onClose(); setSuccess(false); }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const activeType = TX_TYPES.find(t => t.value === txType);
  const colors = colorMap[activeType?.color || 'indigo'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[96vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Bulk Order Entry</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Add multiple items under one customer / order</p>
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
            <p className="text-lg font-bold text-gray-900">Order Recorded!</p>
            <p className="text-gray-500 text-sm mt-1">All items saved and inventory updated.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2">
              {TX_TYPES.map(({ value, label, icon: Icon, color }) => (
                <button key={value} type="button" onClick={() => handleTypeChange(value)}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${
                    txType === value ? colorMap[color].active : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                  <Icon size={16} className={txType === value ? colorMap[color].icon : 'text-gray-400'} />
                  <span className="text-xs font-bold mt-1">{label}</span>
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Order meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Date</label>
                <input type="date" required className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                  value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Order No</label>
                <input type="text" placeholder="Auto-generated" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                  value={orderNo} onChange={e => setOrderNo(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Payment</label>
                <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                  value={paymentTerm} onChange={e => setPaymentTerm(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                {txType === 'purchase' ? (
                  <>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Supplier *</label>
                    <select required className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                      value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                      <option value="">Select...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Customer / Shop *</label>
                    <input type="text" required placeholder="Shop name" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                      value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  </>
                )}
              </div>
            </div>

            {/* Items table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                <div className="col-span-4">Product</div>
                <div className="col-span-2 text-center">Stock</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-1 text-right">Disc</div>
                <div className="col-span-1"></div>
              </div>

              <div className="divide-y divide-gray-100">
                {items.map((item, idx) => {
                  const prod = products.find(p => p.name === item.product_name);
                  const stockWarning = txType === 'sale' && prod && prod.in_hand_qty < parseInt(item.quantity || 0);
                  const lineAmt = lineTotal(item);
                  return (
                    <div key={idx} className={`px-4 py-3 grid grid-cols-12 gap-2 items-center ${stockWarning ? 'bg-red-50' : ''}`}>
                      <div className="col-span-4">
                        <select required className={`w-full px-2 py-2 border rounded-lg text-sm outline-none transition-all ${stockWarning ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-indigo-500'}`}
                          value={item.product_name} onChange={e => handleProductChange(idx, e.target.value)}>
                          <option value="">Select product...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                        {stockWarning && (
                          <p className="text-xs text-red-600 mt-0.5 font-medium">Only {prod.in_hand_qty} available</p>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          !prod ? 'text-gray-400' :
                          prod.in_hand_qty > 10 ? 'bg-emerald-100 text-emerald-700' :
                          prod.in_hand_qty > 0  ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {prod ? prod.in_hand_qty : '—'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <input type="number" required min="1" className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center outline-none focus:border-indigo-500 transition-all"
                          value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <input type="number" required min="0" step="0.01" className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right outline-none focus:border-indigo-500 transition-all"
                          value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                      </div>
                      <div className="col-span-1">
                        <input type="number" min="0" step="0.01" className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right outline-none focus:border-indigo-500 transition-all"
                          value={item.discount} onChange={e => updateItem(idx, 'discount', e.target.value)} />
                      </div>
                      <div className="col-span-1 flex flex-col items-end space-y-1">
                        <span className="text-xs font-bold text-gray-700">Rs {lineAmt.toFixed(0)}</span>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeRow(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <button type="button" onClick={addRow}
                  className="flex items-center space-x-1.5 text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-all">
                  <Plus size={15} />
                  <span>Add Item</span>
                </button>
                <div className="text-right">
                  <span className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Return to stock */}
            {txType === 'reverse' && (
              <label className="flex items-start space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-4 h-4 text-orange-600 rounded border-orange-300"
                  checked={addToStock} onChange={e => setAddToStock(e.target.checked)} />
                <div>
                  <p className="text-sm font-bold text-orange-900">Add returned items back to stock</p>
                  <p className="text-xs text-orange-700 mt-0.5">Will restore inventory for all returned items</p>
                </div>
              </label>
            )}

            {/* Grand total */}
            <div className={`rounded-xl p-4 border-2 ${colors.active}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Grand Total ({items.length} items)</span>
                <span className="text-2xl font-black">Rs {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-1">
              <button type="button" onClick={onClose}
                className="w-full sm:flex-1 py-3 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all text-sm">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className={`w-full sm:flex-1 py-3 sm:py-2.5 text-white font-bold rounded-xl transition-all text-sm shadow-lg flex items-center justify-center space-x-2 disabled:opacity-60 ${colors.btn}`}>
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <span>Record {activeType?.label} Order ({items.length} items)</span>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default BulkTransactionModal;
