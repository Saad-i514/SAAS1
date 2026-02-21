import React from 'react';
import { Download, FileText, FileSpreadsheet, Package, Users, Activity } from 'lucide-react';
import api from '../services/api';

function Reports() {
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

    const reportsList = [
        { title: 'Products & Stock Matrix', desc: 'Download complete inventory, pricing, and status.', type: 'products', icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Supplier Directory', desc: 'Download all supplier details and contact information.', type: 'suppliers', icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
        { title: 'Transaction History', desc: 'Detailed log of all purchases, sales, and reverses.', type: 'transactions', icon: Activity, color: 'text-green-600', bg: 'bg-green-100' }
    ];

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports Module</h1>
                    <p className="text-gray-500 mt-1">Export your data to CSV for further analysis</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {reportsList.map((report, idx) => {
                    const Icon = report.icon;
                    return (
                        <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all flex flex-col items-center text-center group">
                            <div className={`p-4 rounded-full ${report.bg} mb-4 group-hover:scale-110 transition-transform`}>
                                <Icon size={32} className={report.color} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">{report.title}</h3>
                            <p className="text-sm text-gray-500 mb-6 flex-1">{report.desc}</p>

                            <div className="w-full flex space-x-2">
                                <button
                                    onClick={() => downloadReport(report.type)}
                                    className="flex-1 flex justify-center items-center py-2 px-4 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 text-gray-700 hover:text-indigo-700 rounded-lg transition-colors font-medium text-sm"
                                >
                                    <FileSpreadsheet size={16} className="mr-2" />
                                    CSV
                                </button>
                                {/* Mock buttons for PDF/EXCEL visual completeness */}
                                <button disabled className="flex-1 flex justify-center items-center py-2 px-4 bg-gray-50 border border-gray-200 text-gray-400 rounded-lg cursor-not-allowed text-sm">
                                    <FileText size={16} className="mr-2" />
                                    PDF
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Reports;
