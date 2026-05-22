import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Download, FileSpreadsheet, Package, Users, Activity,
  RefreshCcw, Printer, FileDown, BarChart2, ShoppingBag,
  ChevronDown, ChevronRight, User,
} from 'lucide-react';
import api from '../services/api';
import CustomerReportModal from '../components/CustomerReportModal';
import { fmtDateShort } from '../services/dateUtils';

const TIMEFRAMES = [
  { key: 'daily',   label: 'Today' },
  { key: 'weekly',  label: '7 Days' },
  { key: 'monthly', label: '30 Days' },
  { key: 'yearly',  label: '1 Year' },
];

export default function Reports() {
  const [timeframe, setTimeframe]   = useState('monthly');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [viewMode, setViewMode]     = useState('sales');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [expandedCustomers, setExpandedCustomers]   = useState(new Set());

  const groupedByCustomer = useMemo(() => {
    const { items = [] } = reportData || {};
    const map = new Map();
    items.forEach((item, idx) => {
      const key = item.customer_name || '(No Customer)';
      if (!map.has(key)) map.set(key, { customer: key, items: [], totalSale: 0, totalCost: 0, totalProfit: 0, totalQty: 0 });
      const g = map.get(key);
      g.items.push({ ...item, _idx: idx });
      g.totalSale   += item.total_sale_price  || 0;
      g.totalCost   += item.total_cost_price  || 0;
      g.totalProfit += item.profit            || 0;
      g.totalQty    += item.quantity          || 0;
    });
    return Array.from(map.values()).sort((a, b) => b.totalSale - a.totalSale);
  }, [reportData]);

  const toggleCustomer = (c) => setExpandedCustomers(prev => {
    const next = new Set(prev);
    next.has(c) ? next.delete(c) : next.add(c);
    return next;
  });

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/sales-summary?timeframe=${timeframe}`);
      setReportData(data);
      setSelectedIds([]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [timeframe]);

  useEffect(() => { if (viewMode === 'sales') fetchReportData(); }, [timeframe, viewMode, fetchReportData]);

  const downloadCSV = async (type) => {
    try {
      const res = await api.get(`/reports/csv/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download CSV'); }
  };

  const downloadPDF = async (type) => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
      const titles = { products: 'Products Inventory', suppliers: 'Suppliers Directory', transactions: 'Transaction History' };
      const res = await api.get(type === 'products' ? '/products/' : type === 'suppliers' ? '/suppliers/' : '/transactions/');
      const data = res.data;
      if (!data?.length) { alert('No data available.'); return; }
      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text(titles[type] + ' Report', 14, 22);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30); doc.setTextColor(0);
      let cols = [], rows = [], summary = '';
      if (type === 'products') {
        cols = ['SKU','Name','Category','Status','Stock','Purchase','Sale','Margin'];
        let ts = 0, tv = 0;
        rows = data.map(p => { ts += p.in_hand_qty||0; tv += (p.in_hand_qty||0)*(p.product_price||0); const m = p.product_price > 0 ? (((p.sale_price-p.product_price)/p.product_price)*100).toFixed(1)+'%' : '-'; return [p.article_no,p.name,p.category||'—',p.status,p.in_hand_qty||0,`Rs ${(p.product_price||0).toFixed(2)}`,`Rs ${(p.sale_price||0).toFixed(2)}`,m]; });
        summary = `${data.length} products | Stock: ${ts} units | Value: Rs ${tv.toLocaleString()}`;
      } else if (type === 'suppliers') {
        cols = ['No','Name','Email','Phone','Status'];
        rows = data.map(s => [s.supplier_no,s.name,s.email||'—',s.phone||'—',s.status]);
        summary = `${data.length} suppliers | Active: ${data.filter(s=>s.status==='Active').length}`;
      } else {
        cols = ['Date','Type','Product','Qty','Unit Price','Discount','Amount','Order No'];
        let tq=0,ts=0,tp=0;
        rows = data.map(t => { tq+=t.quantity||0; const a=t.debit||0; if(t.type==='sale')ts+=a; else if(t.type==='purchase')tp+=a; return [t.date?fmtDateShort(t.date):'—',(t.type||'—').toUpperCase(),t.product_name||'—',t.quantity||0,(t.unit_price||0).toFixed(2),(t.discount||0).toFixed(2),a.toFixed(2),t.order_no||'—']; });
        summary = `${data.length} transactions | Items: ${tq} | Sales: Rs ${ts.toLocaleString()} | Purchases: Rs ${tp.toLocaleString()}`;
      }
      autoTable(doc, { startY: 36, head: [cols], body: rows, theme: 'striped', headStyles: { fillColor: [79,70,229], fontStyle: 'bold' }, alternateRowStyles: { fillColor: [248,250,252] } });
      const y = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(8); doc.setTextColor(79,70,229); doc.text('Summary: ', 14, y+5);
      doc.setTextColor(60); doc.text(summary, 40, y+5);
      doc.save(`${type}_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) { console.error(err); alert('Failed to generate PDF'); }
  };

  const handlePrint = () => {
    const items = reportData?.items || [];
    const toPrint = selectedIds.length > 0 ? items.filter((_, i) => selectedIds.includes(i)) : items;
    if (!toPrint.length) { alert('No items to print.'); return; }
    const user = (() => { try { return JSON.parse(localStorage.getItem('user')||'{}'); } catch { return {}; } })();
    const company = user?.company?.name || 'Company';
    const totals = toPrint.reduce((a,i) => ({ qty: a.qty+(i.quantity||0), sales: a.sales+(i.total_sale_price||0), cost: a.cost+(i.total_cost_price||0), profit: a.profit+(i.profit||0) }), {qty:0,sales:0,cost:0,profit:0});
    const rows = toPrint.map(i => `<tr><td>${i.date?fmtDateShort(i.date):'—'}</td><td>${i.product_name||'—'}</td><td>${i.category||'—'}</td><td style="text-align:center">${i.quantity||0}</td><td style="text-align:right">Rs ${(i.unit_sale_price||0).toFixed(2)}</td><td style="text-align:right">Rs ${(i.total_sale_price||0).toFixed(2)}</td><td style="text-align:right">Rs ${(i.total_cost_price||0).toFixed(2)}</td><td style="text-align:right;color:${i.profit>=0?'#059669':'#dc2626'}">Rs ${(i.profit||0).toFixed(2)}</td></tr>`).join('');
    const win = window.open('','_blank');
    win.document.write(`<html><head><title>Sales Report</title><style>body{font-family:system-ui,sans-serif;padding:24px;font-size:13px;color:#111}.header{text-align:center;border-bottom:3px solid #4f46e5;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:22px;margin:0;color:#4f46e5}table{border-collapse:collapse;width:100%;margin-bottom:24px}th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left}th{background:#4f46e5;color:white;font-size:11px}tr:nth-child(even){background:#f9fafb}.summary{background:#f3f4f6;border:2px solid #4f46e5;border-radius:8px;padding:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;text-align:center}.summary strong{display:block;font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:4px}.summary span{font-size:18px;font-weight:800}.footer{text-align:center;margin-top:32px;padding-top:16px;border-top:2px solid #e5e7eb;color:#999;font-size:11px}@media print{body{padding:16px}}</style></head><body><div class="header"><h1>${company}</h1></div><h2>Sales Performance Report</h2><table><thead><tr><th>Date</th><th>Product</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total Sale</th><th>Total Cost</th><th>Profit</th></tr></thead><tbody>${rows}</tbody></table><div class="summary"><div><strong>Items Sold</strong><span>${totals.qty} units</span></div><div><strong>Total Sales</strong><span>Rs ${totals.sales.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div><div><strong>Total Cost</strong><span>Rs ${totals.cost.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div><div><strong>Net Profit</strong><span style="color:${totals.profit>=0?'#059669':'#dc2626'}">Rs ${totals.profit.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div></div><div class="footer"><p>Generated by ${company} · ${new Date().toLocaleString()}</p></div><script>window.onload=()=>{setTimeout(()=>{window.print();},400);}<\/script></body></html>`);
    win.document.close();
  };

  // ── Exports view ─────────────────────────────────────────────────────────────
  if (viewMode === 'exports') {
    const cards = [
      { title: 'Products & Stock',    desc: 'Inventory, pricing, and stock levels', type: 'products',     icon: Package,   color: 'blue' },
      { title: 'Supplier Directory',  desc: 'All supplier details and contacts',    type: 'suppliers',    icon: Users,     color: 'orange' },
      { title: 'Transaction History', desc: 'All purchases, sales, and returns',    type: 'transactions', icon: Activity,  color: 'green' },
    ];
    const c = { blue: 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800', orange: 'bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800', green: 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
    return (
      <div className="page animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title flex items-center gap-2"><Download size={20} className="text-indigo-600" /> Data Exports</h1>
            <p className="page-subtitle">Export your data to CSV or PDF</p>
          </div>
          <button onClick={() => setViewMode('sales')} className="btn btn-secondary btn-sm"><BarChart2 size={14} /> Sales Report</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.type} className="card p-6 flex flex-col hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${c[card.color].split(' ').slice(0,2).join(' ')}`}>
                  <Icon size={20} className={c[card.color].split(' ').slice(2,4).join(' ')} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{card.title}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-5 flex-1">{card.desc}</p>
                <div className="flex gap-2">
                  <button onClick={() => downloadCSV(card.type)} className={`flex-1 btn btn-sm border ${c[card.color]}`}>
                    <FileSpreadsheet size={13} /> CSV
                  </button>
                  <button onClick={() => downloadPDF(card.type)} className="flex-1 btn btn-sm border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400">
                    <FileDown size={13} /> PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Sales report view ─────────────────────────────────────────────────────────
  const { items = [], summary = {} } = reportData || {};
  const isProfit = (summary.total_profit || 0) >= (summary.total_loss || 0);

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><Activity size={20} className="text-indigo-600" /> Sales Report</h1>
          <p className="page-subtitle">Itemized sales with cost and profit analysis</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowCustomerSearch(true)} className="btn btn-secondary btn-sm"><ShoppingBag size={14} /> Customer Report</button>
          <button onClick={handlePrint} className="btn btn-secondary btn-sm">
            <Printer size={14} /> {selectedIds.length > 0 ? `Print (${selectedIds.length})` : 'Print All'}
          </button>
          <button onClick={() => setViewMode('exports')} className="btn btn-secondary btn-sm"><Download size={14} /> Exports</button>
          <div className="flex items-center bg-white dark:bg-[#161b27] border border-gray-200 dark:border-slate-700 rounded-lg p-0.5">
            {TIMEFRAMES.map(tf => (
              <button key={tf.key} onClick={() => setTimeframe(tf.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${timeframe === tf.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Total Sales</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white tabular">Rs {Number(summary.total_sales||0).toLocaleString()}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Total Cost</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white tabular">Rs {Number(summary.total_cost||0).toLocaleString()}</p>
          </div>
          <div className={`rounded-xl border p-5 ${isProfit ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
            <p className={`text-xs font-medium mb-1 ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{isProfit ? 'Net Profit' : 'Net Loss'}</p>
            <p className={`text-xl font-bold tabular ${isProfit ? 'text-emerald-900 dark:text-emerald-300' : 'text-red-900 dark:text-red-300'}`}>
              Rs {Number(isProfit ? summary.total_profit : summary.total_loss||0).toLocaleString()}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Items Sold</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white tabular">{Number(summary.total_quantity||0).toLocaleString()} <span className="text-sm font-normal text-gray-400">units</span></p>
          </div>
        </div>
      )}

      {/* Grouped table */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <p className="section-title">Itemized Ledger</p>
            <span className="badge badge-blue">{items.length} records</span>
            <span className="badge badge-purple">{groupedByCustomer.length} customers</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpandedCustomers(new Set(groupedByCustomer.map(g => g.customer)))} className="btn btn-ghost btn-sm">Expand All</button>
            <button onClick={() => setExpandedCustomers(new Set())} className="btn btn-ghost btn-sm">Collapse All</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table whitespace-nowrap">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Customer / Product</th>
                <th>Category</th>
                <th>Date</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right bg-blue-50/50 dark:bg-blue-900/5">Total Sale</th>
                <th className="text-right bg-orange-50/50 dark:bg-orange-900/5">Total Cost</th>
                <th className="text-right bg-emerald-50/50 dark:bg-emerald-900/5">Profit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan="9" className="px-4 py-3"><div className="h-6 skeleton rounded" /></td></tr>)
              ) : groupedByCustomer.length === 0 ? (
                <tr><td colSpan="9">
                  <div className="empty-state">
                    <div className="empty-state-icon"><RefreshCcw size={18} className="text-gray-400" /></div>
                    <p className="empty-state-title">No sales data</p>
                    <p className="empty-state-desc">No transactions recorded for this period</p>
                  </div>
                </td></tr>
              ) : groupedByCustomer.map(group => {
                const isExpanded = expandedCustomers.has(group.customer);
                return (
                  <React.Fragment key={group.customer}>
                    {/* Customer row */}
                    <tr className="bg-indigo-50/40 dark:bg-indigo-900/10 hover:bg-indigo-50/70 dark:hover:bg-indigo-900/20 cursor-pointer border-t border-indigo-100 dark:border-indigo-900/30 transition-colors"
                      onClick={() => toggleCustomer(group.customer)}>
                      <td className="text-center px-3">
                        {isExpanded ? <ChevronDown size={14} className="text-indigo-500 mx-auto" /> : <ChevronRight size={14} className="text-indigo-400 mx-auto" />}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-md flex items-center justify-center flex-shrink-0">
                            <User size={12} className="text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">{group.customer}</span>
                          <span className="text-xs text-gray-400 dark:text-slate-500">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                      <td className="text-gray-400 text-xs">—</td>
                      <td className="text-gray-400 text-xs">—</td>
                      <td className="text-center font-semibold text-gray-800 dark:text-slate-200 tabular">{group.totalQty}</td>
                      <td className="text-gray-400 text-xs text-right">—</td>
                      <td className="text-right font-semibold text-blue-700 dark:text-blue-400 tabular bg-blue-50/30 dark:bg-blue-900/5">
                        Rs {Number(group.totalSale).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                      </td>
                      <td className="text-right font-semibold text-orange-700 dark:text-orange-400 tabular bg-orange-50/30 dark:bg-orange-900/5">
                        Rs {Number(group.totalCost).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                      </td>
                      <td className={`text-right font-semibold tabular bg-emerald-50/30 dark:bg-emerald-900/5 ${group.totalProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {group.totalProfit >= 0 ? '+' : ''}Rs {Number(group.totalProfit).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                      </td>
                    </tr>
                    {/* Child rows */}
                    {isExpanded && group.items.map((item, rowIdx) => {
                      const isSel = selectedIds.includes(item._idx);
                      return (
                        <tr key={item._idx} className={`border-t border-gray-50 dark:border-slate-800/60 transition-colors ${isSel ? 'bg-indigo-50/20 dark:bg-indigo-900/5' : rowIdx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-slate-800/20'}`}>
                          <td className="text-center pl-8">
                            <input type="checkbox" className="w-3.5 h-3.5 rounded text-indigo-600 border-gray-300 cursor-pointer"
                              checked={isSel}
                              onChange={() => setSelectedIds(prev => prev.includes(item._idx) ? prev.filter(id => id !== item._idx) : [...prev, item._idx])} />
                          </td>
                          <td className="font-medium text-gray-800 dark:text-slate-200 max-w-[200px] truncate pl-10">{item.product_name || '—'}</td>
                          <td><span className="badge badge-gray">{item.category || '—'}</span></td>
                          <td className="text-gray-500 dark:text-slate-400 tabular">{item.date ? fmtDateShort(item.date) : '—'}</td>
                          <td className="text-center font-medium tabular">{item.quantity}</td>
                          <td className="text-right tabular text-gray-600 dark:text-slate-300">Rs {Number(item.unit_sale_price||0).toFixed(2)}</td>
                          <td className="text-right tabular font-medium text-blue-700 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-900/5">Rs {Number(item.total_sale_price||0).toFixed(2)}</td>
                          <td className="text-right tabular text-orange-700 dark:text-orange-400 bg-orange-50/20 dark:bg-orange-900/5">Rs {Number(item.total_cost_price||0).toFixed(2)}</td>
                          <td className={`text-right tabular font-medium bg-emerald-50/20 dark:bg-emerald-900/5 ${item.profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {item.profit >= 0 ? '+' : ''}Rs {Number(item.profit||0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {selectedIds.length > 0 ? `${selectedIds.length} selected · ` : ''}{groupedByCustomer.length} customers · {items.length} records
          </p>
        </div>
      </div>

      <CustomerReportModal isOpen={showCustomerSearch} onClose={() => setShowCustomerSearch(false)} currentTimeframe={timeframe} />
    </div>
  );
}
