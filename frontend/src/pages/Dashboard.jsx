import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Package, RotateCcw, CalendarClock } from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#3b82f6'];

function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [charts, setCharts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('daily');

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const [summaryRes, chartsRes] = await Promise.all([
                    api.get(`/dashboard/summary?timeframe=${timeframe}`),
                    api.get('/dashboard/charts') // Charts could also use timeframe
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
    }, [timeframe]);

    const isProfit = (summary?.profit || 0) >= (summary?.loss || 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h1>
                    <p className="text-gray-500 text-sm mt-1">Track your business performance and insights.</p>
                </div>
                
                <div className="flex items-center space-x-3 bg-gray-50/80 p-1.5 rounded-xl border border-gray-200 shadow-inner">
                    <CalendarClock className="text-primary ml-2 hidden sm:block" size={20} />
                    {['daily', 'weekly', 'monthly', 'yearly'].map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200 outline-none ${
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

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : (
                <>
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Profit/Loss Card */}
                        <div className={`bg-gradient-to-br ${isProfit ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600'} rounded-2xl shadow-lg p-6 text-white relative overflow-hidden transform hover:-translate-y-1 transition-transform`}>
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                            <div className="flex items-center justify-between mb-2 opacity-90">
                                <h3 className="text-lg font-medium">{isProfit ? 'Net Profit' : 'Net Loss'}</h3>
                                {isProfit ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                            </div>
                            <p className="text-4xl font-bold tracking-tight drop-shadow-sm">
                                ${isProfit ? summary?.profit?.toLocaleString() : summary?.loss?.toLocaleString()}
                            </p>
                            <p className="text-sm mt-3 opacity-80 font-medium">({timeframe} period)</p>
                        </div>

                        {/* Total Sales Value */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute -right-6 -top-6 text-primary opacity-5 group-hover:opacity-10 transition-opacity">
                                <DollarSign size={120} />
                            </div>
                            <div className="flex items-center space-x-3 mb-2 text-gray-500">
                                <DollarSign size={20} className="text-blue-500" />
                                <h3 className="font-medium">Total Sales ($)</h3>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">${summary?.sales_amount?.toLocaleString()}</p>
                            <p className="text-sm mt-2 text-gray-400 font-medium">Cost Price: ${summary?.cost_price?.toLocaleString()}</p>
                        </div>

                        {/* Total Items Sold */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute -right-6 -top-6 text-primary opacity-5 group-hover:opacity-10 transition-opacity">
                                <ShoppingCart size={120} />
                            </div>
                            <div className="flex items-center space-x-3 mb-2 text-gray-500">
                                <ShoppingCart size={20} className="text-purple-500" />
                                <h3 className="font-medium">Items Sold</h3>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{summary?.sales_items?.toLocaleString()}</p>
                            <p className="text-sm mt-2 text-gray-400 font-medium">{timeframe === 'daily' ? 'Today' : 'This ' + timeframe}</p>
                        </div>

                        {/* Returns */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute -right-6 -top-6 text-primary opacity-5 group-hover:opacity-10 transition-opacity">
                                <RotateCcw size={120} />
                            </div>
                            <div className="flex items-center space-x-3 mb-2 text-gray-500">
                                <RotateCcw size={20} className="text-rose-500" />
                                <h3 className="font-medium">Returns</h3>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">${summary?.returns_amount?.toLocaleString()}</p>
                            <p className="text-sm mt-2 font-medium text-rose-500 bg-rose-50 inline-flex px-2 py-0.5 rounded-full w-max">{summary?.returns_items} items returned</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
                                <h3 className="text-lg font-bold text-gray-800">12-Month Historical Trend</h3>
                            </div>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={charts?.monthly_sales || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="sales" fill="#6366f1" radius={[6, 6, 0, 0]} name="Sales ($)" />
                                        <Bar dataKey="purchases" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="Purchases ($)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-50 pb-4">Sales by Category</h3>
                            <div className="h-80 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={charts?.sales_distribution || []}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                            label={false}
                                        >
                                            {charts?.sales_distribution?.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                        <Legend iconType="circle" verticalAlign="bottom" height={60} wrapperStyle={{fontSize: '13px'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center -mt-10 pointer-events-none">
                                    <span className="text-gray-400 text-xs uppercase font-bold tracking-widest">Products</span>
                                    <span className="text-2xl font-bold text-gray-900">{summary?.product_count}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default Dashboard;
