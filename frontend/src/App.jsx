import React, { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';

// Login stays eager (it's the first paint for logged-out users).
import Login from './pages/Login';

// After a new deploy, Vercel replaces the hashed chunk files, so a browser
// still holding old assets fails to lazy-load a route ("failed to load").
// Retry once with a hard reload to pull the fresh index.html + chunks.
function lazyWithRetry(importFn) {
  return lazy(async () => {
    const RELOAD_KEY = 'chunk-reload-once';
    try {
      const mod = await importFn();
      window.sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      if (!window.sessionStorage.getItem(RELOAD_KEY)) {
        window.sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        // Never resolve — the reload takes over before React renders.
        return new Promise(() => {});
      }
      throw err; // already retried once → surface the real error
    }
  });
}

// Everything behind auth is code-split so the initial bundle stays small.
const Dashboard          = lazyWithRetry(() => import('./pages/Dashboard'));
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/SuperAdminDashboard'));
const Suppliers          = lazyWithRetry(() => import('./pages/Suppliers'));
const Products           = lazyWithRetry(() => import('./pages/Products'));
const Reports            = lazyWithRetry(() => import('./pages/Reports'));
const Users              = lazyWithRetry(() => import('./pages/Users'));
const Customers          = lazyWithRetry(() => import('./pages/Customers'));
const Transactions       = lazyWithRetry(() => import('./pages/Transactions'));
const AuditLog           = lazyWithRetry(() => import('./pages/AuditLog'));

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const RoleBasedIndexRoute = () => {
  const userStr = localStorage.getItem('user');
  let role = 'Operator';
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      role = u.role;
    } catch { /* ignore malformed user json */ }
  }
  return role === 'SuperAdmin' ? <SuperAdminDashboard /> : <Dashboard />;
};

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<RoleBasedIndexRoute />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="products" element={<Products />} />
              <Route path="users" element={<Users />} />
              <Route path="reports" element={<Reports />} />
              <Route path="customers" element={<Customers />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="audit-log" element={<AuditLog />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
