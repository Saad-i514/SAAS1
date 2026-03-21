import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit2, Trash2, X, Activity, Filter, PackageOpen } from 'lucide-react';
import DynamicColumnManager from '../components/DynamicColumnManager';
import TransactionModal from '../components/TransactionModal';

function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [customColumns, setCustomColumns] = useState([]);
    const [columnFilters, setColumnFilters] = useState({});

    const [isAddOrEditModalOpen, setIsAddOrEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    
    const [formData, setFormData] = useState({ article_no: '', name: '', category: '', product_price: '', sale_price: '', in_hand_qty: '', status: 'Active', dynamic_data: {} });

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
        setLoading(true);
        try {
            const { data } = await api.get('/products/');
            setProducts(data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchCustomColumns();
        fetchProducts();
    }, []);

    const openModal = (product = null) => {
        if (product) {
            setFormData({
                article_no: product.article_no || '',
                name: product.name || '',
                category: product.category || '',
                product_price: product.product_price || '',
                sale_price: product.sale_price || '',
                in_hand_qty: product.in_hand_qty || '',
                status: product.status || 'Active',
                dynamic_data: product.dynamic_data || {}
            });
            setEditingProduct(product);
        } else {
            setFormData({ article_no: '', name: '', category: '', product_price: '', sale_price: '', in_hand_qty: '', status: 'Active', dynamic_data: {} });
            setEditingProduct(null);
        }
        setIsAddOrEditModalOpen(true);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { 
                ...formData, 
                product_price: parseFloat(formData.product_price), 
                sale_price: parseFloat(formData.sale_price), 
                in_hand_qty: parseInt(formData.in_hand_qty || 0) 
            };
            
            if (editingProduct) {
                const { data } = await api.put(`/products/${editingProduct.id}`, payload);
                setProducts(products.map(p => p.id === editingProduct.id ? data : p));
            } else {
                const { data } = await api.post('/products/', payload);
                setProducts([data, ...products]);
            }
            setIsAddOrEditModalOpen(false);
        } catch (err) { 
            alert('Failed to save product'); 
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete product?')) return;
        try {
            await api.delete(`/products/${id}`);
            setProducts(products.filter(p => p.id !== id));
        } catch (err) { alert('Failed to delete'); }
    };

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

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

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 animate-fade-in relative">
            {userRole === 'SuperAdmin' && (
                <DynamicColumnManager tableName="products" onColumnAdded={fetchCustomColumns} />
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Products Inventory</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your SKUs, pricing, and stock levels.</p>
                </div>
                <div className="flex space-x-3 w-full md:w-auto">
                    <button onClick={() => setShowTransactionModal(true)} className="flex-1 md:flex-none justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl flex items-center transition-all text-sm font-semibold border border-indigo-200 shadow-sm leading-none h-[42px]">
                        <Activity size={18} className="mr-2" /> Quick Action (Sell/Return)
                    </button>
                    <button onClick={() => openModal()} className="flex-1 md:flex-none justify-center bg-primary hover:bg-secondary text-white px-4 py-2.5 rounded-xl flex items-center shadow-lg shadow-primary/30 transition-all text-sm font-semibold transform hover:scale-105 leading-none h-[42px]">
                        <Plus size={18} className="mr-2" /> New Product
                    </button>
                </div>
            </div>

            <TransactionModal
                isOpen={showTransactionModal}
                onClose={() => setShowTransactionModal(false)}
                onSuccess={fetchProducts}
            />

            {isAddOrEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/80">
                            <h2 className="text-xl font-bold text-gray-800 tracking-tight">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                            <button onClick={() => setIsAddOrEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-white p-2 rounded-full transition-all"><X size={20} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <div className="col-span-1 lg:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Article No (SKU)</label>
                                    <input required placeholder="ART-101" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50 text-gray-900" value={formData.article_no} onChange={e => setFormData({ ...formData, article_no: e.target.value })} />
                                </div>
                                <div className="col-span-1 md:col-span-1 lg:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                                    <input required placeholder="Premium Widget" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50 text-gray-900" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                                    <input placeholder="Electronics" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50 text-gray-900" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                    <select className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white font-medium text-gray-900" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">In-Hand Qty</label>
                                    <input type="number" placeholder="0" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50 text-gray-900" value={formData.in_hand_qty} onChange={e => setFormData({ ...formData, in_hand_qty: e.target.value })} />
                                </div>

                                <div className="col-span-1 lg:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Price ($)</label>
                                    <input required type="number" step="0.01" placeholder="0.00" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50 text-gray-900" value={formData.product_price} onChange={e => setFormData({ ...formData, product_price: e.target.value })} />
                                </div>
                                <div className="col-span-1 lg:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sale Price ($)</label>
                                    <input required type="number" step="0.01" placeholder="0.00" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50 text-gray-900" value={formData.sale_price} onChange={e => setFormData({ ...formData, sale_price: e.target.value })} />
                                </div>
                                
                                {customColumns.map(col => (
                                    <div key={col.id} className="col-span-1">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 capitalize">{col.column_name}</label>
                                        <input
                                            placeholder="..."
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50 text-gray-900"
                                            value={formData.dynamic_data[col.column_name] || ''}
                                            onChange={e => setFormData({ ...formData, dynamic_data: { ...formData.dynamic_data, [col.column_name]: e.target.value } })}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 flex justify-end space-x-3 border-t border-gray-100 mt-6">
                                <button type="button" onClick={() => setIsAddOrEditModalOpen(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium border border-gray-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-gray-200">Cancel</button>
                                <button type="submit" className="px-6 py-2.5 bg-primary hover:bg-secondary text-white rounded-xl font-medium transition-all shadow-lg shadow-primary/30 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center">
                                    {editingProduct ? 'Save Changes' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
                    <div className="relative w-full sm:max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input type="text" placeholder="Search across all fields..." className="pl-11 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm bg-white" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 font-medium">
                        <Filter size={16} /><span>Advanced Filters</span>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-white text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                                {['article_no', 'name', 'category', 'product_price', 'sale_price', 'in_hand_qty'].map((field) => (
                                    <th key={field} className={`p-4 align-top border-r border-gray-50 last:border-0 ${['product_price', 'sale_price'].includes(field) ? 'text-right' : field === 'in_hand_qty' ? 'text-center' : ''}`}>
                                        <div className="mb-2 flex flex-col justify-end h-5">
                                            {field === 'product_price' ? 'Cost Price' : field.replace('_', ' ')}
                                        </div>
                                        <input
                                            placeholder="Filter..."
                                            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-normal bg-gray-50/50 text-gray-800 placeholder-gray-400"
                                            value={columnFilters[field] || ''}
                                            onChange={e => { setColumnFilters({ ...columnFilters, [field]: e.target.value }); setCurrentPage(1); }}
                                        />
                                    </th>
                                ))}
                                <th className="p-4 align-top border-r border-gray-50">
                                    <div className="mb-2 flex flex-col justify-end h-5">Status</div>
                                    <select
                                        className="w-full text-xs px-1 py-1.5 border border-gray-200 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-normal bg-gray-50/50 text-gray-800 cursor-pointer"
                                        value={columnFilters['status'] || ''}
                                        onChange={e => { setColumnFilters({ ...columnFilters, status: e.target.value }); setCurrentPage(1); }}
                                    >
                                        <option value="">All</option>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </th>
                                {customColumns.map(c => (
                                    <th key={c.id} className="p-4 align-top border-r border-gray-50">
                                        <div className="mb-2 flex flex-col justify-end h-5 truncate max-w-[120px]" title={c.column_name}>{c.column_name}</div>
                                        <input
                                            placeholder="Filter..."
                                            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-normal bg-gray-50/50 text-gray-800"
                                            value={columnFilters[c.column_name] || ''}
                                            onChange={e => { setColumnFilters({ ...columnFilters, [c.column_name]: e.target.value }); setCurrentPage(1); }}
                                        />
                                    </th>
                                ))}
                                <th className="p-4 text-center align-top relative w-20">
                                    <div className="absolute inset-x-0 bottom-4 text-xs font-bold uppercase tracking-wider text-gray-400">Manage</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={8 + customColumns.length} className="p-16 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        <p className="mt-2 text-gray-500 font-medium tracking-wide text-sm">Loading inventory...</p>
                                    </td>
                                </tr>
                            ) : paginatedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={8 + customColumns.length} className="p-16 text-center">
                                        <PackageOpen size={48} className="mx-auto text-gray-300 mb-3" />
                                        <h3 className="text-gray-900 font-bold mb-1">No products found</h3>
                                        <p className="text-gray-500">Try adjusting your search or filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors group">
                                        {['article_no', 'name', 'category', 'product_price', 'sale_price', 'in_hand_qty'].map(field => (
                                            <td key={field} className={`px-4 py-3.5 border-r border-transparent group-hover:border-gray-100 ${['product_price', 'sale_price'].includes(field) ? 'text-right' : field === 'in_hand_qty' ? 'text-center' : ''}`}>
                                                <div className={`${field === 'name' ? 'font-bold text-gray-900 max-w-[200px] truncate' : field === 'article_no' ? 'text-gray-500 font-medium' : ''}`}>
                                                    {['product_price', 'sale_price'].includes(field) ? (
                                                        <span className="font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100 mr-[-4px]">${Number(p[field] || 0).toFixed(2)}</span>
                                                    ) : field === 'in_hand_qty' ? (
                                                        <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-black tracking-wide leading-none rounded-md ${p.in_hand_qty > 10 ? 'bg-emerald-100 text-emerald-800' : p.in_hand_qty > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                                            {p.in_hand_qty}
                                                        </span>
                                                    ) : field === 'category' ? (
                                                        <span className="text-gray-600 font-medium bg-gray-100/80 px-2.5 py-1 rounded-full text-xs tracking-wide">{p[field] || 'Uncategorized'}</span>
                                                    ) : (p[field] || '-')}
                                                </div>
                                            </td>
                                        ))}

                                        <td className="px-4 py-3.5 border-r border-transparent group-hover:border-gray-100 text-center">
                                            <span className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md ${p.status === 'Active' ? 'bg-green-100/80 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{p.status}</span>
                                        </td>

                                        {customColumns.map(col => (
                                            <td key={col.id} className="px-4 py-3.5 text-gray-600 border-r border-transparent group-hover:border-gray-100 max-w-[150px] truncate">
                                                {p.dynamic_data?.[col.column_name] || '-'}
                                            </td>
                                        ))}

                                        <td className="px-4 py-3.5 text-center">
                                            <div className="flex justify-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openModal(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 hover:shadow-sm rounded-lg transition-all" title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(p.id)} className="p-2 text-rose-600 hover:bg-rose-50 hover:shadow-sm rounded-lg transition-all" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 font-medium">
                    <span>Showing {paginatedProducts.length} of {filteredProducts.length} products</span>
                    {totalPages > 1 && (
                        <div className="flex space-x-2 mt-4 sm:mt-0">
                            <button 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                                className="px-3 py-1.5 border border-gray-200 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1.5 font-bold text-gray-700">Page {currentPage} of {totalPages}</span>
                            <button 
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                                className="px-3 py-1.5 border border-gray-200 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Products;
