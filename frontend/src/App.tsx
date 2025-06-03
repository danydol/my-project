import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
        />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/repositories" element={<ProtectedRoute><div className="p-6"><h1 className="text-2xl font-bold">Repositories</h1><p>Coming soon...</p></div></ProtectedRoute>} />
        <Route path="/deployments" element={<ProtectedRoute><div className="p-6"><h1 className="text-2xl font-bold">Deployments</h1><p>Coming soon...</p></div></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><div className="p-6"><h1 className="text-2xl font-bold">Analytics</h1><p>Coming soon...</p></div></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><div className="p-6"><h1 className="text-2xl font-bold">Settings</h1><p>Coming soon...</p></div></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App; 