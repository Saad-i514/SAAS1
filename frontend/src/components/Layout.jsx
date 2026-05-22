import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import {
  LayoutDashboard, Users as UsersIcon, Package, LogOut,
  FileText, Building2, UserCog, Menu, X, TrendingUp,
  Bell, UserCircle, ArrowLeftRight, ShieldCheck, Sun, Moon,
} from 'lucide-react';
import Chatbot from './Chatbot';
import { useTheme } from '../context/ThemeContext';

const NAV_ADMIN = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/suppliers',    icon: UsersIcon,        label: 'Suppliers' },
  { path: '/products',     icon: Package,          label: 'Products' },
  { path: '/customers',    icon: UserCircle,       label: 'Customers' },
  { path: '/transactions', icon: ArrowLeftRight,   label: 'Transactions' },
  { path: '/users',        icon: UserCog,          label: 'Employees' },
  { path: '/reports',      icon: FileText,         label: 'Reports' },
  { path: '/audit-log',    icon: ShieldCheck,      label: 'Audit Log' },
];

const NAV_OPERATOR = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/suppliers',    icon: UsersIcon,        label: 'Suppliers' },
  { path: '/products',     icon: Package,          label: 'Products' },
  { path: '/customers',    icon: UserCircle,       label: 'Customers' },
  { path: '/transactions', icon: ArrowLeftRight,   label: 'Transactions' },
];

const NAV_SUPER = [
  { path: '/', icon: Building2, label: 'Tenant Management' },
];

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150
        ${active
          ? 'bg-indigo-600 text-white font-medium shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-white/5 font-normal'
        }
      `}
    >
      <Icon size={16} className="flex-shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark, toggle } = useTheme();

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems =
    user?.role === 'SuperAdmin' ? NAV_SUPER :
    user?.role === 'Admin'      ? NAV_ADMIN :
    NAV_OPERATOR;

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const initials = user?.email?.[0]?.toUpperCase() || 'U';
  const companyName = user?.company?.name || 'Business Platform';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0d0f14]">

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-[220px] flex-shrink-0
        bg-[#111318] border-r border-white/[0.06]
        transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-none truncate">BizManager</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Pro Edition</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-500 hover:text-white ml-2"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* User chip */}
        <div className="px-3 py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.04]">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate leading-none">{user?.email || 'User'}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{user?.role || 'Operator'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">Menu</p>
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              active={isActive(item.path)}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-white/[0.06] flex-shrink-0 space-y-0.5">
          <button
            onClick={toggle}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {dark
              ? <Sun size={16} className="text-amber-400 flex-shrink-0" />
              : <Moon size={16} className="flex-shrink-0" />
            }
            <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white dark:bg-[#161b27] border-b border-gray-200/80 dark:border-slate-800 flex items-center px-4 gap-3 flex-shrink-0 z-10">
          <button
            className="lg:hidden text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="flex-1 flex items-center">
            <span className="text-sm font-semibold text-gray-800 dark:text-white hidden sm:block">
              {user?.role === 'SuperAdmin' ? 'Super Admin' : companyName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="btn-ghost btn btn-icon"
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="btn-ghost btn btn-icon relative">
              <Bell size={16} />
            </button>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold ml-1">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
          <Chatbot />
        </main>
      </div>
    </div>
  );
}

export default Layout;
