import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import { LayoutDashboard, Users, Package, LogOut, Settings, FileText, Building2 } from 'lucide-react';
import Chatbot from '../components/Chatbot';

function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = user?.role === 'SuperAdmin' ? [
        { path: '/', icon: Building2, label: 'Super Admin Panel' }
    ] : [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/suppliers', icon: Users, label: 'Suppliers' },
        { path: '/products', icon: Package, label: 'Products' },
        { path: '/reports', icon: FileText, label: 'Reports' },
    ];

    return (
        <div className="flex h-screen bg-gray-50 w-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-dark text-white flex flex-col flex-shrink-0">
                <div className="h-16 flex items-center justify-center border-b border-gray-800">
                    <h1 className="text-xl font-bold text-primary tracking-wider">SAAS PROD</h1>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} className={isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 text-gray-400 hover:text-red-400 transition-colors w-full px-4 py-2 rounded"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 bg-glass z-10 sticky top-0">
                    <div className="text-xl font-semibold text-gray-800 tracking-tight">
                        {user?.role === 'SuperAdmin' ? 'Super Admin Environment' : (user?.company?.name || 'Loading Company...')}
                    </div>
                    <div className="flex items-center space-x-4">
                        <button className="text-gray-400 hover:text-primary transition-colors">
                            <Settings size={20} />
                        </button>
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                                {user?.email?.[0].toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.email || 'User'}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-8 bg-gray-50 relative">
                    <Outlet />
                    <Chatbot />
                </main>
            </div>
        </div>
    );
}

export default Layout;
