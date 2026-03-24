import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/userService';
import { Plus, Edit2, Trash2, X, UserCog, Shield, User, CheckCircle, XCircle } from 'lucide-react';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data.filter(u => u.role !== 'SuperAdmin'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginated = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
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
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const openForm = (user = null) => {
    setEditingUser(user);
    setFormData(user ? { email: user.email, password: '' } : { email: '', password: '' });
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this employee?')) return;
    try {
      await deleteUser(id);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const roleConfig = {
    Admin: { label: 'Manager', icon: Shield, color: 'bg-purple-100 text-purple-700' },
    Operator: { label: 'Employee', icon: User, color: 'bg-blue-100 text-blue-700' },
    OPERATOR: { label: 'Employee', icon: User, color: 'bg-blue-100 text-blue-700' },
    ADMIN: { label: 'Manager', icon: Shield, color: 'bg-purple-100 text-purple-700' },
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900">Employees</h1>
          <p className="text-gray-500 text-sm mt-0.5">{users.length} team members</p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-indigo-500/20"
        >
          <Plus size={16} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-5 py-3 text-center">Role</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="4" className="px-5 py-4">
                      <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-5 py-16 text-center">
                    <UserCog size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No employees yet</p>
                    <p className="text-gray-400 text-xs mt-1">Add your first team member</p>
                  </td>
                </tr>
              ) : (
                paginated.map(user => {
                  const role = roleConfig[user.role] || { label: user.role, icon: User, color: 'bg-gray-100 text-gray-700' };
                  const RoleIcon = role.icon;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-700 font-black text-sm">{user.email[0]?.toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{user.email}</p>
                            <p className="text-xs text-gray-400">ID #{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${role.color}`}>
                          <RoleIcon size={11} />
                          <span>{role.label}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {user.is_active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                          <span>{user.is_active ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openForm(user)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                            <Edit2 size={14} />
                          </button>
                          {user.role !== 'Admin' && user.role !== 'ADMIN' && (
                            <button onClick={() => handleDelete(user.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>Showing {paginated.length} of {users.length} employees</span>
          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Prev</button>
              <span className="px-3 py-1.5 font-bold text-gray-700">{currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Next</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingUser ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">{error}</div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="employee@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Password {editingUser && <span className="text-gray-400 font-normal normal-case">(leave blank to keep)</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center space-x-2">
                  {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  <span>{editingUser ? 'Save Changes' : 'Add Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
