import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, X, Layers, Trash2 } from 'lucide-react';

function DynamicColumnManager({ tableName, onColumnAdded }) {
    const [columns, setColumns] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [formData, setFormData] = useState({ table_name: tableName, column_name: '', data_type: 'string' });
    const [loading, setLoading] = useState(true);

    const fetchColumns = async () => {
        try {
            const { data } = await api.get(`/dynamic-columns/?table_name=${tableName}`);
            setColumns(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchColumns();
    }, [tableName]);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await api.post('/dynamic-columns/', formData);
            setShowAdd(false);
            setFormData({ ...formData, column_name: '' });
            fetchColumns();
            if (onColumnAdded) onColumnAdded(); // Trigger parent refresh
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to add column');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this custom column? Note: Existing data will still remain in the JSON blob but won\'t be visible.')) return;
        try {
            await api.delete(`/dynamic-columns/${id}`);
            fetchColumns();
            if (onColumnAdded) onColumnAdded();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return null;

    return (
        <div className="mb-6 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-indigo-900 flex items-center">
                    <Layers size={16} className="mr-2" />
                    Custom Fields (Dynamic Columns)
                </h3>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="text-indigo-600 border border-indigo-200 hover:bg-indigo-100 bg-white px-3 py-1 rounded text-xs font-medium transition-colors"
                >
                    {showAdd ? 'Cancel' : '+ Add Field'}
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleAdd} className="flex flex-wrap gap-3 mb-4 items-end bg-white p-3 rounded shadow-sm border border-indigo-50">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-gray-500 mb-1">Field Name</label>
                        <input
                            required
                            placeholder="e.g. Website URL"
                            className="text-sm input-field w-full py-1.5"
                            value={formData.column_name}
                            onChange={e => setFormData({ ...formData, column_name: e.target.value })}
                        />
                    </div>
                    <div className="w-48">
                        <label className="block text-xs text-gray-500 mb-1">Data Type</label>
                        <select
                            className="text-sm input-field w-full py-1.5 bg-white"
                            value={formData.data_type}
                            onChange={e => setFormData({ ...formData, data_type: e.target.value })}
                        >
                            <option value="string">Text</option>
                            <option value="number">Number</option>
                            <option value="boolean">Yes/No</option>
                        </select>
                    </div>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-medium h-[34px]">
                        Save
                    </button>
                </form>
            )}

            {columns.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {columns.map(col => (
                        <div key={col.id} className="bg-white border border-gray-200 px-3 py-1.5 rounded-full flex items-center shadow-sm text-sm">
                            <span className="text-gray-700 font-medium mr-2">{col.column_name}</span>
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded mr-2 uppercase">{col.data_type}</span>
                            <button onClick={() => handleDelete(col.id)} className="text-red-400 hover:text-red-600 p-0.5 rounded-full hover:bg-red-50">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-gray-500 italic">No custom fields added yet.</p>
            )}
        </div>
    );
}

export default DynamicColumnManager;
