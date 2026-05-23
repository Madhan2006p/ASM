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
