import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/userService';
import { Plus, Edit2, Trash2, X, UserCog, Shield, User, CheckCircle, XCircle } from 'lucide-react';

const ROLE_CONFIG = {
  Admin:    { label: 'Manager',  icon: Shield, badge: 'badge-purple' },
  Operator: { label: 'Employee', icon: User,   badge: 'badge-blue' },
  ADMIN:    { label: 'Manager',  icon: Shield, badge: 'badge-purple' },
  OPERATOR: { label: 'Employee', icon: User,   badge: 'badge-blue' },
};

export default function Users() {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData]   = useState({ email: '', password: '' });
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data.filter(u => u.role !== 'SuperAdmin'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const totalPages = Math.ceil(users.length / PER_PAGE);
  const paginated  = users.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      if (editingUser) {
        const data = { email: formData.email };
        if (formData.password) data.password = formData.password;
        await updateUser(editingUser.id, data);
      } else {
        if (!formData.password) { setError('Password is required.'); setSubmitting(false); return; }
        await createUser({ email: formData.email, password: formData.password });
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err) { setError(err.response?.data?.detail || 'An error occurred'); }
    finally { setSubmitting(false); }
  };

  const openForm = (user = null) => {
    setEditingUser(user);
    setFormData(user ? { email: user.email, password: '' } : { email: '', password: '' });
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this employee?')) return;
    try { await deleteUser(id); loadUsers(); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to delete'); }
  };

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{users.length} team members</p>
        </div>
        <button onClick={() => openForm()} className="btn btn-primary btn-sm">
          <Plus size={14} /> Add Employee
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th className="text-center">Role</th>
                <th className="text-center">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan="4" className="px-4 py-3"><div className="h-7 skeleton rounded" /></td></tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan="4">
                  <div className="empty-state">
                    <div className="empty-state-icon"><UserCog size={20} className="text-gray-400" /></div>
                    <p className="empty-state-title">No employees yet</p>
                    <p className="empty-state-desc">Add your first team member</p>
                  </div>
                </td></tr>
              ) : paginated.map(user => {
                const role = ROLE_CONFIG[user.role] || { label: user.role, icon: User, badge: 'badge-gray' };
                const RoleIcon = role.icon;
                return (
                  <tr key={user.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-violet-50 dark:bg-violet-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-violet-600 dark:text-violet-400 font-semibold text-xs">{user.email[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 tabular">ID #{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className={`badge gap-1 ${role.badge}`}>
                        <RoleIcon size={10} /> {role.label}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`badge gap-1 ${user.is_active ? 'badge-green' : 'badge-red'}`}>
                        {user.is_active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openForm(user)} className="btn-ghost btn btn-icon" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        {user.role !== 'Admin' && user.role !== 'ADMIN' && (
                          <button onClick={() => handleDelete(user.id)} className="btn-ghost btn btn-icon text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-slate-400">{users.length} employees</p>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="pagination-btn">Prev</button>
              <span className="px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 font-medium">{currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="pagination-btn">Next</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal max-w-md">
            <div className="modal-header">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {editingUser ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost btn btn-icon"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                {error && <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">{error}</div>}
                <div>
                  <label className="input-label">Email Address</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="input" placeholder="employee@company.com" />
                </div>
                <div>
                  <label className="input-label">
                    Password {editingUser && <span className="text-gray-400 font-normal normal-case">(leave blank to keep)</span>}
                  </label>
                  <input type="password" required={!editingUser} value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} className="input" placeholder="••••••••" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {editingUser ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
