import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, RefreshCcw } from 'lucide-react';

function TransactionModal({ isOpen, onClose, onSuccess, initialProduct }) {
    const [formData, setFormData] = useState({
        type: 'PURCHASE', // PURCHASE, SALE, REVERSE
        date: new Date().toISOString().split('T')[0],
        supplier_id: '',
        product_name: initialProduct || '',
        quantity: 1,
        unit_price: 0,
        payment_term: 'Cash',
        debit: 0,
        customer_name: '',
        add_to_stock: true
    });
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        if (isOpen) {
            api.get('/suppliers/').then(res => setSuppliers(res.data)).catch(console.error);
            api.get('/products/').then(res => setProducts(res.data)).catch(console.error);
        }
    }, [isOpen]);

    // Auto calculate debit (Total Amount)
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            debit: prev.quantity * prev.unit_price
        }));
    }, [formData.quantity, formData.unit_price]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                quantity: parseInt(formData.quantity),
                unit_price: parseFloat(formData.unit_price),
                debit: parseFloat(formData.debit),
                supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null
            };
            await api.post('/transactions/', payload);
            onSuccess();
            onClose();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to record transaction');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/80">
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">Record a Transaction</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-white p-2 rounded-full transition-all"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="flex space-x-3 mb-6">
                        <label className={`flex-1 flex justify-center py-3 px-4 border rounded-xl cursor-pointer transition-all ${formData.type === 'PURCHASE' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold shadow-inner' : 'bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-200'}`}>
                            <input type="radio" className="hidden" value="PURCHASE" checked={formData.type === 'PURCHASE'} onChange={() => setFormData({ ...formData, type: 'PURCHASE' })} />
                            Add Stock (Purchase)
                        </label>
                        <label className={`flex-1 flex justify-center py-3 px-4 border rounded-xl cursor-pointer transition-all ${formData.type === 'SALE' ? 'bg-green-50 border-green-200 text-green-700 font-semibold shadow-inner' : 'bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-200'}`}>
                            <input type="radio" className="hidden" value="SALE" checked={formData.type === 'SALE'} onChange={() => setFormData({ ...formData, type: 'SALE' })} />
                            Sell Item
                        </label>
                        <label className={`flex-1 flex justify-center py-3 px-4 border rounded-xl cursor-pointer transition-all ${formData.type === 'REVERSE' ? 'bg-orange-50 border-orange-200 text-orange-700 font-semibold shadow-inner' : 'bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-200'}`}>
                            <input type="radio" className="hidden" value="REVERSE" checked={formData.type === 'REVERSE'} onChange={() => setFormData({ ...formData, type: 'REVERSE' })} />
                            Return Item
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction Date</label>
                            <input type="date" required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        </div>

                        {formData.type === 'PURCHASE' && (
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Supplier</label>
                                <select className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white" required value={formData.supplier_id} onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}>
                                    <option value="">Select a Supplier</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.supplier_no})</option>)}
                                </select>
                            </div>
                        )}

                        {(formData.type === 'SALE' || formData.type === 'REVERSE') && (
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name</label>
                                <input type="text" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50" placeholder="Optional Customer info" value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} />
                            </div>
                        )}

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Product</label>
                            <select className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white" required value={formData.product_name} onChange={e => {
                                const pname = e.target.value;
                                const p = products.find(x => x.name === pname);
                                setFormData({
                                    ...formData,
                                    product_name: pname,
                                    unit_price: p ? ((formData.type === 'SALE' || formData.type === 'REVERSE') ? p.sale_price : p.product_price) : 0
                                });
                            }}>
                                <option value="">Select Product...</option>
                                {products.map(p => <option key={p.id} value={p.name}>{p.name} ({p.in_hand_qty} in stock)</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4 col-span-2 sm:col-span-1">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                                <input type="number" required min="1" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Unit Price ($)</label>
                                <input type="number" required step="0.01" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50" value={formData.unit_price} onChange={e => setFormData({ ...formData, unit_price: e.target.value })} />
                            </div>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Term</label>
                            <select className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white" value={formData.payment_term} onChange={e => setFormData({ ...formData, payment_term: e.target.value })}>
                                <option value="Cash">Cash</option>
                                <option value="Credit">Credit</option>
                            </select>
                        </div>

                        <div className="col-span-2 sm:col-span-1 flex flex-col justify-end pb-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Total Amount ($)</label>
                            <input type="number" readOnly className="w-full p-3 border-none bg-gray-100/80 rounded-xl font-bold text-gray-800 outline-none" value={formData.debit} />
                        </div>
                        
                        {formData.type === 'REVERSE' && (
                            <div className="col-span-2 bg-orange-50 border border-orange-100 rounded-xl p-4 mt-2">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-orange-600 rounded bg-white border-orange-300 focus:ring-orange-500" 
                                        checked={formData.add_to_stock}
                                        onChange={(e) => setFormData({...formData, add_to_stock: e.target.checked})}
                                    />
                                    <div>
                                        <p className="font-semibold text-orange-900">Add returned items back to inventory stock</p>
                                        <p className="text-sm text-orange-700/80">Checking this will increase the "In-Hand Qty" of the product by {formData.quantity}.</p>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 flex justify-end space-x-3 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium border border-gray-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-gray-200">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 bg-primary hover:bg-secondary text-white rounded-xl font-medium transition-all shadow-lg shadow-primary/30 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center">
                            {formData.type === 'REVERSE' ? <RotateCcw size={18} className="mr-2" /> : null}
                            Record {formData.type === 'REVERSE' ? 'return' : formData.type.toLowerCase()}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TransactionModal;
