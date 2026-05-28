import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../utils/api';
import { FiGrid, FiSearch, FiMonitor, FiRadio, FiFolder, FiTool, FiShield, FiLock, FiActivity, FiShoppingCart, FiSettings, FiLogOut, FiChevronDown } from 'react-icons/fi';
import '../styles/Sidebar.css';

// Role-to-permission mapping matches backend
const ROLE_PERMISSIONS = {
  admin: [
    'dashboard', 'subdomains', 'endpoints', 'open_ports', 'directories',
    'technologies', 'vulnerabilities', 'ssl_certificates', 'scan_history',
    'trigger_scan', 'manage_domains', 'marketplace', 'settings',
    'reconnaissance', 'fuzzing', 'manage_users',
  ],
  member: [
    'dashboard', 'subdomains', 'endpoints', 'open_ports', 'directories',
    'technologies', 'vulnerabilities', 'ssl_certificates', 'scan_history',
    'trigger_scan', 'manage_domains', 'marketplace', 'settings',
    'reconnaissance', 'fuzzing',
  ],
  viewer: [
    'dashboard', 'subdomains', 'endpoints', 'open_ports', 'directories',
    'technologies', 'vulnerabilities', 'ssl_certificates', 'scan_history',
    'settings',
  ],
};

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAssetDiscoveryOpen, setIsAssetDiscoveryOpen] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const updateRole = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setUserRole(user.role || null);
        } catch {
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    };
    updateRole();
    window.addEventListener('userLogin', updateRole);
    window.addEventListener('userLogout', updateRole);
    window.addEventListener('storage', (e) => {
      if (e.key === 'user') updateRole();
    });
    return () => {
      window.removeEventListener('userLogin', updateRole);
      window.removeEventListener('userLogout', updateRole);
    };
  }, []);

  const hasPermission = (module) => {
    const perms = ROLE_PERMISSIONS[userRole] || [];
    return perms.includes(module);
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';
  
  const assetDiscoveryRoutes = ['/subdomains', '/endpoints', '/open-ports', '/directories', '/technologies', '/vulnerabilities'];
  const isAssetDiscoveryActive = assetDiscoveryRoutes.some(route => location.pathname === route);

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
      navigate('/login');
    }
  };

  return (
    <div className="sidebar">
      <ul>
        {hasPermission('dashboard') && (
          <li>
            <Link to="/dashboard" className={isActive('/dashboard')}>
              <span><FiGrid size={18} /></span> Dashboard
            </Link>
          </li>
        )}
        
        {/* Asset Discovery - Collapsible (shown if user has at least one asset module) */}
        {hasPermission('subdomains') && (
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
                {hasPermission('subdomains') && (
                  <li>
                    <Link to="/subdomains" className={isActive('/subdomains')}>
                      <span><FiMonitor size={18} /></span> Subdomains
                    </Link>
                  </li>
                )}
                {hasPermission('endpoints') && (
                  <li>
                    <Link to="/endpoints" className={isActive('/endpoints')}>
                      <span><FiRadio size={18} /></span> Endpoints
                    </Link>
                  </li>
                )}
                {hasPermission('open_ports') && (
                  <li>
                    <Link to="/open-ports" className={isActive('/open-ports')}>
                      <span><FiTool size={18} /></span> Open Ports
                    </Link>
                  </li>
                )}
                {hasPermission('directories') && (
                  <li>
                    <Link to="/directories" className={isActive('/directories')}>
                      <span><FiFolder size={18} /></span> Directories
                    </Link>
                  </li>
                )}
                {hasPermission('technologies') && (
                  <li>
                    <Link to="/technologies" className={isActive('/technologies')}>
                      <span><FiTool size={18} /></span> Technologies
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </li>
        )}

        {hasPermission('vulnerabilities') && (
          <li>
            <Link to="/vulnerabilities" className={isActive('/vulnerabilities')}>
              <span><FiShield size={18} /></span> Vulnerabilities
            </Link>
          </li>
        )}
        {hasPermission('ssl_certificates') && (
          <li>
            <Link to="/ssl-certificates" className={isActive('/ssl-certificates')}>
              <span><FiLock size={18} /></span> SSL Certificate
            </Link>
          </li>
        )}
        {hasPermission('scan_history') && (
          <li>
            <Link to="/scan-history" className={isActive('/scan-history')}>
              <span><FiActivity size={18} /></span> Scan History
            </Link>
          </li>
        )}
        {hasPermission('marketplace') && (
          <li>
            <Link to="/marketplace" className={isActive('/marketplace')}>
              <span><FiShoppingCart size={18} /></span> Marketplace
            </Link>
          </li>
        )}
        {hasPermission('settings') && (
          <li>
            <Link to="/settings" className={isActive('/settings')}>
              <span><FiSettings size={18} /></span> Settings
            </Link>
          </li>
        )}
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
