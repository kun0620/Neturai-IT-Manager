import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import { Tickets } from './pages/Tickets';
import { Assets } from './pages/Assets';
import { Users } from './pages/Users';
import Reports from './pages/Reports';
import { SettingsAndLogs } from './pages/SettingsAndLogs';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/users" element={<Users />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SettingsAndLogs />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
