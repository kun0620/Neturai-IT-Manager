import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
// Removed: import { TicketDetailsPage } from '@/pages/TicketDetailsPage';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const UpdatePasswordPage = lazy(() => import('@/pages/auth/UpdatePasswordPage'));
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const TicketsPage = lazy(() =>
  import('@/pages/Tickets').then((module) => ({ default: module.Tickets }))
);
const AssetManagementPage = lazy(() =>
  import('@/pages/AssetManagement').then((module) => ({
    default: module.AssetManagement,
  }))
);
const UsersPage = lazy(() => import('@/pages/Users'));
const ReportsPage = lazy(() => import('@/pages/Reports'));
const NotificationsPage = lazy(() => import('@/pages/Notifications'));
const SettingsAndLogsPage = lazy(() =>
  import('@/pages/SettingsAndLogs').then((module) => ({
    default: module.SettingsAndLogs,
  }))
);
const ProfilePage = lazy(() =>
  import('@/pages/Profile').then((module) => ({ default: module.ProfilePage }))
);

const RouteFallback = (
  <div className="p-6 text-sm text-muted-foreground">Loading...</div>
);

function App() {
  return (
    <BrowserRouter >
      <AuthProvider>
        <Suspense fallback={RouteFallback}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="tickets" element={<TicketsPage />} />
                {/* Removed: <Route path="tickets/:ticketId" element={<TicketDetailsPage />} /> */}
                <Route path="assets" element={<AssetManagementPage />} />
                <Route path="assets/new" element={<AssetManagementPage />} /> {/* New route for adding asset */}
                <Route path="users" element={<UsersPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsAndLogsPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
