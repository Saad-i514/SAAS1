import React, { useState } from 'react';
import { X, Search, Printer, Download, Package } from 'lucide-react';
import api from '../services/api';

function CustomerReportModal({ isOpen, onClose }) {
  const [customerName, setCustomerName] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('customer'); // 'customer' or 'business'

  const searchCustomer = async () => {
    if (reportType === 'customer' && !customerName.trim()) {
      alert('Please enter a customer/shop name');
      return;
    }
    
    setLoading(true);
    try {
      let url = reportType === 'customer' 
        ? `/reports/customer-search?customer_name=${encodeURIComponent(customerName)}`
        : `/reports/sales-summary?timeframe=all`;
      
      const { data } = await api.get(url);
      
      // Filter by date range if provided
      if (data && (startDate || endDate)) {
        const start = startDate ? new Date(startDate) : new Date('1900-01-01');
        const end = endDate ? new Date(endDate) : new Date('2100-12-31');
        end.setHours(23, 59, 59, 999); // Include entire end date
        
        if (reportType === 'customer' && data.items) {
          data.items = data.items.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= start && itemDate <= end;
          });
          
          // Recalculate totals
          data.total_qty = data.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
          data.total_amount = data.items.reduce((sum, item) => sum + (item.total_amount || 0), 0);
          data.total_transactions = data.items.length;
          
          // Recalculate product summary
          const productMap = {};
          data.items.forEach(item => {
            const pname = item.product_name || 'Unknown';
            if (!productMap[pname]) {
              productMap[pname] = { qty: 0, amount: 0, transactions: 0, category: item.category };
            }
            productMap[pname].qty += item.quantity || 0;
            productMap[pname].amount += item.total_amount || 0;
            productMap[pname].transactions += 1;
          });
          data.product_summary = Object.keys(productMap).map(k => ({ product: k, ...productMap[k] }));
        } else if (reportType === 'business' && data.items) {
          data.items = data.items.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= start && itemDate <= end;
          });
          
          // Recalculate summary
          data.summary = {
            total_sales: data.items.reduce((sum, item) => sum + (item.total_sale_price || 0), 0),
            total_cost: data.items.reduce((sum, item) => sum + (item.total_cost_price || 0), 0),
            total_quantity: data.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
          };
          data.summary.total_profit = data.summary.total_sales - data.summary.total_cost;
        }
      }
      
      setReportData(data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      alert('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!reportData) {
      alert('No data to print');
      return;
    }

    const items = reportType === 'customer' ? reportData.items : reportData.items;
    if (!items || items.length === 0) {
      alert('No transactions to print');
      return;
    }

    // Prompt for company details
    const companyName = prompt('Enter Company Name:', 'AL-Fursan') || 'Company Name';
    const companyPhone = prompt('Enter Company Phone Number:', '+92 300 1234567') || '';

    const dateRangeText = startDate || endDate 
      ? `Period: ${startDate || 'Beginning'} to ${endDate || 'Present'}`
      : 'Period: All Time';

    if (reportType === 'business') {
      // Business-wide report
      const totals = items.reduce((acc, item) => ({
        qty: acc.qty + (item.quantity || 0),
        sales: acc.sales + (item.total_sale_price || 0),
        cost: acc.cost + (item.total_cost_price || 0),
        profit: acc.profit + (item.profit || 0),
      }), { qty: 0, sales: 0, cost: 0, profit: 0 });

      const rows = items.map(item => `
        <tr>
          <td>${item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
          <td>${item.customer_name || '-'}</td>
          <td>${item.product_name || '-'}</td>
          <td>${item.category || '-'}</td>
          <td style="text-align:center">${item.quantity || 0}</td>
          <td style="text-align:right">Rs ${(item.unit_sale_price || 0).toFixed(2)}</td>
          <td style="text-align:right; font-weight:bold; color:#059669">Rs ${(item.total_sale_price || 0).toFixed(2)}</td>
          <td style="text-align:right; color:#f59e0b">Rs ${(item.total_cost_price || 0).toFixed(2)}</td>
          <td style="text-align:right; font-weight:bold; color:${item.profit >= 0 ? '#059669' : '#dc2626'}">Rs ${(item.profit || 0).toFixed(2)}</td>
        </tr>
      `).join('');

      const win = window.open('', '_blank');
      win.document.write(`
        <html><head><title>Business Report - ${companyName}</title>
        <style>
          body { font-family: system-ui, sans-serif; color: #111; padding: 24px; font-size: 13px; }
          .header { text-align: center; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 24px; margin: 0 0 4px 0; color: #4f46e5; }
          .header .phone { font-size: 14px; color: #666; font-weight: 600; }
          h2 { font-size: 18px; margin: 20px 0 8px 0; color: #111; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
          .report-info { background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #4f46e5; }
          .report-info h3 { margin: 0 0 8px 0; font-size: 16px; color: #4f46e5; }
          .report-info .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 12px; }
          .report-info .stat { text-align: center; }
          .report-info .stat strong { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; }
          .report-info .stat span { display: block; font-size: 20px; font-weight: 800; color: #111; margin-top: 4px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 24px; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
          th { background: #4f46e5; color: white; font-weight: 600; font-size: 11px; }
          tr:nth-child(even) { background: #f9fafb; }
          .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 2px solid #e5e7eb; color: #999; font-size: 11px; }
          @media print { body { padding: 16px; } }
        </style></head><body>
        <div class="header">
          <h1>${companyName}</h1>
          ${companyPhone ? `<div class="phone">📞 ${companyPhone}</div>` : ''}
        </div>
        
        <div class="report-info">
          <h3>Business-Wide Sales Report</h3>
          <p style="margin: 8px 0; color: #666;">${dateRangeText}</p>
          <div class="stats">
            <div class="stat">
              <strong>Transactions</strong>
              <span>${items.length}</span>
            </div>
            <div class="stat">
              <strong>Total Quantity</strong>
              <span>${totals.qty} units</span>
            </div>
            <div class="stat">
              <strong>Total Sales</strong>
              <span style="color:#059669">Rs ${totals.sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="stat">
              <strong>Net Profit</strong>
              <span style="color:${totals.profit >= 0 ? '#059669' : '#dc2626'}">Rs ${totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <h2>Transaction Details</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total Sale</th>
              <th>Total Cost</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="footer">
          <p>This is a computer-generated report from ${companyName}</p>
          <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
        </body></html>
      `);
      win.document.close();
      return;
    }

    // Customer-specific report
    const rows = items.map(item => `
      <tr>
        <td>${item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
        <td>${item.type?.toUpperCase() || '-'}</td>
        <td>${item.product_name || '-'}</td>
        <td>${item.category || '-'}</td>
        <td style="text-align:center">${item.quantity || 0}</td>
        <td style="text-align:right">Rs ${(item.unit_price || 0).toFixed(2)}</td>
        <td style="text-align:right">Rs ${(item.discount || 0).toFixed(2)}</td>
        <td style="text-align:right; font-weight:bold">Rs ${(item.total_amount || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const productRows = reportData.product_summary.map(p => `
      <tr>
        <td>${p.product}</td>
        <td>${p.category || '-'}</td>
        <td style="text-align:center">${p.qty}</td>
        <td style="text-align:right; font-weight:bold">Rs ${p.amount.toFixed(2)}</td>
        <td style="text-align:center">${p.transactions}</td>
      </tr>
    `).join('');

    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Customer Report - ${reportData.customer_name}</title>
      <style>
        body { font-family: system-ui, sans-serif; color: #111; padding: 24px; font-size: 13px; }
        .header { text-align: center; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { font-size: 24px; margin: 0 0 4px 0; color: #4f46e5; }
        .header .phone { font-size: 14px; color: #666; font-weight: 600; }
        h2 { font-size: 18px; margin: 20px 0 8px 0; color: #111; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
        .customer-info { background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #4f46e5; }
        .customer-info h3 { margin: 0 0 8px 0; font-size: 16px; color: #4f46e5; }
        .customer-info .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 12px; }
        .customer-info .stat { text-align: center; }
        .customer-info .stat strong { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; }
        .customer-info .stat span { display: block; font-size: 20px; font-weight: 800; color: #111; margin-top: 4px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
        th { background: #4f46e5; color: white; font-weight: 600; font-size: 12px; }
        tr:nth-child(even) { background: #f9fafb; }
        .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 2px solid #e5e7eb; color: #999; font-size: 11px; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <div class="header">
        <h1>${companyName}</h1>
        ${companyPhone ? `<div class="phone">📞 ${companyPhone}</div>` : ''}
      </div>
      
      <div class="customer-info">
        <h3>Customer/Shop: ${reportData.customer_name}</h3>
        <p style="margin: 8px 0; color: #666;">${dateRangeText}</p>
        <div class="stats">
          <div class="stat">
            <strong>Total Transactions</strong>
            <span>${reportData.total_transactions}</span>
          </div>
          <div class="stat">
            <strong>Total Quantity</strong>
            <span>${reportData.total_qty} units</span>
          </div>
          <div class="stat">
            <strong>Total Amount</strong>
            <span>Rs ${reportData.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <h2>Transaction History</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Product</th>
            <th>Category</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Discount</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <h2>Product Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Total Qty</th>
            <th>Total Amount</th>
            <th>Transactions</th>
          </tr>
        </thead>
        <tbody>${productRows}</tbody>
      </table>

      <div class="footer">
        <p>This is a computer-generated report from ${companyName}</p>
        <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
      <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
      </body></html>
    `);
    win.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Customer/Shop Report</h2>
            <p className="text-sm text-gray-500 mt-0.5">Search and view transaction history by customer</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-100 space-y-4">
          {/* Report Type Selection */}
          <div className="flex space-x-3">
            <button
              onClick={() => setReportType('customer')}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                reportType === 'customer'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Specific Customer/Shop
            </button>
            <button
              onClick={() => setReportType('business')}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                reportType === 'business'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Entire Business
            </button>
          </div>

          {/* Customer Name Input (only for customer report) */}
          {reportType === 'customer' && (
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Enter customer/shop name..."
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchCustomer()}
              />
            </div>
          )}

          {/* Date Range Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Start Date</label>
              <input
                type="date"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">End Date</label>
              <input
                type="date"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={searchCustomer}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search size={16} />
            )}
            <span>{reportType === 'customer' ? 'Search Customer' : 'Generate Business Report'}</span>
          </button>
        </div>

        {/* Results */}
        {reportData && (
          <div className="p-6">
            {/* Summary */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 border border-indigo-100">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {reportType === 'customer' ? `Customer: ${reportData.customer_name}` : 'Business-Wide Report'}
              </h3>
              {(startDate || endDate) && (
                <p className="text-sm text-gray-600 mb-4">
                  Period: {startDate || 'Beginning'} to {endDate || 'Present'}
                </p>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase">Transactions</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    {reportType === 'customer' ? reportData.total_transactions : reportData.items?.length || 0}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Quantity</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    {reportType === 'customer' ? reportData.total_qty : reportData.summary?.total_quantity || 0}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase">
                    {reportType === 'customer' ? 'Total Amount' : 'Net Profit'}
                  </p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">
                    Rs {reportType === 'customer' 
                      ? reportData.total_amount?.toLocaleString() 
                      : (reportData.summary?.total_profit || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                >
                  <Printer size={16} />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            {/* Product Summary */}
            {reportType === 'customer' && reportData.product_summary && reportData.product_summary.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center space-x-2">
                  <Package size={16} className="text-indigo-600" />
                  <span>Product Summary</span>
                </h4>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-xs font-bold text-gray-500 uppercase">
                        <th className="px-4 py-3 text-left">Product</th>
                        <th className="px-4 py-3 text-left">Category</th>
                        <th className="px-4 py-3 text-center">Total Qty</th>
                        <th className="px-4 py-3 text-right">Total Amount</th>
                        <th className="px-4 py-3 text-center">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.product_summary.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900">{p.product}</td>
                          <td className="px-4 py-3 text-gray-600">{p.category || '-'}</td>
                          <td className="px-4 py-3 text-center font-bold text-gray-700">{p.qty}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">Rs {p.amount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{p.transactions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transaction History */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3">Transaction History</h4>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr className="text-xs font-bold text-gray-500 uppercase">
                      <th className="px-4 py-3 text-left">Date</th>
                      {reportType === 'business' && <th className="px-4 py-3 text-left">Customer</th>}
                      <th className="px-4 py-3 text-left">{reportType === 'customer' ? 'Type' : 'Product'}</th>
                      <th className="px-4 py-3 text-left">{reportType === 'customer' ? 'Product' : 'Category'}</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">{reportType === 'customer' ? 'Discount' : 'Sale'}</th>
                      <th className="px-4 py-3 text-right">{reportType === 'customer' ? 'Total' : 'Profit'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.items.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                            item.type === 'sale' ? 'bg-emerald-100 text-emerald-700' :
                            item.type === 'purchase' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {item.type?.toUpperCase() || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{item.product_name || '-'}</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-700">{item.quantity || 0}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-600">Rs {(item.unit_price || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-orange-600">Rs {(item.discount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">Rs {(item.total_amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!reportData && !loading && (
          <div className="p-12 text-center text-gray-400">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-semibold">Search for a customer to view their report</p>
            <p className="text-sm mt-1">Enter customer or shop name above</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerReportModal;
