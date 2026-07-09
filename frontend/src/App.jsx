import React, { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';

// Login stays eager (it's the first paint for logged-out users).
import Login from './pages/Login';

// Everything behind auth is code-split so the initial bundle stays small.
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const Suppliers          = lazy(() => import('./pages/Suppliers'));
const Products           = lazy(() => import('./pages/Products'));
const Reports            = lazy(() => import('./pages/Reports'));
const Users              = lazy(() => import('./pages/Users'));
const Customers          = lazy(() => import('./pages/Customers'));
const Transactions       = lazy(() => import('./pages/Transactions'));
const AuditLog           = lazy(() => import('./pages/AuditLog'));

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
