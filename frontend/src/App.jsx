import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ScanProvider } from "./context/ScanContext";
import FloatingTerminal from "./components/FloatingTerminal";
import WelcomePage from "./pages/WelcomePage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import DigitalFootprintsPage from "./pages/DigitalFootprintsPage";
import EndpointsPage from "./pages/EndpointsPage";
import DirectoriesPage from "./pages/DirectoriesPage";
import OpenPortsPage from "./pages/OpenPortsPage";
import TechnologiesPage from "./pages/TechnologiesPage";
import SSLCertificatePage from "./pages/SSLCertificatePage";
import VulnerabilitiesPage from "./pages/VulnerabilitiesPage";
import ScanHistoryPage from "./pages/ScanHistoryPage";
import ScanDetailPage from "./pages/ScanDetailPage";
import SettingsPage from "./pages/SettingsPage";
import MarketplacePage from "./pages/MarketplacePage";
import Header from "./components/Header";

// Role-based module access mapping (matches backend)
const MODULE_ACCESS = {
  admin: [
    '/dashboard', '/subdomains', '/endpoints', '/open-ports', '/directories',
    '/technologies', '/vulnerabilities', '/ssl-certificates', '/scan-history',
    '/scan-detail', '/marketplace', '/settings',
  ],
  member: [
    '/dashboard', '/subdomains', '/endpoints', '/open-ports', '/directories',
    '/technologies', '/vulnerabilities', '/ssl-certificates', '/scan-history',
    '/scan-detail', '/marketplace', '/settings',
  ],
  viewer: [
    '/dashboard', '/subdomains', '/endpoints', '/open-ports', '/directories',
    '/technologies', '/vulnerabilities', '/ssl-certificates', '/scan-history',
    '/settings',
  ],
};

/**
 * ProtectedRoute redirects to /login if the user is not authenticated.
 * For authenticated users, it checks module-level access based on role.
 */
const ProtectedRoute = ({ children, requiredModules = [] }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      setIsAuthenticated(false);
      setChecking(false);
      return;
    }
    
    setIsAuthenticated(true);
    
    // Check role-based access for the current path
    try {
      const user = userData ? JSON.parse(userData) : null;
      const role = user?.role || 'viewer';
      const allowedPaths = MODULE_ACCESS[role] || MODULE_ACCESS.viewer;
      
      const currentPath = location.pathname;
      const hasModuleAccess = allowedPaths.some(p => currentPath.startsWith(p));
      
      // Also check if requiredModules are provided explicitly
      if (requiredModules.length > 0) {
        const userModules = MODULE_ACCESS[role] || [];
        const hasAllRequired = requiredModules.every(m => userModules.includes(m));
        setHasAccess(hasAllRequired);
      } else {
        setHasAccess(hasModuleAccess || currentPath === '/');
      }
    } catch {
      setHasAccess(true);
    }
    
    setChecking(false);
  }, [location.pathname, requiredModules]);

  if (checking) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;
  
  return children;
};

function App() {
  return (
    <ScanProvider>
      <div>
        <Header />
        <div style={{ paddingTop: '70px' }}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/subdomains" element={
              <ProtectedRoute><DigitalFootprintsPage /></ProtectedRoute>
            } />
            <Route path="/endpoints" element={
              <ProtectedRoute><EndpointsPage /></ProtectedRoute>
            } />
            <Route path="/directories" element={
              <ProtectedRoute><DirectoriesPage /></ProtectedRoute>
            } />
            <Route path="/open-ports" element={
              <ProtectedRoute><OpenPortsPage /></ProtectedRoute>
            } />
            <Route path="/technologies" element={
              <ProtectedRoute><TechnologiesPage /></ProtectedRoute>
            } />
            <Route path="/vulnerabilities" element={
              <ProtectedRoute><VulnerabilitiesPage /></ProtectedRoute>
            } />
            <Route path="/ssl-certificates" element={
              <ProtectedRoute><SSLCertificatePage /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            } />
            <Route path="/scan-history" element={
              <ProtectedRoute><ScanHistoryPage /></ProtectedRoute>
            } />
            <Route path="/scan-detail/:id" element={
              <ProtectedRoute><ScanDetailPage /></ProtectedRoute>
            } />
            <Route path="/marketplace" element={
              <ProtectedRoute><MarketplacePage /></ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <FloatingTerminal />
      </div>
    </ScanProvider>
  );
}

export default App;
