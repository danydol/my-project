import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectSettingsPage from './pages/ProjectSettingsPage';
import RepositoryAnalysisPage from './pages/RepositoryAnalysisPage';
import DeploymentsPage from './pages/DeploymentsPage';
import SettingsPage from './pages/SettingsPage';

// Protected route wrapper
const ProtectedLayoutRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

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
        <Route path="/" element={<ProtectedLayoutRoute><Navigate to="/dashboard" replace /></ProtectedLayoutRoute>} />
        <Route path="/dashboard" element={<ProtectedLayoutRoute><DashboardPage /></ProtectedLayoutRoute>} />
        <Route path="/projects" element={<ProtectedLayoutRoute><ProjectsPage /></ProtectedLayoutRoute>} />
        <Route path="/projects/:projectId/settings" element={<ProtectedLayoutRoute><ProjectSettingsPage /></ProtectedLayoutRoute>} />
        <Route path="/repositories" element={<ProtectedLayoutRoute><RepositoryAnalysisPage /></ProtectedLayoutRoute>} />
        <Route path="/deployments" element={<ProtectedLayoutRoute><DeploymentsPage /></ProtectedLayoutRoute>} />
        <Route path="/analytics" element={<ProtectedLayoutRoute><div className="p-6"><h1 className="text-2xl font-bold">Analytics</h1><p>Coming soon...</p></div></ProtectedLayoutRoute>} />
        <Route path="/settings" element={<ProtectedLayoutRoute><SettingsPage /></ProtectedLayoutRoute>} />
      </Routes>
    </div>
  );
}

export default App; 