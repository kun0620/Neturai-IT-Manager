import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import Assets from './pages/Assets';
import Users from './pages/Users';
import Login from './pages/Login';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'tickets',
        element: <Tickets />,
      },
      {
        path: 'assets',
        element: <Assets />,
      },
      {
        path: 'users',
        element: <Users />,
      },
    ],
  },
]);

const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default App;
