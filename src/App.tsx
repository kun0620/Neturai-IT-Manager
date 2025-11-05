import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import { Tickets } from './pages/Tickets';
import { Assets } from './pages/Assets';
import { Users } from './pages/Users';
import Reports from './pages/Reports';
import { SettingsAndLogs } from './pages/SettingsAndLogs';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import UpdatePasswordPage from './pages/auth/UpdatePasswordPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="tickets" element={<Tickets />} />
                <Route path="assets" element={<Assets />} />
                <Route path="users" element={<Users />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<SettingsAndLogs />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
