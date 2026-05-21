import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Suppliers from './pages/Suppliers';
import Products from './pages/Products';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Customers from './pages/Customers';
import Transactions from './pages/Transactions';
import AuditLog from './pages/AuditLog';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';

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
    } catch (e) { }
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

            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
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
