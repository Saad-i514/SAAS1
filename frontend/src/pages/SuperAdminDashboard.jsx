import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Building2, Plus, Mail, Key, Hash, X } from 'lucide-react';

function SuperAdminDashboard() {
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({ company_name: '', email: '', password: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // In a real application we would fetch the list of properties/companies
    // but for now the backend endpoints for generic company reading need to be built.

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            await api.post('/users/company-admin', formData);
            setSuccess(`Company ${formData.company_name} and Admin ${formData.email} registered successfully!`);
            setFormData({ company_name: '', email: '', password: '' });
            setShowAddForm(false);
        } catch (err) {
            let errorMsg = 'Failed to create company';
            if (err.response?.data?.detail) {
                if (typeof err.response.data.detail === 'string') {
                    errorMsg = err.response.data.detail;
                } else if (Array.isArray(err.response.data.detail)) {
                    errorMsg = err.response.data.detail[0].msg || 'Validation Error';
                }
            }
            setError(errorMsg);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex justify-between items-center outline-none">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Building2 className="mr-3 text-indigo-600" />
                        Super Admin Panel
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage global tenants and application instances.</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all text-sm font-medium"
                >
                    {showAddForm ? <X size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
                    {showAddForm ? 'Cancel' : 'Onboard New Company'}
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Tenant Onboarding Details</h2>

                    {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

                    <form onSubmit={handleCreateCompany} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company / Organization Name</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    required
                                    placeholder="e.g. Acme Corp"
                                    className="pl-10 input-field w-full"
                                    value={formData.company_name}
                                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    required
                                    type="email"
                                    placeholder="admin@acmecorp.com"
                                    className="pl-10 input-field w-full"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Admin Password</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    required
                                    type="text"
                                    placeholder="Set an initial password"
                                    className="pl-10 input-field w-full"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end mt-4">
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                                Create Tenant Account
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-start">
                    <div className="font-medium">{success}</div>
                </div>
            )}

            {!showAddForm && !success && (
                <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500">
                    <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-1">No pending actions</h3>
                    <p>Click "Onboard New Company" to generate an admin account for a new tenant.</p>
                </div>
            )}
        </div>
    );
}

export default SuperAdminDashboard;
