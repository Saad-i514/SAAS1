import React, { useState } from 'react';
import api from '../services/api';
import { X, Search, Package, ShoppingBag, Loader2 } from 'lucide-react';

const txTypeColor = {
  sale:     'bg-emerald-100 text-emerald-700',
  purchase: 'bg-blue-100 text-blue-700',
  reverse:  'bg-orange-100 text-orange-700',
  return:   'bg-orange-100 text-orange-700',
  payment:  'bg-purple-100 text-purple-700',
};

function CustomerSearchModal({ isOpen, onClose }) {
  const [query, setQuery]   = useState('');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await api.get(`/reports/customer-search?customer_name=${encodeURIComponent(query.trim())}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setQuery('');
    setData(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Customer / Shop Search</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">See all products sold to a specific customer or shop</p>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex-shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Type customer or shop name..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading || !query.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl text-sm transition-all flex items-center space-x-2">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              <span>Search</span>
            </button>
          </form>
          {error && <p className="text-sm text-red-600 mt-2 font-medium">{error}</p>}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
          {!data && !loading && (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">Search for a customer or shop name</p>
              <p className="text-sm mt-1">Partial matches are supported</p>
            </div>
          )}

          {data && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-indigo-900">Rs {Number(data.total_amount).toLocaleString()}</p>
                  <p className="text-xs text-indigo-600 font-medium mt-0.5">Total Amount</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-gray-900">{data.total_transactions}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Transactions</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-gray-900">{data.total_qty}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Total Units</p>
                </div>
              </div>

              {/* Product summary */}
              {data.product_summary?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center space-x-1.5">
                    <Package size={14} />
                    <span>Products Purchased</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.product_summary.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{p.product}</p>
                          {p.category && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md font-medium">{p.category}</span>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-900">Rs {Number(p.amount).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{p.qty} units · {p.transactions} tx</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction list */}
              {data.items?.length > 0 ? (
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-2">Transaction History</h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-left">Product</th>
                          <th className="px-4 py-3 text-left">Category</th>
                          <th className="px-4 py-3 text-center">Qty</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-center">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.items.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                              {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${txTypeColor[item.type] || 'bg-gray-100 text-gray-700'}`}>
                                {item.type?.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900 max-w-[140px] truncate">{item.product_name || '-'}</td>
                            <td className="px-4 py-3">
                              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs font-medium">{item.category || '-'}</span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-gray-700">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">Rs {Number(item.total_amount).toFixed(2)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${item.payment_term === 'Cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {item.payment_term || 'Cash'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="font-medium">No transactions found for "{data.customer_name}"</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerSearchModal;
