import React, { useState, useEffect, useCallback } from 'react';
import { getCompanies, createCompanyAdmin, deleteCompany } from '../services/companyService';
import { Building2, Plus, Mail, Key, Hash, X, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [companies, setCompanies]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData]     = useState({ company_name: '', email: '', password: '' });
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try { const data = await getCompanies(); setCompanies(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  const handleCreate = async (e) => {
    e.preventDefault(); setError(null); setSuccess(null); setSubmitting(true);
    try {
      await createCompanyAdmin(formData);
      setSuccess(`"${formData.company_name}" onboarded successfully.`);
      setFormData({ company_name: '', email: '', password: '' });
      setShowAddForm(false);
      loadCompanies();
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create company'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}" and ALL its data? This is irreversible.`)) return;
    try { await deleteCompany(id); setCompanies(prev => prev.filter(c => c.id !== id)); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to delete'); }
  };

  const totalPages = Math.ceil(companies.length / PER_PAGE);
  const paginated  = companies.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="page animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 size={20} className="text-violet-600" /> Tenant Management
          </h1>
          <p className="page-subtitle">{companies.length} active tenants</p>
        </div>
        <button onClick={() => { setShowAddForm(!showAddForm); setError(null); setSuccess(null); }} className="btn btn-primary btn-sm">
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? 'Cancel' : 'Onboard Tenant'}
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-slide-up">
          <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">{success}</p>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <p className="section-title">New Tenant Onboarding</p>
          </div>
          <div className="card-body">
            {error && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="input-label">Company Name *</label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input required placeholder="Acme Corporation" className="input pl-8" value={formData.company_name} onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="input-label">Admin Email *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input required type="email" placeholder="admin@acme.com" className="input pl-8" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="input-label">Temporary Password *</label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input required type="text" placeholder="Initial password" className="input pl-8" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
                </div>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Complete Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <p className="section-title">Active Tenants</p>
          <span className="badge badge-blue">{companies.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Company</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan="3" className="px-4 py-3"><div className="h-7 skeleton rounded" /></td></tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan="3">
                  <div className="empty-state">
                    <div className="empty-state-icon"><Building2 size={20} className="text-gray-400" /></div>
                    <p className="empty-state-title">No tenants yet</p>
                    <p className="empty-state-desc">Onboard your first client</p>
                  </div>
                </td></tr>
              ) : paginated.map(company => (
                <tr key={company.id} className="group">
                  <td className="font-mono text-xs text-gray-400 dark:text-slate-500 tabular">#{company.id}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-50 dark:bg-violet-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-violet-600 dark:text-violet-400 font-semibold text-xs">{company.name[0]?.toUpperCase()}</span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">{company.name}</p>
                    </div>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleDelete(company.id, company.name)}
                      className="btn btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-slate-400">{companies.length} tenants</p>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="pagination-btn">Prev</button>
              <span className="px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 font-medium">{currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="pagination-btn">Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
