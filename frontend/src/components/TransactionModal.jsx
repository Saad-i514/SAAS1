import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X } from 'lucide-react';

function TransactionModal({ isOpen, onClose, onSuccess, initialProduct }) {
    const [formData, setFormData] = useState({
        type: 'purchase',
        date: new Date().toISOString().split('T')[0],
        supplier_id: '',
        product_name: initialProduct || '',
        quantity: 1,
        unit_price: 0,
        payment_term: 'Cash',
        debit: 0,
        customer_name: ''
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
            alert('Failed to record transaction');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">Record a Transaction</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex space-x-4 mb-6">
                        <label className={`flex-1 flex justify-center py-3 px-4 border rounded-lg cursor-pointer transition-colors ${formData.type === 'purchase' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                            <input type="radio" className="hidden" value="purchase" checked={formData.type === 'purchase'} onChange={() => setFormData({ ...formData, type: 'purchase' })} />
                            Add Stock / Purchase
                        </label>
                        <label className={`flex-1 flex justify-center py-3 px-4 border rounded-lg cursor-pointer transition-colors ${formData.type === 'sale' ? 'bg-green-50 border-green-200 text-green-700 font-semibold' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                            <input type="radio" className="hidden" value="sale" checked={formData.type === 'sale'} onChange={() => setFormData({ ...formData, type: 'sale' })} />
                            Add Sale
                        </label>
                        <label className={`flex-1 flex justify-center py-3 px-4 border rounded-lg cursor-pointer transition-colors ${formData.type === 'reverse' ? 'bg-orange-50 border-orange-200 text-orange-700 font-semibold' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                            <input type="radio" className="hidden" value="reverse" checked={formData.type === 'reverse'} onChange={() => setFormData({ ...formData, type: 'reverse' })} />
                            Reverse / Return
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input type="date" required className="input-field w-full" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        </div>

                        {formData.type === 'purchase' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                                <select className="input-field w-full bg-white" required value={formData.supplier_id} onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}>
                                    <option value="">Select a Supplier</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.supplier_no})</option>)}
                                </select>
                            </div>
                        )}

                        {formData.type === 'sale' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                                <input type="text" className="input-field w-full" placeholder="Optional Customer" value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} />
                            </div>
                        )}

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                            <select className="input-field w-full bg-white" required value={formData.product_name} onChange={e => {
                                const pname = e.target.value;
                                const p = products.find(x => x.name === pname);
                                setFormData({
                                    ...formData,
                                    product_name: pname,
                                    unit_price: p ? (formData.type === 'sale' ? p.sale_price : p.product_price) : 0
                                });
                            }}>
                                <option value="">Select Product...</option>
                                {products.map(p => <option key={p.id} value={p.name}>{p.name} ({p.in_hand_qty} in stock)</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4 col-span-2 sm:col-span-1">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input type="number" required min="1" className="input-field w-full" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
                                <input type="number" required step="0.01" className="input-field w-full" value={formData.unit_price} onChange={e => setFormData({ ...formData, unit_price: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Term</label>
                            <select className="input-field w-full bg-white" value={formData.payment_term} onChange={e => setFormData({ ...formData, payment_term: e.target.value })}>
                                <option value="Cash">Cash</option>
                                <option value="Credit">Credit</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount ($)</label>
                            <input type="number" readOnly className="input-field w-full bg-gray-50 border-gray-300 text-gray-800 font-bold" value={formData.debit} />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent">Cancel</button>
                        <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">Record Transaction</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TransactionModal;
