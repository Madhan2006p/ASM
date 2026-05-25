import React, { useState, useEffect } from "react";
import { Button, Container, Dropdown } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../utils/api";
import { FiUser } from "react-icons/fi";

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Function to check and update login status
    const checkLoginStatus = () => {
      const accessToken = localStorage.getItem("accessToken");
      const userData = localStorage.getItem("user");
      
      if (accessToken && userData) {
        setIsLoggedIn(true);
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          console.error("Error parsing user data:", e);
          setIsLoggedIn(false);
          setUser(null);
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    };

    // Check on mount
    checkLoginStatus();

    // Listen for storage changes (e.g., login/logout in other tabs or same tab)
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken' || e.key === 'user') {
        checkLoginStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom login/logout events
    const handleLoginEvent = () => checkLoginStatus();
    window.addEventListener('userLogin', handleLoginEvent);
    window.addEventListener('userLogout', handleLoginEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLogin', handleLoginEvent);
      window.removeEventListener('userLogout', handleLoginEvent);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsLoggedIn(false);
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Clear tokens even if logout API fails
      setIsLoggedIn(false);
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <div 
      className="py-3 border-bottom fixed-top header-nav" 
      style={{ 
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'var(--header-border)',
        zIndex: 1030,
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.05)',
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
      }}
    >
      <Container fluid className="px-4 d-flex justify-content-between align-items-center">
        <h4 className="fw-bold mb-0" style={{ color: 'var(--text-color)', letterSpacing: '-0.5px' }}>
          Infotech Sentinel
        </h4>
        <div className="d-flex align-items-center">
          <Button 
            as={Link} 
            to="/" 
            variant="outline-secondary" 
            className="me-3"
            style={{
              borderRadius: '10px',
              borderColor: 'rgba(0, 0, 0, 0.1)',
              color: '#4a5568',
              background: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 500,
              padding: '8px 16px'
            }}
          >
            Home
          </Button>

          {/* User Profile Dropdown */}
          <Dropdown align="end">
            <Dropdown.Toggle 
              variant="outline-secondary" 
              id="user-dropdown"
              className="d-flex align-items-center justify-content-center p-2"
              style={{
                borderRadius: '50%',
                width: '45px',
                height: '45px',
                background: 'rgba(255, 255, 255, 0.9)',
                borderColor: 'rgba(0, 0, 0, 0.1)',
                color: '#4a5568'
              }}
            >
              <FiUser size={22} />
            </Dropdown.Toggle>

            <Dropdown.Menu 
              style={{
                background: 'var(--bg-color)',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                borderColor: 'var(--header-border)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                minWidth: '200px',
                marginTop: '10px',
                padding: '8px 0',
                zIndex: 1050
              }}
            >
              {isLoggedIn ? (
                <>
                  <div className="px-3 py-2 text-center" style={{ color: 'var(--text-color)' }}>
                    <span className="fw-bold d-block mb-1" style={{ fontSize: '1.05rem' }}>
                      {user?.name || 'User'}
                    </span>
                    <span className="text-muted d-block" style={{ fontSize: '0.85rem' }}>
                      {user?.email || ''}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Dropdown.Item as={Link} to="/login" style={{ color: 'var(--text-color)', fontWeight: 500 }}>
                    Sign In
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/signup" style={{ color: 'var(--text-color)', fontWeight: 500 }}>
                    Sign Up
                  </Dropdown.Item>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </Container>
    </div>
  );
};

export default Header;
