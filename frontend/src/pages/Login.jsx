import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getCurrentUser } from '../services/authService';
import {
  Eye, EyeOff, Lock, Mail, TrendingUp, BarChart3,
  Package, Users, ShieldCheck, Zap, ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    label: 'Real-time Analytics',
    desc: 'Live profit/loss dashboard with 12-month trends',
    color: 'from-blue-500/20 to-blue-600/10',
    iconColor: 'text-blue-300',
  },
  {
    icon: Package,
    label: 'Smart Inventory',
    desc: 'Auto stock updates on every sale & purchase',
    color: 'from-emerald-500/20 to-emerald-600/10',
    iconColor: 'text-emerald-300',
  },
  {
    icon: Zap,
    label: 'AI-Powered',
    desc: 'Chatbot with vision — scan invoices to add records',
    color: 'from-yellow-500/20 to-yellow-600/10',
    iconColor: 'text-yellow-300',
  },
  {
    icon: ShieldCheck,
    label: 'Full Audit Trail',
    desc: 'Every action logged with user, time & IP',
    color: 'from-[#d6c9b0]/20 to-[#b39a72]/10',
    iconColor: 'text-[#e7dcc6]',
  },
];

const stats = [
  { value: '100%', label: 'Automated Reports' },
  { value: 'Live', label: 'Multi-device Sync' },
  { value: '3', label: 'Access Roles' },
];

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      await getCurrentUser();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0f0d0b]">

      {/* ── Left Panel ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 bg-gradient-to-br from-[#1c1714] via-[#17130f] to-[#0f0d0b] relative overflow-hidden">

        {/* Ambient blobs — warm cream glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-[#d6c9b0]/[0.10] rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-[#b39a72]/[0.10] rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#efe6d4]/[0.04] rounded-full blur-3xl" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#efe6d4] rounded-xl flex items-center justify-center shadow-lg shadow-black/30">
            <TrendingUp size={20} className="text-[#1c1815]" />
          </div>
          <div>
            <span className="text-white font-black text-lg tracking-tight">BizManager</span>
            <span className="ml-1.5 text-xs font-bold text-[#e7dcc6] bg-[#efe6d4]/15 px-2 py-0.5 rounded-full border border-[#efe6d4]/25">PRO</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-[#efe6d4]/10 border border-[#efe6d4]/20 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[#e7dcc6] text-xs font-semibold tracking-wide uppercase">Enterprise Business Platform</span>
            </div>
            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
              Run your business<br />
              <span className="bg-gradient-to-r from-[#f5efe2] to-[#c9bca3] bg-clip-text text-transparent">
                smarter, faster.
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Inventory, suppliers, customers, sales, and AI-powered automation — all in one place. Built for businesses that mean business.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex items-center space-x-6">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
              </div>
            ))}
            <div className="h-8 w-px bg-slate-700" />
            <p className="text-xs text-slate-500 leading-relaxed">Trusted by<br />growing businesses</p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, desc, color, iconColor }) => (
              <div key={label}
                className={`bg-gradient-to-br ${color} backdrop-blur border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all duration-300 group`}>
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Icon size={15} className={iconColor} />
                </div>
                <p className="text-white font-bold text-sm mb-1">{label}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-slate-600 text-xs">© 2026 BizManager Pro. All rights reserved.</p>
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            <span className="text-slate-500 text-xs">All systems operational</span>
          </div>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-[#faf6ee]">

        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center space-x-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-[#1c1815] rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-[#efe6d4]" />
            </div>
            <span className="text-gray-900 font-black text-lg">BizManager Pro</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Welcome back</h2>
            <p className="text-gray-500 text-sm">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3 animate-slide-up">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-black">!</span>
              </div>
              <p className="text-red-700 text-sm font-medium leading-snug">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-gray-900 placeholder-gray-300 text-sm"
                  placeholder="admin@company.com" autoComplete="email" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-gray-900 placeholder-gray-300 text-sm"
                  placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-300 hover:text-gray-500 transition-colors">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="pt-1">
              <button type="submit" disabled={loading}
                className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl transition-all shadow-sm shadow-violet-500/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 flex items-center justify-center gap-2 group text-sm">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Signing in…</span></>
                ) : (
                  <><span>Sign In</span><ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center space-x-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300 font-medium">secured access</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Security badges */}
          <div className="flex items-center justify-center space-x-4">
            {[
              { icon: ShieldCheck, label: 'JWT Auth' },
              { icon: Lock, label: 'Encrypted' },
              { icon: Users, label: 'Role-based' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center space-x-1.5 text-gray-300">
                <Icon size={13} />
                <span className="text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-gray-300">
            Contact your administrator to get access.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
