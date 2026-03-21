import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/userService';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

function Users() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      // Operators should be what we focus on
      setUsers(data.filter(u => u.role !== 'SuperAdmin'));
    } catch (err) {
      console.error(err);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingUser) {
        // Prepare update data. Only send password if it's changing
        const data = { email: formData.email };
        if (formData.password) {
            data.password = formData.password;
        }
        await updateUser(editingUser.id, data);
      } else {
        if (!formData.password) {
            setError('Password is required for new users.');
            return;
        }
        await createUser({ email: formData.email, password: formData.password });
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    }
  };

  const openForm = (user = null) => {
    setEditingUser(user);
    if (user) {
      setFormData({ email: user.email, password: '' });
    } else {
      setFormData({ email: '', password: '' });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteUser(id);
        loadUsers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Employees</h1>
          <p className="text-gray-500 mt-1">Manage your company's users and credentials.</p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center space-x-2 bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          <span>Add Employee</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto p-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                <th className="p-4 font-semibold rounded-tl-xl rounded-bl-xl">Email</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right rounded-tr-xl rounded-br-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{user.email}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {user.role === 'OPERATOR' || user.role === 'Operator' ? 'Employee' : 'Manager'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 flex justify-end space-x-2">
                    <button onClick={() => openForm(user)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow">
                      <Edit2 size={16} />
                    </button>
                    {user.role !== 'Admin' && (
                        <button onClick={() => handleDelete(user.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow">
                        <Trash2 size={16} />
                        </button>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">
                    No employees found. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 font-medium">
            <span>Showing {paginatedUsers.length} of {users.length} employees</span>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl transform scale-100 transition-transform">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                {editingUser ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">{error}</div>}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50"
                  placeholder="employee@company.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password {editingUser && <span className="text-gray-400 font-normal">(Leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-gray-50/50"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-gray-50 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors outline-none border border-gray-200 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-secondary transition-colors outline-none shadow-lg shadow-primary/30 transform hover:scale-[1.02]"
                >
                  {editingUser ? 'Save Updates' : 'Add Employee'}
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
