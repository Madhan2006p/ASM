import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../utils/api';
import { FiGrid, FiSearch, FiMonitor, FiRadio, FiFolder, FiTool, FiShield, FiLock, FiActivity, FiShoppingCart, FiSettings, FiLogOut, FiChevronDown } from 'react-icons/fi';
import '../styles/Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAssetDiscoveryOpen, setIsAssetDiscoveryOpen] = useState(true);

  const isActive = (path) => location.pathname === path ? 'active' : '';
  
  // Check if any asset discovery route is active
  const assetDiscoveryRoutes = ['/subdomains', '/endpoints', '/open-ports', '/directories', '/technologies', '/vulnerabilities'];
  const isAssetDiscoveryActive = assetDiscoveryRoutes.some(route => location.pathname === route);

  // Auto-expand Asset Discovery if one of its routes is active
  useEffect(() => {
    if (isAssetDiscoveryActive) {
      setIsAssetDiscoveryOpen(true);
    }
  }, [isAssetDiscoveryActive]);

  const toggleAssetDiscovery = () => {
    setIsAssetDiscoveryOpen(!isAssetDiscoveryOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear tokens even if logout API fails
      navigate('/login');
    }
  };

  return (
    <div className="sidebar">
      <ul>
        <li>
          <Link to="/dashboard" className={isActive('/dashboard')}>
            <span><FiGrid size={18} /></span> Dashboard
          </Link>
        </li>
        
        {/* Asset Discovery - Collapsible */}
        <li className="menu-group">
          <div 
            className={`menu-header ${isAssetDiscoveryActive ? 'active' : ''}`}
            onClick={toggleAssetDiscovery}
          >
            <span><FiSearch size={18} /></span> Asset Discovery
            <span className={`arrow ${isAssetDiscoveryOpen ? 'open' : ''}`}><FiChevronDown /></span>
          </div>
          {isAssetDiscoveryOpen && (
            <ul className="submenu">
              <li>
                <Link to="/subdomains" className={isActive('/subdomains')}>
                  <span><FiMonitor size={18} /></span> Subdomains
                </Link>
              </li>
              <li>
                <Link to="/endpoints" className={isActive('/endpoints')}>
                  <span><FiRadio size={18} /></span> Endpoints
                </Link>
              </li>
              <li>
                <Link to="/open-ports" className={isActive('/open-ports')}>
                  <span><FiTool size={18} /></span> Open Ports
                </Link>
              </li>
              <li>
                <Link to="/directories" className={isActive('/directories')}>
                  <span><FiFolder size={18} /></span> Directories
                </Link>
              </li>
              <li>
                <Link to="/technologies" className={isActive('/technologies')}>
                  <span><FiTool size={18} /></span> Technologies
                </Link>
              </li>
            </ul>
          )}
        </li>

        <li>
          <Link to="/vulnerabilities" className={isActive('/vulnerabilities')}>
            <span><FiShield size={18} /></span> Vulnerabilities
          </Link>
        </li>
        <li>
          <Link to="/ssl-certificates" className={isActive('/ssl-certificates')}>
            <span><FiLock size={18} /></span> SSL Certificate
          </Link>
        </li>
        <li>
          <Link to="/scan-history" className={isActive('/scan-history')}>
            <span><FiActivity size={18} /></span> Scan History
          </Link>
        </li>
        <li>
          <Link to="/marketplace" className={isActive('/marketplace')}>
            <span><FiShoppingCart size={18} /></span> Marketplace
          </Link>
        </li>
        <li>
          <Link to="/settings" className={isActive('/settings')}>
            <span><FiSettings size={18} /></span> Settings
          </Link>
        </li>
        <li>
          <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} style={{ color: '#dc3545' }}>
            <span><FiLogOut size={18} /></span> Sign Out
          </a>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
