import React, { useState, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, Package, Users, Activity, CalendarClock, TrendingUp, TrendingDown, RefreshCcw, Printer, FileDown } from 'lucide-react';
import api from '../services/api';

function Reports() {
    const [timeframe, setTimeframe] = useState('daily');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('sales'); // 'sales' or 'exports'

    useEffect(() => {
        if (viewMode === 'sales') {
            fetchReportData();
        }
    }, [timeframe, viewMode]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/reports/sales-summary?timeframe=${timeframe}`);
            setReportData(data);
        } catch (err) {
            console.error("Failed to fetch report data", err);
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = async (type) => {
        try {
            const response = await api.get(`/reports/csv/${type}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_report.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error(err);
            alert('Failed to download report');
        }
    };

    const downloadPdfReport = async (type) => {
        try {
            // Dynamically import jsPDF to avoid initial load bloat
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            
            const doc = new jsPDF();
            const dateStr = new Date().toLocaleDateString();
            
            let data = [];
            let endpoint = '';
            let title = '';
            let columns = [];
            let rows = [];
            let summary = null;

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
            data = endpoint.includes('sales-summary') ? response.data.items : response.data;
            
            if (!data || data.length === 0) {
                alert('No data available for this report.');
                return;
            }

            // Format title
            doc.setFontSize(18);
            doc.text(title, 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

            if (type === 'products') {
                columns = ['Article No', 'Name', 'Category', 'Status', 'In-Hand Qty', 'Purchase Price', 'Sale Price'];
                let totalStock = 0;
                let totalValue = 0;
                rows = data.map(p => {
                    totalStock += (p.in_hand_qty || 0);
                    totalValue += (p.in_hand_qty || 0) * (p.product_price || 0);
                    return [
                        p.article_no || '-',
                        p.name || '-',
                        p.category || 'Uncategorized',
                        p.status || '-',
                        (p.in_hand_qty || 0).toString(),
                        `$${(p.product_price || 0).toFixed(2)}`,
                        `$${(p.sale_price || 0).toFixed(2)}`
                    ];
                });
                summary = `Total Products Ranked: ${data.length} | Global Stock: ${totalStock} units | Est. Inventory Cost Value: $${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
            } else if (type === 'suppliers') {
                columns = ['Supplier No', 'Name', 'Email', 'Phone', 'Status'];
                let activeCount = data.filter(s => s.status === 'Active').length;
                rows = data.map(s => [
                    s.supplier_no || '-',
                    s.name || '-',
                    s.email || '-',
                    s.phone || '-',
                    s.status || '-'
                ]);
                summary = `Total Regional Suppliers: ${data.length} | Active: ${activeCount} | Inactive: ${data.length - activeCount}`;
            } else if (type === 'transactions') {
                columns = ['Date', 'Type', 'Product', 'Qty', 'Unit Price', 'Total Amount', 'Order No'];
                let totalQty = 0, totalSales = 0, totalPurchases = 0;
                rows = data.map(t => {
                    totalQty += (t.quantity || 0);
                    const amount = (t.debit || 0);
                    if (t.type === 'sale') totalSales += amount;
                    else if (t.type === 'purchase') totalPurchases += amount;
                    
                    return [
                        new Date(t.date).toLocaleDateString(),
                        (t.type || '-').toUpperCase(),
                        t.product_name || '-',
                        (t.quantity || 0).toString(),
                        `$${(t.unit_price || 0).toFixed(2)}`,
                        `$${amount.toFixed(2)}`,
                        t.order_no || '-'
                    ];
                });
                summary = `Transactions Exported: ${data.length} | Total Items Moved: ${totalQty}\nTotal Sales Revenue: $${totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})} | Total Purchase Costs: $${totalPurchases.toLocaleString(undefined, {minimumFractionDigits: 2})}\nNet Flow: $${(totalSales - totalPurchases).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
            }

            autoTable(doc, {
                startY: 36,
                head: [columns],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] },
                margin: { top: 36 }
            });

            const finalY = doc.lastAutoTable.finalY + 15;
            
            // Add Summary Background Box
            doc.setFillColor(245, 245, 245);
            doc.rect(14, finalY - 5, 182, 30, 'F');
            
            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.setFont("helvetica", "bold");
            doc.text("Report Analytics Summary", 18, finalY + 2);
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80);
            
            // Split summary by newlines
            const summaryLines = summary.split('\n');
            let currentY = finalY + 9;
            summaryLines.forEach(line => {
                doc.text(line, 18, currentY);
                currentY += 6;
            });

            doc.save(`${type}_report_${dateStr.replace(/\//g, '-')}.pdf`);
            
        } catch (err) {
            console.error(err);
            alert('Failed to generate PDF report. Check console for details.');
        }
    };

    const reportsList = [
        { title: 'Products & Stock Matrix', desc: 'Download complete inventory, pricing, and status.', type: 'products', icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Supplier Directory', desc: 'Download all supplier details and contact information.', type: 'suppliers', icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
        { title: 'Transaction History', desc: 'Detailed log of all purchases, sales, and reverses.', type: 'transactions', icon: Activity, color: 'text-green-600', bg: 'bg-green-100' }
    ];

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [selectedItemIds, setSelectedItemIds] = useState([]);

    // Reset pagination and selection when timeframe changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedItemIds([]);
    }, [timeframe]);

    if (viewMode === 'exports') {
        return (
            <div className="space-y-6 max-w-5xl animate-fade-in">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
                            <Download className="mr-3 text-primary" size={28} />
                            Data Exports
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Export your data to CSV for further analysis</p>
                    </div>
                    <button
                        onClick={() => setViewMode('sales')}
                        className="bg-white hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl border border-gray-200 transition-all text-sm font-semibold shadow-sm"
                    >
                        View Interactive Sales Report
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {reportsList.map((report, idx) => {
                        const Icon = report.icon;
                        return (
                            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-lg transition-all flex flex-col items-center text-center group transform hover:-translate-y-1">
                                <div className={`p-5 rounded-2xl ${report.bg} mb-5 group-hover:scale-110 transition-transform shadow-sm`}>
                                    <Icon size={36} className={report.color} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{report.title}</h3>
                                <p className="text-sm text-gray-500 mb-8 flex-1 leading-relaxed">{report.desc}</p>

                                <div className="w-full flex space-x-2 mt-4">
                                    <button
                                        onClick={() => downloadReport(report.type)}
                                        className="flex-1 flex justify-center items-center py-2 px-2 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 text-gray-700 hover:text-indigo-700 rounded-lg transition-colors font-semibold text-xs shadow-sm group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white"
                                    >
                                        <FileSpreadsheet size={14} className="mr-1.5" />
                                        CSV Export
                                    </button>
                                    <button
                                        onClick={() => downloadPdfReport(report.type)}
                                        className="flex-1 flex justify-center items-center py-2 px-2 bg-gray-50 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 text-gray-700 hover:text-rose-700 rounded-lg transition-colors font-semibold text-xs shadow-sm group-hover:bg-rose-600 group-hover:border-rose-600 group-hover:text-white"
                                    >
                                        <FileDown size={14} className="mr-1.5" />
                                        PDF Export
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Interactive Sales Report View
    const { items = [], summary = {} } = reportData || {};
    const isProfit = (summary.total_profit || 0) >= (summary.total_loss || 0);

    const totalPages = Math.ceil(items.length / itemsPerPage);
    const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedItemIds(items.map((_, i) => i));
        else setSelectedItemIds([]);
    };

    const handleSelectRow = (i) => {
        if (selectedItemIds.includes(i)) setSelectedItemIds(selectedItemIds.filter(id => id !== i));
        else setSelectedItemIds([...selectedItemIds, i]);
    };

    const handlePrint = () => {
        const itemsToPrint = selectedItemIds.length > 0 
            ? items.filter((_, i) => selectedItemIds.includes(i)) 
            : items;
            
        if (itemsToPrint.length === 0) {
            alert("No items to print.");
            return;
        }

        const printSummary = itemsToPrint.reduce((acc, item) => {
            acc.qty += item.quantity || 0;
            acc.sales += item.total_sale_price || 0;
            acc.cost += item.total_cost_price || 0;
            acc.profit += item.profit || 0;
            return acc;
        }, { qty: 0, sales: 0, cost: 0, profit: 0 });

        const rowsHTML = itemsToPrint.map(item => {
            const dateStr = new Date(item.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return "<tr>" +
                "<td>" + dateStr + "</td>" +
                "<td>" + (item.product_name || '-') + "</td>" +
                "<td>" + (item.category || '-') + "</td>" +
                "<td class='text-center'>" + (item.quantity || 0) + "</td>" +
                "<td class='text-right'>$" + (item.unit_sale_price || 0).toFixed(2) + "</td>" +
                "<td class='text-right'>$" + (item.total_sale_price || 0).toFixed(2) + "</td>" +
                "<td class='text-right'>$" + (item.total_cost_price || 0).toFixed(2) + "</td>" +
                "<td class='text-right'>$" + (item.profit || 0).toFixed(2) + "</td>" +
            "</tr>";
        }).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Sales Performance Report</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; color: #333; padding: 20px; }
                    h1 { color: #111; margin-bottom: 5px; }
                    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
                    th { background-color: #f8f9fa; color: #444; font-weight: bold; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .summary-box { border: 2px solid #333; padding: 15px; border-radius: 8px; page-break-inside: avoid; }
                    .summary-box h3 { margin-top: 0; margin-bottom: 15px; text-transform: uppercase; font-size: 14px; color: #444; }
                    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
                    .summary-item strong { display: block; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
                    .summary-item span { font-size: 18px; font-weight: bold; color: #111; }
                    @media print {
                        body { padding: 0; margin: 0; }
                    }
                </style>
            </head>
            <body>
                <h1>Sales Performance Report</h1>
                <div class="meta">Printed on: ${new Date().toLocaleString()} | Items Included: ${itemsToPrint.length}</div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th class="text-center">Qty</th>
                            <th class="text-right">Unit Price</th>
                            <th class="text-right">Total Sale</th>
                            <th class="text-right">Total Cost</th>
                            <th class="text-right">Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>

                <div class="summary-box">
                    <h3>Report Summary (Based on Printed Items)</h3>
                    <div class="summary-grid">
                        <div class="summary-item"><strong>Total Items Sold</strong><span>${printSummary.qty} units</span></div>
                        <div class="summary-item"><strong>Total Sales Revenue</strong><span>$${printSummary.sales.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                        <div class="summary-item"><strong>Total Cost Value</strong><span>$${printSummary.cost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                        <div class="summary-item"><strong>Net Profit</strong><span>$${printSummary.profit.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    </div>
                </div>
                
                <script>
                    window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 200); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-fade-in relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
                        <Activity className="mr-3 text-primary" size={28} />
                        Sales Performance Report
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Granular view of itemized sales, cost, and profit margins.</p>
                </div>
                
                <div className="flex space-x-3 w-full md:w-auto">
                    <button
                        onClick={handlePrint}
                        className="flex-1 md:flex-none justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl border border-indigo-200 transition-all text-sm font-semibold shadow-sm flex items-center"
                    >
                        <Printer size={16} className="mr-2" />
                        {selectedItemIds.length > 0 ? `Print Selected (${selectedItemIds.length})` : 'Print All'}
                    </button>
                    <button
                        onClick={() => setViewMode('exports')}
                        className="flex-1 md:flex-none justify-center bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 transition-all text-sm font-semibold shadow-sm flex items-center"
                    >
                        <Download size={16} className="mr-2" />
                        Exports
                    </button>
                    <div className="flex items-center space-x-2 bg-gray-50/80 p-1.5 rounded-xl border border-gray-200 shadow-inner flex-1 md:flex-none overflow-x-auto hide-scrollbar">
                        <CalendarClock className="text-primary ml-2 hidden sm:block flex-shrink-0" size={18} />
                        {['daily', 'weekly', 'monthly', 'yearly'].map(tf => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all duration-200 outline-none whitespace-nowrap ${
                                    timeframe === tf 
                                    ? 'bg-white text-primary shadow border border-gray-200 transform scale-105' 
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                 <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            ) : (
                <>
                    {/* Header Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <p className="text-sm font-semibold text-gray-500 mb-1">Total Sales Revenue</p>
                            <h3 className="text-2xl font-bold text-gray-900">${summary.total_sales?.toLocaleString() || 0}</h3>
                            <div className="absolute top-4 right-4 text-blue-100 group-hover:text-blue-50 transition-colors">
                                <FileText size={48} />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <p className="text-sm font-semibold text-gray-500 mb-1">Total Cost Value</p>
                            <h3 className="text-2xl font-bold text-gray-900">${summary.total_cost?.toLocaleString() || 0}</h3>
                            <div className="absolute top-4 right-4 text-orange-100 group-hover:text-orange-50 transition-colors">
                                <Package size={48} />
                            </div>
                        </div>
                        <div className={`p-5 rounded-2xl border ${isProfit ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'} shadow-sm relative overflow-hidden`}>
                            <p className={`text-sm font-semibold mb-1 ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>{isProfit ? 'Total Net Profit' : 'Total Net Loss'}</p>
                            <h3 className={`text-2xl font-bold ${isProfit ? 'text-emerald-900' : 'text-rose-900'}`}>
                                ${isProfit ? summary.total_profit?.toLocaleString() : summary.total_loss?.toLocaleString()}
                            </h3>
                            <div className={`absolute top-4 right-4 ${isProfit ? 'text-emerald-200' : 'text-rose-200'}`}>
                                {isProfit ? <TrendingUp size={48} /> : <TrendingDown size={48} />}
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <p className="text-sm font-semibold text-gray-500 mb-1">Items Sold</p>
                            <h3 className="text-2xl font-bold text-gray-900">{summary.total_quantity?.toLocaleString() || 0} <span className="text-sm font-medium text-gray-400">units</span></h3>
                            <div className="absolute top-4 right-4 text-indigo-100 group-hover:text-indigo-50 transition-colors">
                                <Activity size={48} />
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 text-lg">Itemized Ledger</h3>
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">{items.length} Records</span>
                        </div>
                        <div className="overflow-x-auto min-h-[300px]">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr className="bg-white text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                                        <th className="px-4 py-4 w-12 text-center">
                                            <input 
                                                type="checkbox" 
                                                onChange={handleSelectAll} 
                                                checked={items.length > 0 && selectedItemIds.length === items.length}
                                                className="w-4 h-4 rounded text-primary focus:ring-primary w-full cursor-pointer" 
                                            />
                                        </th>
                                        <th className="px-6 py-4">Date & Time</th>
                                        <th className="px-6 py-4">Product Name</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4 text-center">Qty</th>
                                        <th className="px-6 py-4 text-right">Unit Price</th>
                                        <th className="px-6 py-4 text-right bg-blue-50/30">Total Sale</th>
                                        <th className="px-6 py-4 text-right bg-orange-50/30">Total Cost</th>
                                        <th className="px-6 py-4 text-right bg-emerald-50/30">Profit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm">
                                    {paginatedItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="px-6 py-16 text-center text-gray-500">
                                                <RefreshCcw size={40} className="mx-auto text-gray-300 mb-3" />
                                                <p className="font-medium text-lg text-gray-800">No Sales Data</p>
                                                <p>There are no transactions recorded for this period.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedItems.map((item, i) => {
                                            const globalIndex = items.indexOf(item);
                                            return (
                                                <tr key={globalIndex} className={`hover:bg-gray-50/80 transition-colors group ${selectedItemIds.includes(globalIndex) ? 'bg-indigo-50/30' : ''}`}>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedItemIds.includes(globalIndex)} 
                                                            onChange={() => handleSelectRow(globalIndex)}
                                                            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer w-full mx-auto" 
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3.5 text-gray-500 font-medium">{new Date(item.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="px-6 py-3.5 font-bold text-gray-900">{item.product_name}</td>
                                                    <td className="px-6 py-3.5"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-semibold">{item.category}</span></td>
                                                    <td className="px-6 py-3.5 text-center font-bold text-gray-700">{item.quantity}</td>
                                                    <td className="px-6 py-3.5 text-right font-mono text-gray-600">${item.unit_sale_price?.toFixed(2)}</td>
                                                    <td className="px-6 py-3.5 text-right font-mono font-bold text-blue-700 bg-blue-50/20 group-hover:bg-blue-50/50">${item.total_sale_price?.toFixed(2)}</td>
                                                    <td className="px-6 py-3.5 text-right font-mono font-medium text-orange-700 bg-orange-50/20 group-hover:bg-orange-50/50">${item.total_cost_price?.toFixed(2)}</td>
                                                    <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20 group-hover:bg-emerald-50/50">
                                                        {item.profit >= 0 ? '+' : ''}{item.profit?.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                {items.length > 0 && (
                                    <tfoot className="bg-gray-50/80 border-t-2 border-gray-200 text-sm font-bold">
                                        <tr>
                                            <td className="px-4 py-4"></td>
                                            <td colSpan="3" className="px-6 py-4 text-right text-gray-700 uppercase tracking-wider text-xs">Period Totals:</td>
                                            <td className="px-6 py-4 text-center text-gray-900">{summary.total_quantity}</td>
                                            <td className="px-6 py-4"></td>
                                            <td className="px-6 py-4 text-right font-mono text-blue-700">${summary.total_sales?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            <td className="px-6 py-4 text-right font-mono text-orange-700">${summary.total_cost?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            <td className="px-6 py-4 text-right font-mono text-emerald-700">${(summary.total_profit - summary.total_loss)?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 font-medium">
                            <span>Showing {paginatedItems.length} of {items.length} records</span>
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
                </>
            )}
        </div>
    );
}

export default Reports;
