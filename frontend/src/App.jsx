import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import SearchBuses from './pages/customer/SearchBuses';
import MyBookings from './pages/customer/MyBookings';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageBuses from './pages/admin/ManageBuses';
import AdminBookings from './pages/admin/AdminBookings';
import Layout from './components/Layout';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin'
    ? <Navigate to="/admin/dashboard" replace />
    : <Navigate to="/customer/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/customer" element={
            <ProtectedRoute role="customer">
              <Layout role="customer" />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="search" element={<SearchBuses />} />
            <Route path="bookings" element={<MyBookings />} />
          </Route>

          <Route path="/admin" element={
            <ProtectedRoute role="admin">
              <Layout role="admin" />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="buses" element={<ManageBuses />} />
            <Route path="bookings" element={<AdminBookings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
