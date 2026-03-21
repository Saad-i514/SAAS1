import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit2, Trash2, Save, X } from 'lucide-react';
import DynamicColumnManager from '../components/DynamicColumnManager';

function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [customColumns, setCustomColumns] = useState([]);

    // Form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({ supplier_no: '', name: '', email: '', phone: '', status: 'Active', dynamic_data: {} });

    const [columnFilters, setColumnFilters] = useState({});

    // Inline edit state
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
            const { data } = await api.get('/dynamic-columns/?table_name=suppliers');
            setCustomColumns(data);
        } catch (err) { console.error(err); }
    };

    const fetchSuppliers = async () => {
        try {
            const { data } = await api.get('/suppliers/');
            setSuppliers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomColumns();
        fetchSuppliers();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/suppliers/', formData);
            setSuppliers([...suppliers, data]);
            setShowAddForm(false);
            setFormData({ supplier_no: '', name: '', email: '', phone: '', status: 'Active', dynamic_data: {} });
        } catch (err) {
            console.error(err);
            alert('Failed to add supplier');
        }
    };

    const handleCellClick = (supplier, field, isDynamic = false) => {
        setEditingCell({ id: supplier.id, field, isDynamic });
        setEditValue(isDynamic ? (supplier.dynamic_data?.[field] || '') : supplier[field]);
    };

    const handleCellSave = async (supplier) => {
        if (!editingCell.id) return;

        try {
            const updatedData = { ...supplier };
            if (editingCell.isDynamic) {
                updatedData.dynamic_data = { ...updatedData.dynamic_data, [editingCell.field]: editValue };
            } else {
                updatedData[editingCell.field] = editValue;
            }

            const { data } = await api.put(`/suppliers/${supplier.id}`, updatedData);
            setSuppliers(suppliers.map(s => s.id === supplier.id ? data : s));
        } catch (err) {
            console.error(err);
            alert('Failed to update field');
        } finally {
            setEditingCell({ id: null, field: null });
        }
    };

    const handleCellKeyDown = (e, supplier) => {
        if (e.key === 'Enter') handleCellSave(supplier);
        if (e.key === 'Escape') setEditingCell({ id: null, field: null });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this supplier?')) return;
        try {
            await api.delete(`/suppliers/${id}`);
            setSuppliers(suppliers.filter(s => s.id !== id));
        } catch (err) {
            console.error(err);
            alert('Failed to delete supplier');
        }
    };

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const filteredSuppliers = suppliers.filter(s => {
        // Global search
        const matchesGlobal = Object.values(s).some(val =>
            String(val).toLowerCase().includes(search.toLowerCase())
        );
        // Column filters
        const matchesColumns = Object.keys(columnFilters).every(key => {
            if (!columnFilters[key]) return true;

            let val = s[key];
            if (val === undefined && s.dynamic_data) val = s.dynamic_data[key];

            return String(val || '').toLowerCase().includes(columnFilters[key].toLowerCase());
        });

        return matchesGlobal && matchesColumns;
    });

    const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
    const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalColumnCount = 6 + customColumns.length; // 5 fixed columns + 1 actions column + custom columns

    return (
        <div className="space-y-6">
            {userRole === 'SuperAdmin' && (
                <DynamicColumnManager tableName="suppliers" onColumnAdded={fetchCustomColumns} />
            )}

            <div className="flex justify-between items-center outline-none">
                <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all"
                >
                    {showAddForm ? <X size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
                    {showAddForm ? 'Cancel' : 'Add Supplier'}
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-semibold mb-6 text-gray-800 border-b border-gray-100 pb-3">Onboard New Supplier</h2>
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Supplier No</label>
                            <input required placeholder="SUP-001" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50 text-gray-900" value={formData.supplier_no} onChange={e => setFormData({ ...formData, supplier_no: e.target.value })} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Supplier Name</label>
                            <input required placeholder="Global Traders Inc." className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50 text-gray-900" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                            <input placeholder="contact@supplier.com" type="email" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50 text-gray-900" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                            <input placeholder="+1 (555) 000-0000" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50 text-gray-900" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                            <select className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white font-medium text-gray-900" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
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
                        <div className="lg:col-span-3 flex justify-end mt-4 pt-4 border-t border-gray-50">
                            <button type="submit" className="bg-primary hover:bg-secondary text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-sm transform hover:scale-[1.02]">
                                Save Supplier
                            </button>
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
                        <input
                            type="text"
                            placeholder="Search all columns..."
                            className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm hidden lg:table-row font-medium uppercase tracking-wider border-b border-gray-200">
                                {['supplier_no', 'name', 'email', 'phone', 'status'].map(field => (
                                    <th key={field} className="p-4 align-top">
                                        <div className="mb-2 capitalize">{field.replace('_', ' ')}</div>
                                        <input
                                            placeholder="Search..."
                                            className="w-full text-xs p-1 border border-gray-300 rounded outline-none focus:border-indigo-500 font-normal bg-white text-gray-800"
                                            value={columnFilters[field] || ''}
                                            onChange={e => { setColumnFilters({ ...columnFilters, [field]: e.target.value }); setCurrentPage(1); }}
                                        />
                                    </th>
                                ))}
                                {customColumns.map(c => (
                                    <th key={c.id} className="p-4 align-top">
                                        <div className="mb-2">{c.column_name}</div>
                                        <input
                                            placeholder="Search..."
                                            className="w-full text-xs p-1 border border-gray-300 rounded outline-none focus:border-indigo-500 font-normal bg-white text-gray-800"
                                            value={columnFilters[c.column_name] || ''}
                                            onChange={e => { setColumnFilters({ ...columnFilters, [c.column_name]: e.target.value }); setCurrentPage(1); }}
                                        />
                                    </th>
                                ))}
                                <th className="p-4 text-right align-top">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-800">
                            {loading ? (
                                <tr><td colSpan={totalColumnCount} className="p-4 text-center text-gray-500">Loading data...</td></tr>
                            ) : paginatedSuppliers.length === 0 ? (
                                <tr><td colSpan={totalColumnCount} className="p-4 text-center text-gray-500 pb-8 pt-8">No suppliers found.</td></tr>
                            ) : (
                                paginatedSuppliers.map((supplier) => (
                                    <tr key={supplier.id} className="hover:bg-gray-50/50 transition-colors group">
                                        {/* Standard Columns */}
                                        {['supplier_no', 'name', 'email', 'phone', 'status'].map(field => (
                                            <td key={field} className="p-0 relative cursor-pointer group-hover:bg-indigo-50/30" onClick={() => handleCellClick(supplier, field)}>
                                                {editingCell.id === supplier.id && editingCell.field === field ? (
                                                    field === 'status' ? (
                                                        <select
                                                            autoFocus
                                                            className="w-full h-full p-4 outline-none border-2 border-indigo-500 bg-white"
                                                            value={supplier.status}
                                                            onChange={async (e) => {
                                                                const newStatus = e.target.value;
                                                                setEditingCell({ id: null, field: null });
                                                                try {
                                                                    const { data } = await api.put(`/suppliers/${supplier.id}`, { ...supplier, status: newStatus });
                                                                    setSuppliers(suppliers.map(s => s.id === supplier.id ? data : s));
                                                                } catch(err) { alert('Failed to change status'); }
                                                            }}
                                                            onBlur={() => setEditingCell({ id: null, field: null })}
                                                        >
                                                            <option value="Active">Active</option>
                                                            <option value="Inactive">Inactive</option>
                                                        </select>
                                                    ) : (
                                                        <input
                                                            autoFocus
                                                            className="w-full h-full p-4 outline-none border-2 border-indigo-500 bg-white shadow-inner"
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            onBlur={() => handleCellSave(supplier)}
                                                            onKeyDown={(e) => handleCellKeyDown(e, supplier)}
                                                        />
                                                    )
                                                ) : (
                                                    <div className={`p-4 ${field === 'supplier_no' ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                                                        {field === 'status' ? (
                                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${supplier.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {supplier.status}
                                                            </span>
                                                        ) : (supplier[field] || '-')}
                                                    </div>
                                                )}
                                            </td>
                                        ))}

                                        {/* Dynamic Columns */}
                                        {customColumns.map(col => (
                                            <td key={col.id} className="p-0 relative cursor-pointer group-hover:bg-indigo-50/30" onClick={() => handleCellClick(supplier, col.column_name, true)}>
                                                {editingCell.id === supplier.id && editingCell.field === col.column_name ? (
                                                    <input
                                                        autoFocus
                                                        className="w-full h-full p-4 outline-none border-2 border-indigo-500 bg-white shadow-inner"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onBlur={() => handleCellSave(supplier)}
                                                        onKeyDown={(e) => handleCellKeyDown(e, supplier)}
                                                    />
                                                ) : (
                                                    <div className="p-4 text-gray-500">{supplier.dynamic_data?.[col.column_name] || '-'}</div>
                                                )}
                                            </td>
                                        ))}

                                        <td className="p-4 text-right">
                                            <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleDelete(supplier.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 font-medium">
                    <span>Showing {paginatedSuppliers.length} of {filteredSuppliers.length} suppliers</span>
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

export default Suppliers;
