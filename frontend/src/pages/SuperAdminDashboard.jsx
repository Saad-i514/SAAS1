import React, { useState, useEffect } from 'react';
import { getCompanies, createCompanyAdmin, deleteCompany } from '../services/companyService';
import { Building2, Plus, Mail, Key, Hash, X, Trash2 } from 'lucide-react';

function SuperAdminDashboard() {
    const [companies, setCompanies] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({ company_name: '', email: '', password: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        try {
            const data = await getCompanies();
            setCompanies(data);
        } catch (err) {
            console.error("Failed to load companies", err);
        }
    };

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            await createCompanyAdmin(formData);
            setSuccess(`Company ${formData.company_name} registered successfully!`);
            setFormData({ company_name: '', email: '', password: '' });
            setShowAddForm(false);
            loadCompanies();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create company');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this company and ALL its data? This cannot be undone.")) {
            try {
                await deleteCompany(id);
                loadCompanies();
            } catch (err) {
                alert("Failed to delete company");
            }
        }
    };

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(companies.length / itemsPerPage);
    const paginatedCompanies = companies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Building2 className="mr-3 text-primary" size={28} />
                        Super Admin Panel
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage all multi-tenant instances across the platform.</p>
                </div>
                <button
                    onClick={() => { setShowAddForm(!showAddForm); setSuccess(null); }}
                    className="bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-primary/30 transition-all font-medium transform hover:scale-105"
                >
                    {showAddForm ? <X size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
                    {showAddForm ? 'Cancel Creation' : 'Onboard New tenant'}
                </button>
            </div>

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl font-medium flex items-center shadow-sm">
                    {success}
                </div>
            )}

            {showAddForm && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-xl font-bold mb-6 text-gray-800 border-b border-gray-100 pb-3">Tenant Onboarding</h2>
                    {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-6 text-sm font-medium">{error}</div>}

                    <form onSubmit={handleCreateCompany} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    required
                                    placeholder="Acme Corp"
                                    className="pl-11 w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50"
                                    value={formData.company_name}
                                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Manager (Admin) Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    required
                                    type="email"
                                    placeholder="admin@acme.com"
                                    className="pl-11 w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Temporary Password</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    required
                                    type="text"
                                    placeholder="Initial access password"
                                    className="pl-11 w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end mt-2">
                            <button type="submit" className="bg-primary hover:bg-secondary text-white px-8 py-3 rounded-xl font-medium transition-all shadow-lg shadow-primary/30 transform hover:scale-105 text-lg">
                                Complete Onboarding
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Active Tenants ({companies.length})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-gray-500 text-sm border-b border-gray-100">
                                <th className="p-4 font-semibold pl-6">ID</th>
                                <th className="p-4 font-semibold">Company Name</th>
                                <th className="p-4 font-semibold text-right pr-6">Management</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedCompanies.map((company) => (
                                <tr key={company.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="p-4 pl-6 text-gray-500 text-sm">#{company.id}</td>
                                    <td className="p-4 font-medium text-gray-900">{company.name}</td>
                                    <td className="p-4 pr-6 flex justify-end">
                                        <button 
                                            onClick={() => handleDelete(company.id)} 
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg flex items-center space-x-2"
                                            title="Delete Database"
                                        >
                                            <Trash2 size={18} />
                                            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Delete Data</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {paginatedCompanies.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="p-12 text-center text-gray-400">
                                        <Building2 size={48} className="mx-auto mb-4 opacity-50 text-gray-300" />
                                        <p className="text-lg">No tenants found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 font-medium">
                    <span>Showing {paginatedCompanies.length} of {companies.length} tenants</span>
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

export default SuperAdminDashboard;
