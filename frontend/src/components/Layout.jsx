import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import {
  LayoutDashboard, Users as UsersIcon, Package, LogOut,
  FileText, Building2, UserCog, Menu, X, TrendingUp,
  ChevronRight, Bell
} from 'lucide-react';
import Chatbot from './Chatbot';

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { 
        setUser(JSON.parse(userData)); 
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  let navItems = [];
  if (user?.role === 'SuperAdmin') {
    navItems = [{ path: '/', icon: Building2, label: 'Tenant Management', color: 'text-purple-400' }];
  } else if (user?.role === 'Admin') {
    navItems = [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: 'text-indigo-400' },
      { path: '/suppliers', icon: UsersIcon, label: 'Suppliers', color: 'text-blue-400' },
      { path: '/products', icon: Package, label: 'Products', color: 'text-emerald-400' },
      { path: '/users', icon: UserCog, label: 'Employees', color: 'text-orange-400' },
      { path: '/reports', icon: FileText, label: 'Reports', color: 'text-pink-400' },
    ];
  } else {
    navItems = [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: 'text-indigo-400' },
      { path: '/suppliers', icon: UsersIcon, label: 'Suppliers', color: 'text-blue-400' },
      { path: '/products', icon: Package, label: 'Products', color: 'text-emerald-400' },
    ];
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col
        bg-slate-900 border-r border-slate-800
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">BizManager</p>
              <p className="text-slate-500 text-xs mt-0.5">Pro Edition</p>
            </div>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-3 px-2 py-2 rounded-xl bg-slate-800/50">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate">{user?.email || 'User'}</p>
              <p className="text-slate-400 text-xs">{user?.role || 'Operator'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest px-3 mb-3">Navigation</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Icon size={18} className={active ? 'text-white' : item.color} />
                <span className="font-medium text-sm flex-1">{item.label}</span>
                {active && <ChevronRight size={14} className="text-indigo-300" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-slate-800 flex-shrink-0 space-y-1">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0 z-10">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-900 transition-colors p-1"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          {/* Company name - centered on desktop */}
          <div className="flex-1 flex items-center justify-center">
            <h1 className="text-base font-bold text-gray-900 tracking-tight hidden sm:block">
              {user?.role === 'SuperAdmin'
                ? 'Super Admin Environment'
                : (user?.company?.name || 'Business Management System')}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
              <Bell size={18} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 bg-slate-50">
          <Outlet />
          <Chatbot />
        </main>
      </div>
    </div>
  );
}

export default Layout;
