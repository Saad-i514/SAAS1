import React, { useState, useEffect, useCallback } from 'react';
import { getCompanies, createCompanyAdmin, deleteCompany } from '../services/companyService';
import { Building2, Plus, Mail, Key, Hash, X, Trash2, Users, CheckCircle, AlertTriangle } from 'lucide-react';

function SuperAdminDashboard() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ company_name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Failed to load companies', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await createCompanyAdmin(formData);
      setSuccess(`"${formData.company_name}" has been onboarded successfully.`);
      setFormData({ company_name: '', email: '', password: '' });
      setShowAddForm(false);
      loadCompanies();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}" and ALL its data? This is irreversible.`)) return;
    try {
      await deleteCompany(id);
      setCompanies(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete company');
    }
  };

  const totalPages = Math.ceil(companies.length / itemsPerPage);
  const paginated = companies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center space-x-2">
            <Building2 size={22} className="text-indigo-600" />
            <span>Tenant Management</span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{companies.length} active tenants on the platform</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setError(null); setSuccess(null); }}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-indigo-500/20"
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          <span>{showAddForm ? 'Cancel' : 'Onboard Tenant'}</span>
        </button>
      </div>

      {/* Success/Error alerts */}
      {success && (
        <div className="flex items-center space-x-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl animate-slide-up">
          <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
          <p className="text-emerald-800 font-semibold text-sm">{success}</p>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slide-up">
          <h2 className="text-base font-bold text-gray-900 mb-5">New Tenant Onboarding</h2>
          {error && (
            <div className="flex items-center space-x-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Company Name *</label>
              <div className="relative">
                <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  placeholder="Acme Corporation"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.company_name}
                  onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Admin Email *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type="email"
                  placeholder="admin@acme.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Temporary Password *</label>
              <div className="relative">
                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type="text"
                  placeholder="Initial password"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
              >
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                <span>Complete Onboarding</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Companies Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Active Tenants</h2>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{companies.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">ID</th>
                <th className="px-5 py-3 text-left">Company Name</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="3" className="px-5 py-4">
                      <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-5 py-16 text-center">
                    <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No tenants yet</p>
                    <p className="text-gray-400 text-xs mt-1">Onboard your first client</p>
                  </td>
                </tr>
              ) : (
                paginated.map(company => (
                  <tr key={company.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-5 py-4 text-gray-400 font-mono text-xs">#{company.id}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 font-black text-sm">{company.name[0]?.toUpperCase()}</span>
                        </div>
                        <p className="font-bold text-gray-900">{company.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDelete(company.id, company.name)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 text-xs font-semibold"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>Showing {paginated.length} of {companies.length} tenants</span>
          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Prev</button>
              <span className="px-3 py-1.5 font-bold text-gray-700">{currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
