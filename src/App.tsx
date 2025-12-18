import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import UpdatePasswordPage from '@/pages/auth/UpdatePasswordPage';
import Dashboard from '@/pages/Dashboard';
import { Tickets } from '@/pages/Tickets';
import { AssetManagement } from '@/pages/AssetManagement';
import { Users } from '@/pages/Users';
import Reports from '@/pages/Reports';
import { SettingsAndLogs } from '@/pages/SettingsAndLogs';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
// Removed: import { TicketDetailsPage } from '@/pages/TicketDetailsPage';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tickets" element={<Tickets />} />
              {/* Removed: <Route path="tickets/:ticketId" element={<TicketDetailsPage />} /> */}
              <Route path="assets" element={<AssetManagement />} />
              <Route path="assets/new" element={<AssetManagement />} /> {/* New route for adding asset */}
              <Route path="users" element={<Users />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<SettingsAndLogs />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
