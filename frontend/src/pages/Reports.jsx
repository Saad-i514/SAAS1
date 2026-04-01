import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, FileSpreadsheet, Package, Users, Activity,
  RefreshCcw, Printer, FileDown,
  BarChart2, ShoppingBag
} from 'lucide-react';
import api from '../services/api';
import CustomerReportModal from '../components/CustomerReportModal';

const TIMEFRAMES = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: '7 Days' },
  { key: 'monthly', label: '30 Days' },
  { key: 'yearly', label: '1 Year' },
];

function Reports() {
  const [timeframe, setTimeframe] = useState('monthly');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('sales');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const itemsPerPage = 25;

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/sales-summary?timeframe=${timeframe}`);
      setReportData(data);
      setSelectedIds([]);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch report data', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    if (viewMode === 'sales') fetchReportData();
  }, [timeframe, viewMode, fetchReportData]);

  const downloadCSV = async (type) => {
    try {
      const response = await api.get(`/reports/csv/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download CSV:', err);
      alert('Failed to download CSV report');
    }
  };

  const downloadPDF = async (type) => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      let endpoint = '';
      let title = '';
      let columns = [];
      let rows = [];
      let summaryText = '';

      if (type === 'products') {
        endpoint = '/products/';
        title = 'Products Inventory Report';
      } else if (type === 'suppliers') {
        endpoint = '/suppliers/';
        title = 'Suppliers Directory Report';
      } else if (type === 'transactions') {
        endpoint = '/transactions/';
        title = 'Transaction History Report';
      }

      const response = await api.get(endpoint);
      const data = response.data;

      if (!data || data.length === 0) {
        alert('No data available for this report.');
        return;
      }

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 22);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.setTextColor(0);

      if (type === 'products') {
        columns = ['SKU', 'Name', 'Category', 'Status', 'Stock', 'Purchase $', 'Sale $', 'Margin'];
        let totalStock = 0, totalValue = 0;
        rows = data.map(p => {
          totalStock += p.in_hand_qty || 0;
          totalValue += (p.in_hand_qty || 0) * (p.product_price || 0);
          const margin = p.product_price > 0 ? (((p.sale_price - p.product_price) / p.product_price) * 100).toFixed(1) + '%' : '-';
          return [p.article_no, p.name, p.category || 'Uncategorized', p.status, p.in_hand_qty || 0, `$${(p.product_price || 0).toFixed(2)}`, `$${(p.sale_price || 0).toFixed(2)}`, margin];
        });
        summaryText = `Total: ${data.length} products | Stock: ${totalStock} units | Inventory Value: $${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      } else if (type === 'suppliers') {
        columns = ['Supplier No', 'Name', 'Email', 'Phone', 'Status'];
        const active = data.filter(s => s.status === 'Active').length;
        rows = data.map(s => [s.supplier_no, s.name, s.email || '-', s.phone || '-', s.status]);
        summaryText = `Total: ${data.length} suppliers | Active: ${active} | Inactive: ${data.length - active}`;
      } else if (type === 'transactions') {
        columns = ['Date', 'Type', 'Product', 'Qty', 'Unit Price', 'Discount', 'Net Amount', 'Order No'];
        let totalQty = 0, totalSales = 0, totalPurchases = 0;
        rows = data.map(t => {
          totalQty += t.quantity || 0;
          const amount = t.debit || 0; // stored net amount, already discount-adjusted
          if (t.type === 'sale') totalSales += amount;
          else if (t.type === 'purchase') totalPurchases += amount;
          return [
            t.date ? new Date(t.date).toLocaleDateString() : '-',
            (t.type || '-').toUpperCase(),
            t.product_name || '-',
            t.quantity || 0,
            `${(t.unit_price || 0).toFixed(2)}`,
            `${(t.discount || 0).toFixed(2)}`,
            `${amount.toFixed(2)}`,
            t.order_no || '-'
          ];
        });
        summaryText = `Transactions: ${data.length} | Items: ${totalQty} | Sales: ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })} | Purchases: ${totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      }

      autoTable(doc, {
        startY: 36,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 36 },
      });

      const finalY = doc.lastAutoTable.finalY + 12;
      doc.setFillColor(248, 250, 252);
      doc.rect(14, finalY - 4, 182, 16, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Summary: ', 18, finalY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      doc.text(summaryText, 42, finalY + 5);

      doc.save(`${type}_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Check console for details.');
    }
  };

  const handlePrint = () => {
      const items = reportData?.items || [];
      const itemsToPrint = selectedIds.length > 0 ? items.filter((_, i) => selectedIds.includes(i)) : items;
      if (itemsToPrint.length === 0) { alert('No items to print.'); return; }

      // Prompt for company details
      const companyName = prompt('Enter Company Name:', 'AL-Fursan') || 'Company Name';
      const companyPhone = prompt('Enter Company Phone Number:', '+92 300 1234567') || '';

      const totals = itemsToPrint.reduce((acc, item) => ({
        qty: acc.qty + (item.quantity || 0),
        sales: acc.sales + (item.total_sale_price || 0),
        cost: acc.cost + (item.total_cost_price || 0),
        profit: acc.profit + (item.profit || 0),
      }), { qty: 0, sales: 0, cost: 0, profit: 0 });

      const rows = itemsToPrint.map(item => `
        <tr>
          <td>${item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
          <td>${item.product_name || '-'}</td>
          <td>${item.category || '-'}</td>
          <td style="text-align:center">${item.quantity || 0}</td>
          <td style="text-align:right">Rs ${(item.unit_sale_price || 0).toFixed(2)}</td>
          <td style="text-align:right">Rs ${(item.total_sale_price || 0).toFixed(2)}</td>
          <td style="text-align:right">Rs ${(item.total_cost_price || 0).toFixed(2)}</td>
          <td style="text-align:right; color:${item.profit >= 0 ? '#059669' : '#dc2626'}">Rs ${(item.profit || 0).toFixed(2)}</td>
        </tr>
      `).join('');

      const win = window.open('', '_blank');
      win.document.write(`
        <html><head><title>Sales Report - ${companyName}</title>
        <style>
          body { font-family: system-ui, sans-serif; color: #111; padding: 24px; font-size: 13px; }
          .header { text-align: center; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 24px; margin: 0 0 4px 0; color: #4f46e5; }
          .header .phone { font-size: 14px; color: #666; font-weight: 600; }
          h2 { font-size: 18px; margin: 20px 0 8px 0; color: #111; }
          .meta { color: #666; font-size: 12px; margin-bottom: 20px; background: #f9fafb; padding: 12px; border-radius: 8px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
          th { background: #4f46e5; color: white; font-weight: 600; font-size: 12px; }
          tr:nth-child(even) { background: #f9fafb; }
          .summary { background: #f3f4f6; border: 2px solid #4f46e5; border-radius: 8px; padding: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
          .summary-item strong { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
          .summary-item span { font-size: 18px; font-weight: 800; color: #111; }
          .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 2px solid #e5e7eb; color: #999; font-size: 11px; }
          @media print { body { padding: 16px; } }
        </style></head><body>
        <div class="header">
          <h1>${companyName}</h1>
          ${companyPhone ? `<div class="phone">📞 ${companyPhone}</div>` : ''}
        </div>
        <h2>Sales Performance Report</h2>
        <div class="meta">
          <strong>Generated:</strong> ${new Date().toLocaleString()} | 
          <strong>Items:</strong> ${itemsToPrint.length} | 
          <strong>Period:</strong> ${timeframe}
        </div>
        <table>
          <thead><tr><th>Date</th><th>Product</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total Sale</th><th>Total Cost</th><th>Profit</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="summary">
          <div class="summary-item"><strong>Items Sold</strong><span>${totals.qty} units</span></div>
          <div class="summary-item"><strong>Total Sales</strong><span>Rs ${totals.sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div class="summary-item"><strong>Total Cost</strong><span>Rs ${totals.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div class="summary-item"><strong>Net Profit</strong><span style="color:${totals.profit >= 0 ? '#059669' : '#dc2626'}">Rs ${totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        </div>
        <div class="footer">
          <p>This is a computer-generated report from ${companyName}</p>
          <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
        </body></html>
      `);
      win.document.close();
    }

  const exportCards = [
    { title: 'Products & Stock', desc: 'Inventory, pricing, and stock levels', type: 'products', icon: Package, color: 'blue' },
    { title: 'Supplier Directory', desc: 'All supplier details and contacts', type: 'suppliers', icon: Users, color: 'orange' },
    { title: 'Transaction History', desc: 'All purchases, sales, and returns', type: 'transactions', icon: Activity, color: 'green' },
  ];

  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200' },
  };

  if (viewMode === 'exports') {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 flex items-center space-x-2">
              <Download size={22} className="text-indigo-600" />
              <span>Data Exports</span>
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Export your data to CSV or PDF</p>
          </div>
          <button onClick={() => setViewMode('sales')} className="flex items-center justify-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-3 sm:py-2.5 rounded-xl border border-gray-200 font-semibold text-sm transition-all shadow-sm">
            <BarChart2 size={16} />
            <span>Sales Report</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {exportCards.map((card) => {
            const Icon = card.icon;
            const c = colorMap[card.color];
            return (
              <div key={card.type} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-all group">
                <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={24} className={c.icon} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">{card.title}</h3>
                <p className="text-sm text-gray-500 mb-6 flex-1">{card.desc}</p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => downloadCSV(card.type)}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${c.bg} ${c.icon} ${c.border} hover:opacity-80`}
                  >
                    <FileSpreadsheet size={14} />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => downloadPDF(card.type)}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold border border-red-200 bg-red-50 text-red-600 hover:opacity-80 transition-all"
                  >
                    <FileDown size={14} />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Sales Report View
  const { items = [], summary = {} } = reportData || {};
  const isProfit = (summary.total_profit || 0) >= (summary.total_loss || 0);
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginated = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center space-x-2">
            <Activity size={22} className="text-indigo-600" />
            <span>Sales Report</span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Itemized sales with cost and profit analysis</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowCustomerSearch(true)} className="flex items-center justify-center space-x-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2.5 sm:py-2 rounded-xl border border-purple-200 font-semibold text-sm transition-all">
            <ShoppingBag size={15} />
            <span className="hidden sm:inline">Customer Report</span>
          </button>
          <button onClick={handlePrint} className="flex items-center justify-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 sm:py-2 rounded-xl border border-indigo-200 font-semibold text-sm transition-all">
            <Printer size={15} />
            <span className="hidden sm:inline">{selectedIds.length > 0 ? `Print (${selectedIds.length})` : 'Print All'}</span>
            <span className="sm:hidden">Print</span>
          </button>
          <button onClick={() => setViewMode('exports')} className="flex items-center justify-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 sm:py-2 rounded-xl border border-gray-200 font-semibold text-sm transition-all shadow-sm">
            <Download size={15} />
            <span className="hidden sm:inline">Exports</span>
            <span className="sm:hidden">Export</span>
          </button>
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.key}
                onClick={() => setTimeframe(tf.key)}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeframe === tf.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="hidden sm:inline">{tf.label}</span>
                <span className="sm:hidden">{tf.key === 'daily' ? 'Day' : tf.key === 'weekly' ? '7D' : tf.key === 'monthly' ? '30D' : 'Year'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Total Sales</p>
            <p className="text-2xl font-black text-gray-900">Rs {Number(summary.total_sales || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Total Cost</p>
            <p className="text-2xl font-black text-gray-900">Rs {Number(summary.total_cost || 0).toLocaleString()}</p>
          </div>
          <div className={`rounded-2xl border shadow-sm p-5 ${isProfit ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
              {isProfit ? 'Net Profit' : 'Net Loss'}
            </p>
            <p className={`text-2xl font-black ${isProfit ? 'text-emerald-900' : 'text-red-900'}`}>
              Rs {Number(isProfit ? summary.total_profit : summary.total_loss || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Items Sold</p>
            <p className="text-2xl font-black text-gray-900">{Number(summary.total_quantity || 0).toLocaleString()} <span className="text-sm font-medium text-gray-400">units</span></p>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Itemized Ledger</h3>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{items.length} records</span>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs sm:text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={e => setSelectedIds(e.target.checked ? items.map((_, i) => i) : [])}
                  />
                </th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right bg-blue-50/50">Total Sale</th>
                <th className="px-4 py-3 text-right bg-orange-50/50">Total Cost</th>
                <th className="px-4 py-3 text-right bg-emerald-50/50">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="10" className="px-4 py-4">
                      <div className="h-6 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-16 text-center">
                    <RefreshCcw size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-bold text-gray-700">No Sales Data</p>
                    <p className="text-gray-400 text-sm mt-1">No transactions recorded for this period.</p>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => {
                  const globalIdx = items.indexOf(item);
                  const isSelected = selectedIds.includes(globalIdx);
                  return (
                    <tr key={globalIdx} className={`hover:bg-gray-50/60 transition-colors group ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                          checked={isSelected}
                          onChange={() => setSelectedIds(prev =>
                            prev.includes(globalIdx) ? prev.filter(id => id !== globalIdx) : [...prev, globalIdx]
                          )}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-medium">
                        {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 max-w-[180px] truncate">{item.product_name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs font-semibold">{item.category || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{item.customer_name || '-'}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">Rs {Number(item.unit_sale_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-700 bg-blue-50/20">Rs {Number(item.total_sale_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-orange-700 bg-orange-50/20">Rs {Number(item.total_cost_price || 0).toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold bg-emerald-50/20 ${item.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {item.profit >= 0 ? '+' : ''}Rs {Number(item.profit || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>
            {selectedIds.length > 0 ? `${selectedIds.length} selected · ` : ''}
            {paginated.length} of {items.length} records
          </span>
          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Prev</button>
              <span className="px-3 py-1.5 font-bold text-gray-700">{currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Next</button>
            </div>
          )}
        </div>
      </div>
      <CustomerReportModal 
        isOpen={showCustomerSearch} 
        onClose={() => setShowCustomerSearch(false)} 
        currentTimeframe={timeframe}
      />
    </div>
  );
}

export default Reports;
