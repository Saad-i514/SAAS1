import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit2, Trash2, Save, X, Activity } from 'lucide-react';
import DynamicColumnManager from '../components/DynamicColumnManager';

function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [customColumns, setCustomColumns] = useState([]);
    const [columnFilters, setColumnFilters] = useState({});

    const [showAddForm, setShowAddForm] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [formData, setFormData] = useState({ article_no: '', name: '', product_price: '', sale_price: '', in_hand_qty: '', status: 'Active', dynamic_data: {} });

    const [editingCell, setEditingCell] = useState({ id: null, field: null });
    const [editValue, setEditValue] = useState('');
    const [userRole, setUserRole] = useState('Operator');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try { setUserRole(JSON.parse(userData).role); } catch (e) { }
        }
    }, []);

    const fetchCustomColumns = async () => {
        try {
            const { data } = await api.get('/dynamic-columns/?table_name=products');
            setCustomColumns(data);
        } catch (err) { console.error(err); }
    };

    const fetchProducts = async () => {
        try {
            const { data } = await api.get('/products/');
            setProducts(data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchCustomColumns();
        fetchProducts();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, product_price: parseFloat(formData.product_price), sale_price: parseFloat(formData.sale_price), in_hand_qty: parseInt(formData.in_hand_qty || 0) };
            const { data } = await api.post('/products/', payload);
            setProducts([...products, data]);
            setShowAddForm(false);
            setFormData({ article_no: '', name: '', product_price: '', sale_price: '', in_hand_qty: '', status: 'Active' });
        } catch (err) { alert('Failed to add product'); }
    };

    const handleCellClick = (product, field, isDynamic = false) => {
        setEditingCell({ id: product.id, field, isDynamic });
        setEditValue(isDynamic ? (product.dynamic_data?.[field] || '') : product[field]);
    };

    const handleCellSave = async (product) => {
        if (!editingCell.id) return;

        try {
            const updatedData = { ...product };
            let val = editValue;
            if (['product_price', 'sale_price'].includes(editingCell.field)) val = parseFloat(val);
            if (editingCell.field === 'in_hand_qty') val = parseInt(val || 0);

            if (editingCell.isDynamic) {
                updatedData.dynamic_data = { ...updatedData.dynamic_data, [editingCell.field]: val };
            } else {
                updatedData[editingCell.field] = val;
            }

            const { data } = await api.put(`/products/${product.id}`, updatedData);
            setProducts(products.map(p => p.id === product.id ? data : p));
        } catch (err) {
            console.error(err);
            alert('Failed to update field');
        } finally {
            setEditingCell({ id: null, field: null });
        }
    };

    const handleCellKeyDown = (e, product) => {
        if (e.key === 'Enter') handleCellSave(product);
        if (e.key === 'Escape') setEditingCell({ id: null, field: null });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete product?')) return;
        try {
            await api.delete(`/products/${id}`);
            setProducts(products.filter(p => p.id !== id));
        } catch (err) { alert('Failed to delete'); }
    };

    const filteredProducts = products.filter(p => {
        const matchesGlobal = Object.values(p).some(val => String(val).toLowerCase().includes(search.toLowerCase()));

        const matchesColumns = Object.keys(columnFilters).every(key => {
            if (!columnFilters[key]) return true;
            let val = p[key];
            if (val === undefined && p.dynamic_data) val = p.dynamic_data[key];
            return String(val || '').toLowerCase().includes(columnFilters[key].toLowerCase());
        });

        return matchesGlobal && matchesColumns;
    });

    return (
        <div className="space-y-6">
            {userRole === 'SuperAdmin' && (
                <DynamicColumnManager tableName="products" onColumnAdded={fetchCustomColumns} />
            )}

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Products & Stock</h1>
                <div className="flex space-x-3">
                    <button onClick={() => setShowTransactionModal(true)} className="bg-white border text-gray-600 hover:text-indigo-600 px-4 py-2 rounded-lg flex items-center shadow-sm transition-all text-sm font-medium">
                        <Activity size={18} className="mr-2" /> Add Stock (Transaction)
                    </button>
                    <button onClick={() => setShowAddForm(!showAddForm)} className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all text-sm font-medium">
                        {showAddForm ? <X size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
                        {showAddForm ? 'Cancel' : 'New Product'}
                    </button>
                </div>
            </div>

            <TransactionModal
                isOpen={showTransactionModal}
                onClose={() => setShowTransactionModal(false)}
                onSuccess={fetchProducts}
            />

            {showAddForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">Add New Product</h2>
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <input required placeholder="Article No" className="input-field" value={formData.article_no} onChange={e => setFormData({ ...formData, article_no: e.target.value })} />
                        <input required placeholder="Name" className="input-field lg:col-span-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        <input required type="number" step="0.01" placeholder="Purchase Price" className="input-field" value={formData.product_price} onChange={e => setFormData({ ...formData, product_price: e.target.value })} />
                        <input required type="number" step="0.01" placeholder="Sale Price" className="input-field" value={formData.sale_price} onChange={e => setFormData({ ...formData, sale_price: e.target.value })} />
                        <input type="number" placeholder="In-Hand Qty" className="input-field" value={formData.in_hand_qty} onChange={e => setFormData({ ...formData, in_hand_qty: e.target.value })} />
                        {customColumns.map(col => (
                            <input
                                key={col.id}
                                placeholder={col.column_name}
                                className="input-field"
                                value={formData.dynamic_data[col.column_name] || ''}
                                onChange={e => setFormData({ ...formData, dynamic_data: { ...formData.dynamic_data, [col.column_name]: e.target.value } })}
                            />
                        ))}
                        <div className="lg:col-span-6 flex justify-end mt-2">
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">Save Product</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50/50">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input type="text" placeholder="Search products..." className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider border-b border-gray-200">
                                {['article_no', 'name', 'product_price', 'sale_price', 'in_hand_qty'].map(field => (
                                    <th key={field} className={`p-4 align-top ${['product_price', 'sale_price'].includes(field) ? 'text-right' : field === 'in_hand_qty' ? 'text-center' : ''}`}>
                                        <div className="mb-2 capitalize">{field.replace('_', ' ')}</div>
                                        <input
                                            placeholder="Search..."
                                            className="w-full text-xs p-1 border border-gray-300 rounded outline-none focus:border-indigo-500 font-normal bg-white text-gray-800"
                                            value={columnFilters[field] || ''}
                                            onChange={e => setColumnFilters({ ...columnFilters, [field]: e.target.value })}
                                        />
                                    </th>
                                ))}
                                <th className="p-4 align-top">
                                    <div className="mb-2">Status</div>
                                    <input
                                        placeholder="Search..."
                                        className="w-full text-xs p-1 border border-gray-300 rounded outline-none font-normal bg-white text-gray-800"
                                        value={columnFilters['status'] || ''}
                                        onChange={e => setColumnFilters({ ...columnFilters, status: e.target.value })}
                                    />
                                </th>
                                {customColumns.map(c => (
                                    <th key={c.id} className="p-4 align-top">
                                        <div className="mb-2">{c.column_name}</div>
                                        <input
                                            placeholder="Search..."
                                            className="w-full text-xs p-1 border border-gray-300 rounded outline-none font-normal bg-white text-gray-800"
                                            value={columnFilters[c.column_name] || ''}
                                            onChange={e => setColumnFilters({ ...columnFilters, [c.column_name]: e.target.value })}
                                        />
                                    </th>
                                ))}
                                <th className="p-4 text-right align-top">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-800">
                            {loading ? (
                                <tr><td colSpan={7 + customColumns.length} className="p-4 text-center text-gray-500">Loading data...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan={7 + customColumns.length} className="p-4 text-center text-gray-500 pb-8 pt-8">No products found.</td></tr>
                            ) : (
                                filteredProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                        {['article_no', 'name', 'product_price', 'sale_price', 'in_hand_qty', 'status'].map(field => (
                                            <td key={field} className={`p-0 relative cursor-pointer group-hover:bg-indigo-50/30 ${['product_price', 'sale_price'].includes(field) ? 'text-right' : field === 'in_hand_qty' ? 'text-center' : ''}`} onClick={() => handleCellClick(p, field)}>
                                                {editingCell.id === p.id && editingCell.field === field ? (
                                                    field === 'status' ? (
                                                        <select autoFocus className="w-full h-full p-4 outline-none border-2 border-indigo-500 bg-white" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleCellSave(p)} onKeyDown={(e) => handleCellKeyDown(e, p)}>
                                                            <option value="Active">Active</option>
                                                            <option value="Inactive">Inactive</option>
                                                        </select>
                                                    ) : (
                                                        <input autoFocus type={['product_price', 'sale_price', 'in_hand_qty'].includes(field) ? "number" : "text"} step={field === 'in_hand_qty' ? "1" : "0.01"} className="w-full h-full p-4 outline-none border-2 border-indigo-500 bg-white shadow-inner" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleCellSave(p)} onKeyDown={(e) => handleCellKeyDown(e, p)} />
                                                    )
                                                ) : (
                                                    <div className={`p-4 ${field === 'article_no' ? 'font-medium text-gray-900' : ''}`}>
                                                        {field === 'product_price' || field === 'sale_price' ? (
                                                            <span className="font-mono">${p[field].toFixed(2)}</span>
                                                        ) : field === 'in_hand_qty' ? (
                                                            <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded ${p.in_hand_qty > 10 ? 'bg-green-100 text-green-800' : p.in_hand_qty > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{p.in_hand_qty}</span>
                                                        ) : field === 'status' ? (
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{p.status}</span>
                                                        ) : (p[field] || '-')}
                                                    </div>
                                                )}
                                            </td>
                                        ))}

                                        {customColumns.map(col => (
                                            <td key={col.id} className="p-0 relative cursor-pointer group-hover:bg-indigo-50/30" onClick={() => handleCellClick(p, col.column_name, true)}>
                                                {editingCell.id === p.id && editingCell.field === col.column_name ? (
                                                    <input autoFocus className="w-full h-full p-4 outline-none border-2 border-indigo-500 bg-white shadow-inner" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleCellSave(p)} onKeyDown={(e) => handleCellKeyDown(e, p)} />
                                                ) : (
                                                    <div className="p-4 text-gray-500">{p.dynamic_data?.[col.column_name] || '-'}</div>
                                                )}
                                            </td>
                                        ))}

                                        <td className="p-4 text-right">
                                            <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Products;
