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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<RoleBasedIndexRoute />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="products" element={<Products />} />
          <Route path="users" element={<Users />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
