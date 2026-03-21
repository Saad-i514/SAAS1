import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import { LayoutDashboard, Users as UsersIcon, Package, LogOut, Settings, FileText, Building2, UserCog, Menu, X } from 'lucide-react';
import Chatbot from '../components/Chatbot';

function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

    let navItems = [];
    if (user?.role === 'SuperAdmin') {
        navItems = [
            { path: '/', icon: Building2, label: 'Super Admin Panel' }
        ];
    } else if (user?.role === 'Admin') {
        navItems = [
            { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { path: '/suppliers', icon: UsersIcon, label: 'Suppliers' },
            { path: '/products', icon: Package, label: 'Products' },
            { path: '/users', icon: UserCog, label: 'Employees' },
            { path: '/reports', icon: FileText, label: 'Reports' },
        ];
    } else {
        navItems = [
            { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { path: '/suppliers', icon: UsersIcon, label: 'Suppliers' },
            { path: '/products', icon: Package, label: 'Products' },
        ];
    }

    return (
        <div className="flex h-screen bg-gray-50 w-full overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-dark text-white flex flex-col flex-shrink-0 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-16 flex items-center justify-center border-b border-gray-800 px-3">
                    <h1 className="text-lg font-bold text-primary tracking-tight leading-tight text-center">Business Management System</h1>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsSidebarOpen(false)}
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
            <div className="flex-1 flex flex-col min-w-0 md:ml-0 overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 bg-glass z-10 sticky top-0 relative">
                    {/* Left spacer for flex balance if needed, or just let absolute handle center */}
                    <div className="flex-1 flex items-center">
                        <button 
                            className="md:hidden text-gray-800 hover:text-primary transition-colors focus:outline-none"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                    
                    {/* Centered Organization Name */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 text-lg sm:text-xlg md:text-2xl font-black text-gray-900 tracking-wider uppercase drop-shadow-sm whitespace-nowrap hidden sm:block">
                        {user?.role === 'SuperAdmin' ? 'Super Admin Environment' : (user?.company?.name || 'Loading Company...')}
                    </div>

                    <div className="flex items-center space-x-4 flex-1 justify-end">
                        <button className="text-gray-400 hover:text-primary transition-colors">
                            <Settings size={20} />
                        </button>
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-md">
                                {user?.email?.[0].toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.email || 'User'}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 sm:p-8 bg-gray-50 relative">
                    <Outlet />
                    <Chatbot />
                </main>
            </div>
        </div>
    );
}

export default Layout;
