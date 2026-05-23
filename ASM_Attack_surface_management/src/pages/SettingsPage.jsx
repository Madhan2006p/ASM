import React, { useState } from "react";
import { Container, Row, Col, Card, Form, Button, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiBell, FiUser, FiShield, FiSliders, FiCheck } from "react-icons/fi";
import Sidebar from "../components/Sidebar";

const SettingsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [autoScan, setAutoScan] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Read user details from localStorage
  const userStr = localStorage.getItem('user');
  let userDetails = { name: "Infotech Admin", email: "admin@infotechsentinel.com" };
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      userDetails = {
        name: parsed.username || parsed.name || "Infotech Admin",
        email: parsed.email || "admin@infotechsentinel.com"
      };
    } catch (e) {
      console.error(e);
    }
  }

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };

  return (
    <div className="digital-page">
      <Sidebar />
      <div className="digital-page-content" style={{ padding: '2rem', marginLeft: '280px', minHeight: 'calc(100vh - 70px)' }}>
        
        {/* Header */}
        <div className="digital-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="rounded-circle px-2">
              <FiArrowLeft size={16} />
            </Button>
            <h2 className="mb-0" style={{ color: 'var(--text-color)', fontWeight: '600' }}>Settings</h2>
          </div>
          <div>
            <Button variant="primary" onClick={handleSave} style={{ borderRadius: '20px', padding: '6px 20px', fontWeight: '500' }}>
              {saveSuccess ? <><FiCheck className="me-2" /> Changes Saved</> : 'Save Changes'}
            </Button>
          </div>
        </div>

        <Row className="g-4">
          {/* Profile Card */}
          <Col lg={4}>
            <Card style={{ 
              borderRadius: '16px', 
              border: '1px solid var(--header-border)', 
              background: 'var(--bg-color)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
            }} className="h-100">
              <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center p-4">
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                  color: 'white',
                  fontSize: '2.5rem',
                  fontWeight: '600',
                  lineHeight: '90px',
                  marginBottom: '1rem',
                  boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                }}>
                  {userDetails.name.charAt(0).toUpperCase()}
                </div>
                <h4 className="fw-semibold mb-1" style={{ color: 'var(--text-color)' }}>{userDetails.name}</h4>
                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>{userDetails.email}</p>
                <Badge bg="success" style={{ borderRadius: '12px', padding: '6px 12px' }}>Administrator</Badge>
              </Card.Body>
            </Card>
          </Col>

          {/* Preferences & Configuration */}
          <Col lg={8}>
            <Card style={{ 
              borderRadius: '16px', 
              border: '1px solid var(--header-border)', 
              background: 'var(--bg-color)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
            }}>
              <Card.Body className="p-4">
                
                {/* Notifications Preferences */}
                <div className="mb-4 pb-4 border-bottom" style={{ borderColor: 'var(--header-border)' }}>
                  <h5 className="mb-3 fw-semibold d-flex align-items-center" style={{ color: 'var(--text-color)' }}>
                    <FiBell className="me-2 text-primary" /> Notifications
                  </h5>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className="fw-semibold" style={{ color: 'var(--text-color)' }}>Email Scans Alert</span>
                          <p className="mb-0 text-muted small">Notify me when subdomains complete scans</p>
                        </div>
                        <Form.Check 
                          type="switch"
                          id="notif-scan"
                          checked={notifications}
                          onChange={() => setNotifications(!notifications)}
                        />
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className="fw-semibold" style={{ color: 'var(--text-color)' }}>Marketing emails</span>
                          <p className="mb-0 text-muted small">Receive product news and tutorials</p>
                        </div>
                        <Form.Check 
                          type="switch"
                          id="notif-marketing"
                          checked={marketingEmails}
                          onChange={() => setMarketingEmails(!marketingEmails)}
                        />
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Scans Preference */}
                <div className="mb-4 pb-4 border-bottom" style={{ borderColor: 'var(--header-border)' }}>
                  <h5 className="mb-3 fw-semibold d-flex align-items-center" style={{ color: 'var(--text-color)' }}>
                    <FiSliders className="me-2 text-success" /> Scanning Configuration
                  </h5>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="fw-semibold" style={{ color: 'var(--text-color)' }}>Auto-Scan Added Domains</span>
                      <p className="mb-0 text-muted small">Automatically trigger deep subdomains analysis upon manual addition</p>
                    </div>
                    <Form.Check 
                      type="switch"
                      id="scan-auto"
                      checked={autoScan}
                      onChange={() => setAutoScan(!autoScan)}
                    />
                  </div>
                </div>

                {/* Security Actions */}
                <div>
                  <h5 className="mb-3 fw-semibold d-flex align-items-center" style={{ color: 'var(--text-color)' }}>
                    <FiShield className="me-2 text-danger" /> Security & Account
                  </h5>
                  <div className="d-flex gap-2">
                    <Button variant="outline-primary" style={{ borderRadius: '12px', padding: '8px 20px', fontWeight: '500' }} onClick={() => alert('Password reset email sent!')}>
                      Change Password
                    </Button>
                    <Button variant="outline-danger" style={{ borderRadius: '12px', padding: '8px 20px', fontWeight: '500' }} onClick={() => alert('Account deletion has been requested.')}>
                      Delete Account
                    </Button>
                  </div>
                </div>

              </Card.Body>
            </Card>
          </Col>
        </Row>

      </div>
    </div>
  );
};

export default SettingsPage;
