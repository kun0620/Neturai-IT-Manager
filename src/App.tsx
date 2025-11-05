import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import { Tickets } from './pages/Tickets';
import { Assets } from './pages/Assets';
import { Users } from './pages/Users';
import Reports from './pages/Reports';
import { SettingsAndLogs } from './pages/SettingsAndLogs';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/sonner';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import UpdatePasswordPage from './pages/auth/UpdatePasswordPage';
import { useAuth } from './hooks/useAuth';
import { LoadingSpinner } from './components/ui/loading-spinner';

// ProtectedRoute component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />

          {/* Protected Routes */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/tickets" element={<Tickets />} />
                    <Route path="/assets" element={<Assets />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<SettingsAndLogs />} />
                    {/* Fallback for any unmatched protected routes */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
