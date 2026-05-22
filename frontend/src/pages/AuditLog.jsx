import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { ShieldCheck, Search, X, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { fmtDateShort } from '../services/dateUtils';

const ACTION_BADGE = {
  CREATE:  'badge-green',
  UPDATE:  'badge-blue',
  DELETE:  'badge-red',
  PAYMENT: 'badge-purple',
};
const RESOURCE_BADGE = {
  transaction: 'badge-purple',
  product:     'badge-green',
  supplier:    'badge-blue',
  customer:    'badge-blue',
};

export default function AuditLog() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [action, setAction]     = useState('');
  const [resource, setResource] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [page, setPage]         = useState(0);
  const [sortDir, setSortDir]   = useState('desc');
  const PAGE = 100;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE, skip: page * PAGE });
      if (action)    params.set('action', action);
      if (resource)  params.set('resource_type', resource);
      if (userEmail) params.set('user_email', userEmail);
      const { data } = await api.get(`/audit-log/?${params}`);
      setLogs(data);
    } catch (e) {
      if (e.response?.status === 403) setLogs([]);
    } finally { setLoading(false); }
  }, [action, resource, userEmail, page]);

  useEffect(() => { load(); }, [load]);

  const sorted = sortDir === 'desc' ? [...logs] : [...logs].reverse();
  const clearFilters = () => { setAction(''); setResource(''); setUserEmail(''); setPage(0); };

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Track who created, edited, or deleted what and when</p>
        </div>
        <button onClick={load} className="btn btn-secondary btn-icon">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {['', 'CREATE', 'UPDATE', 'DELETE', 'PAYMENT'].map(a => (
            <button key={a} onClick={() => { setAction(a); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                action === a
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300'
              }`}>
              {a || 'All Actions'}
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 self-center mx-1" />
          {['', 'transaction', 'product', 'supplier', 'customer'].map(r => (
            <button key={r} onClick={() => { setResource(r); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                resource === r
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300'
              }`}>
              {r || 'All Resources'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Filter by user email…" value={userEmail}
              onChange={e => { setUserEmail(e.target.value); setPage(0); }}
              className="input pl-8 py-2 text-xs" />
          </div>
          {(action || resource || userEmail) && (
            <button onClick={clearFilters} className="btn btn-ghost btn-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-slate-500">Loading audit log…</div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ShieldCheck size={20} className="text-gray-400" /></div>
            <p className="empty-state-title">No audit entries found</p>
            <p className="empty-state-desc">Actions will appear here as they happen</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="cursor-pointer select-none" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                      <span className="flex items-center gap-1">
                        Time {sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </span>
                    </th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>ID</th>
                    <th>Description</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(log => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap">
                        <p className="text-xs text-gray-600 dark:text-slate-300 tabular">
                          {log.created_at ? fmtDateShort(log.created_at) : '—'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 tabular">
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}
                        </p>
                      </td>
                      <td className="max-w-[140px] truncate text-xs text-gray-600 dark:text-slate-300">
                        {log.user_email || '—'}
                      </td>
                      <td>
                        <span className={`badge ${ACTION_BADGE[log.action] || 'badge-gray'}`}>{log.action}</span>
                      </td>
                      <td>
                        <span className={`badge capitalize ${RESOURCE_BADGE[log.resource_type] || 'badge-gray'}`}>
                          {log.resource_type}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-gray-500 dark:text-slate-400">{log.resource_id || '—'}</td>
                      <td className="max-w-[280px]">
                        <span className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2">{log.description || '—'}</span>
                      </td>
                      <td className="font-mono text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-slate-400">{sorted.length} entries</p>
              <div className="pagination">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="pagination-btn">Prev</button>
                <span className="px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 font-medium">Page {page + 1}</span>
                <button disabled={sorted.length < PAGE} onClick={() => setPage(p => p + 1)} className="pagination-btn">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
