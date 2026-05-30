<<<<<<< HEAD
import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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

function App() {
  return (
    <ScanProvider>
      <div>
        <Header />
        <div style={{ paddingTop: '70px' }}>
          <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/subdomains" element={<DigitalFootprintsPage />} />
          <Route path="/endpoints" element={<EndpointsPage />} />
          <Route path="/directories" element={<DirectoriesPage />} />
          <Route path="/open-ports" element={<OpenPortsPage />} />
          <Route path="/technologies" element={<TechnologiesPage />} />
          <Route path="/vulnerabilities" element={<VulnerabilitiesPage />} />
          <Route path="/ssl-certificates" element={<SSLCertificatePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/scan-history" element={<ScanHistoryPage />} />
          <Route path="/scan-detail/:id" element={<ScanDetailPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <FloatingTerminal />
      </div>
    </ScanProvider>
  );
}

export default App;
=======
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
import EmailSecurityPage from "./pages/EmailSecurityPage";
import ScanDetailPage from "./pages/ScanDetailPage";
import SettingsPage from "./pages/SettingsPage";
import MarketplacePage from "./pages/MarketplacePage";
import Header from "./components/Header";
import { checkAuth } from "./utils/api";

// Role-based module access mapping (matches backend)
const MODULE_ACCESS = {
  admin: [
    '/dashboard', '/subdomains', '/endpoints', '/open-ports', '/directories',
    '/technologies', '/vulnerabilities', '/ssl-certificates', '/email-security',
    '/scan-detail', '/marketplace', '/settings',
  ],
  member: [
    '/dashboard', '/subdomains', '/endpoints', '/open-ports', '/directories',
    '/technologies', '/vulnerabilities', '/ssl-certificates', '/email-security',
    '/scan-detail', '/marketplace', '/settings',
  ],
  viewer: [
    '/dashboard', '/subdomains', '/endpoints', '/open-ports', '/directories',
    '/technologies', '/vulnerabilities', '/ssl-certificates', '/email-security',
    '/settings',
  ],
};

/**
 * ProtectedRoute redirects to /login if the user is not authenticated.
 * For authenticated users, it checks module-level access based on role.
 * On every navigation / location change, it validates the JWT token with the backend.
 */
const ProtectedRoute = ({ children, requiredModules = [] }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [checking, setChecking] = useState(true);

  const modulesKey = requiredModules.join(",");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    console.log(`[JWT Authorization Check] Path: "${location.pathname}" | Current Token:`, token);
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    
    const verifyAuth = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        if (active) {
          setIsAuthenticated(false);
          setChecking(false);
        }
        return;
      }

      // Query the backend to verify the JWT token
      const res = await checkAuth();
      
      if (!active) return;

      if (res && res.authenticated) {
        setIsAuthenticated(true);
        // Save fresh user data from JWT verification response
        if (res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
          window.dispatchEvent(new Event('userLogin'));
        }
        
        try {
          const user = res.user || JSON.parse(localStorage.getItem('user'));
          const role = user?.role || 'viewer';
          const allowedPaths = MODULE_ACCESS[role] || MODULE_ACCESS.viewer;
          
          const currentPath = location.pathname;
          const hasModuleAccess = allowedPaths.some(p => currentPath.startsWith(p));
          
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
      } else {
        setIsAuthenticated(false);
      }
      setChecking(false);
    };

    verifyAuth();
    
    return () => {
      active = false;
    };
  }, [location.pathname, modulesKey]);

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'var(--text-color)' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;
  
  return children;
};

function App() {
  useEffect(() => {
    localStorage.removeItem("activeScanId");
    localStorage.removeItem("lastScannedDomain");
  }, []);

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
            <Route path="/email-security" element={
              <ProtectedRoute><EmailSecurityPage /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
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
>>>>>>> latest
