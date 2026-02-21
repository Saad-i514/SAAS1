import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';
import { DollarSign, ShoppingCart, Users, Package } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'];

function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [charts, setCharts] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [summaryRes, chartsRes] = await Promise.all([
                    api.get('/dashboard/summary'),
                    api.get('/dashboard/charts')
                ]);
                setSummary(summaryRes.data);
                setCharts(chartsRes.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) return <div className="flex justify-center items-center h-full">Loading...</div>;

    const summaryCards = [
        { title: 'Total Sales', value: `$${summary?.sales_amount?.toLocaleString() || 0}`, icon: DollarSign, color: 'bg-green-500' },
        { title: 'Stock Value', value: `$${summary?.stock_value?.toLocaleString() || 0}`, icon: Package, color: 'bg-blue-500' },
        { title: 'Suppliers', value: summary?.supplier_count || 0, icon: Users, color: 'bg-orange-500' },
        { title: 'Total Products', value: summary?.product_count || 0, icon: ShoppingCart, color: 'bg-purple-500' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h1>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-medium text-gray-600">System Online</span>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
                                </div>
                                <div className={`p-3 rounded-lg ${card.color} bg-opacity-10`}>
                                    <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Revenue vs Purchases (Monthly)</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts?.monthly_sales || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Legend iconType="circle" />
                                <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} name="Sales ($)" />
                                <Bar dataKey="purchases" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Purchases ($)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Sales Distribution</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={charts?.sales_distribution || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={false}
                                >
                                    {charts?.sales_distribution?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Legend iconType="circle" verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Financial Details Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <h3 className="text-lg font-medium opacity-90 mb-1">Total Receivables</h3>
                    <p className="text-4xl font-bold tracking-tight">${summary?.debit_summary?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                    <div className="absolute bottom-0 right-0 -mb-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <h3 className="text-lg font-medium opacity-90 mb-1">Total Payables</h3>
                    <p className="text-4xl font-bold tracking-tight">${summary?.credit_summary?.toLocaleString() || 0}</p>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
