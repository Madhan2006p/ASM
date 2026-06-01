import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../utils/api';
import { FiGrid, FiSearch, FiMonitor, FiRadio, FiFolder, FiTool, FiShield, FiLock, FiMail, FiActivity, FiShoppingCart, FiSettings, FiLogOut, FiChevronDown } from 'react-icons/fi';
import '../styles/Sidebar.css';

// Role-to-permission mapping matches backend
const ROLE_PERMISSIONS = {
  admin: [
    'dashboard', 'subdomains', 'endpoints', 'open_ports', 'directories',
    'technologies', 'vulnerabilities', 'ssl_certificates', 'email_security', 'scan_history',
    'trigger_scan', 'manage_domains', 'marketplace', 'settings',
    'reconnaissance', 'fuzzing', 'manage_users',
  ],
  member: [
    'dashboard', 'subdomains', 'endpoints', 'open_ports', 'directories',
    'technologies', 'vulnerabilities', 'ssl_certificates', 'email_security', 'scan_history',
    'trigger_scan', 'manage_domains', 'marketplace', 'settings',
    'reconnaissance', 'fuzzing',
  ],
  viewer: [
    'dashboard', 'subdomains', 'endpoints', 'open_ports', 'directories',
    'technologies', 'vulnerabilities', 'ssl_certificates', 'email_security', 'scan_history',
    'settings',
  ],
};



const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAssetDiscoveryOpen, setIsAssetDiscoveryOpen] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userFeatures, setUserFeatures] = useState(null);

  useEffect(() => {
    const updateRole = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setUserRole(user.role || null);
          // features is an array of feature IDs like ['1', '2', '3']
          // null/undefined/empty means all features unlocked
          setUserFeatures(user.features || null);
        } catch {
          setUserRole(null);
          setUserFeatures(null);
        }
      } else {
        setUserRole(null);
        setUserFeatures(null);
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

  // Helper to render a feature link (always clickable — locking is handled at page level)
  const renderFeatureLink = (module, label, icon, path) => {
    if (!hasPermission(module)) return null;
    return (
      <li>
        <Link to={path} className={isActive(path)}>
          <span>{icon}</span> {label}
        </Link>
      </li>
    );
  };
  
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
                {renderFeatureLink('subdomains', 'Subdomains', <FiMonitor size={18} />, '/subdomains')}
                {renderFeatureLink('endpoints', 'Endpoints', <FiRadio size={18} />, '/endpoints')}
                {renderFeatureLink('open_ports', 'Open Ports', <FiTool size={18} />, '/open-ports')}
                {renderFeatureLink('directories', 'Directories', <FiFolder size={18} />, '/directories')}
                {renderFeatureLink('technologies', 'Technologies', <FiTool size={18} />, '/technologies')}
              </ul>
            )}
          </li>
        )}

        {renderFeatureLink('vulnerabilities', 'Vulnerabilities', <FiShield size={18} />, '/vulnerabilities')}
        {renderFeatureLink('ssl_certificates', 'SSL Certificate', <FiLock size={18} />, '/ssl-certificates')}
        {renderFeatureLink('email_security', 'Email Security', <FiMail size={18} />, '/email-security')}

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
