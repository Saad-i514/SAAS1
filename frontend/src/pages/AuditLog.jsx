import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { ShieldCheck, Search, Filter, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PAYMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const RESOURCE_COLORS = {
  transaction: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  product:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  supplier:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  customer:    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [page, setPage] = useState(0);
  const [sortDir, setSortDir] = useState('desc');
  const PAGE_SIZE = 100;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE, skip: page * PAGE_SIZE });
      if (action) params.set('action', action);
      if (resource) params.set('resource_type', resource);
      if (userEmail) params.set('user_email', userEmail);
      const { data } = await api.get(`/audit-log/?${params}`);
      setLogs(data);
    } catch (e) {
      if (e.response?.status === 403) {
        setLogs([]);
      }
    } finally { setLoading(false); }
  }, [action, resource, userEmail, page]);

  useEffect(() => { load(); }, [load]);

  const sorted = sortDir === 'desc' ? [...logs] : [...logs].reverse();

  const clearFilters = () => { setAction(''); setResource(''); setUserEmail(''); setPage(0); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Audit Log</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Track who created, edited, or deleted what and when</p>
        </div>
        <button onClick={load} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {['', 'CREATE', 'UPDATE', 'DELETE', 'PAYMENT'].map(a => (
            <button key={a} onClick={() => { setAction(a); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${action === a ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
              {a || 'All Actions'}
            </button>
          ))}
          <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 self-center" />
          {['', 'transaction', 'product', 'supplier', 'customer'].map(r => (
            <button key={r} onClick={() => { setResource(r); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all capitalize ${resource === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
              {r || 'All Resources'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Filter by user email…" value={userEmail} onChange={e => { setUserEmail(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all" />
          </div>
          {(action || resource || userEmail) && (
            <button onClick={clearFilters} className="flex items-center space-x-1 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
              <X size={14} /><span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">Loading audit log…</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <ShieldCheck size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-semibold">No audit entries found</p>
            <p className="text-sm mt-1">Actions will appear here as they happen</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                  <tr className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                      <span className="flex items-center gap-1">Time {sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>
                    </th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Resource</th>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {sorted.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap text-xs">
                        <div>{log.created_at ? new Date(log.created_at).toLocaleDateString() : '—'}</div>
                        <div className="text-gray-400 dark:text-slate-500">{log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300 text-xs max-w-[140px] truncate">{log.user_email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>{log.action}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold capitalize ${RESOURCE_COLORS[log.resource_type] || 'bg-gray-100 text-gray-700'}`}>{log.resource_type}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 font-mono text-xs">{log.resource_id || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300 text-xs max-w-[280px]">
                        <span className="line-clamp-2">{log.description || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 dark:text-slate-500 font-mono text-xs whitespace-nowrap">{log.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-800">
              <p className="text-xs text-gray-500 dark:text-slate-400">{sorted.length} entries</p>
              <div className="flex items-center space-x-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Prev</button>
                <span className="text-xs text-gray-500 dark:text-slate-400">Page {page + 1}</span>
                <button disabled={sorted.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
