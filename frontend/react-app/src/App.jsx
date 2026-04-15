import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import LoadingSpinner from './components/LoadingSpinner';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import SystemInfoPage from './pages/SystemInfoPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />

      {/* Protected Routes with Layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <HistoryPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AnalyticsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <DashboardLayout>
              <AdminPage />
            </DashboardLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProfilePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/profile" element={<Navigate to="/settings" replace />} />
      <Route
        path="/system-info"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SystemInfoPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#1e293b',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              fontWeight: '600',
              padding: '16px',
              border: '1px solid #f1f5f9'
            },
            success: {
              iconTheme: {
                primary: '#4f46e5',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;