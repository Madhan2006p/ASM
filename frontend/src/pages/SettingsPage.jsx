import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button, Badge, Spinner, Table, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, FiBell, FiUser, FiShield, FiSliders, FiCheck, 
  FiActivity, FiCpu, FiCheckCircle, FiAlertTriangle, FiDatabase, FiClock, FiRefreshCw, FiTrash2 
} from "react-icons/fi";
import Sidebar from "../components/Sidebar";
import { fetchToolsHealth, clearDatabase } from "../utils/api";

const SettingsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [autoScan, setAutoScan] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tools diagnostics state
  const [toolsHealth, setToolsHealth] = useState([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [dbInfo, setDbInfo] = useState({ vendor: 'postgresql', status: 'CONNECTED' });

  // Clear database state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState(null);

  // Read user details from localStorage
  const userStr = localStorage.getItem('user');
  let userDetails = { name: "User", email: "" };
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      userDetails = {
        name: parsed.username || parsed.name || "User",
        email: parsed.email || ""
      };
    } catch (e) {
      console.error(e);
    }
  }

  const loadToolsHealth = async () => {
    setLoadingTools(true);
    try {
      const data = await fetchToolsHealth();
      setToolsHealth(data.tools || []);
      if (data.database_vendor) {
        setDbInfo({ vendor: data.database_vendor, status: data.database_status });
      }
    } catch (e) {
      console.error("Failed to load tools health:", e);
    } finally {
      setLoadingTools(false);
    }
  };

  useEffect(() => {
    loadToolsHealth();
  }, []);

  const handleClearDatabase = async () => {
    setClearing(true);
    setClearResult(null);
    try {
      const result = await clearDatabase();
      setClearResult({ success: true, message: result.message, counts: result.deleted });
    } catch (e) {
      setClearResult({ success: false, message: e.message || "Failed to clear database" });
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  };

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
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="rounded-circle px-2" style={{ border: '1px solid var(--header-border)' }}>
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
          
          {/* Left Column: Preferences, DB, Profiles (5 Cols) */}
          <Col lg={5} className="d-flex flex-column gap-4">
            
            {/* Profile Card */}
            <Card style={{ 
              borderRadius: '16px', 
              border: '1px solid var(--header-border)', 
              background: 'var(--header-bg)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
            }}>
              <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center p-4">
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  fontSize: '2.2rem',
                  fontWeight: '600',
                  lineHeight: '80px',
                  marginBottom: '1rem',
                  boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
                }}>
                  {userDetails.name.charAt(0).toUpperCase()}
                </div>
                <h4 className="fw-semibold mb-1" style={{ color: 'var(--text-color)' }}>{userDetails.name}</h4>
                <p className="text-muted mb-3" style={{ fontSize: '0.88rem' }}>{userDetails.email}</p>
                <Badge bg="success" style={{ borderRadius: '12px', padding: '6px 12px' }}>Administrator</Badge>
              </Card.Body>
            </Card>

            {/* Database Intelligence Card */}
            <Card style={{ 
              borderRadius: '16px', 
              border: '1px solid var(--header-border)', 
              background: 'var(--header-bg)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
            }}>
              <Card.Header className="bg-transparent border-bottom-0 pt-4 pb-0">
                <h5 className="mb-0 fw-semibold d-flex align-items-center" style={{ color: 'var(--text-color)' }}>
                  <FiDatabase className="me-2 text-info" /> Database Intelligence
                </h5>
              </Card.Header>
              <Card.Body className="pt-2">
                <div className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: 'var(--bg-color)', border: '1px solid var(--header-border)' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2.5 rounded-circle bg-info bg-opacity-10 text-info d-flex align-items-center justify-content-center">
                      <FiDatabase size={20} />
                    </div>
                    <div>
                      <span className="fw-bold d-block" style={{ color: 'var(--text-color)', fontSize: '0.92rem' }}>
                        PostgreSQL Database
                      </span>
                      <span className="text-muted small" style={{ fontSize: '0.78rem' }}>
                        Backend Engine: {dbInfo.vendor}
                      </span>
                    </div>
                  </div>
                  <Badge bg="success" pill style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                    {dbInfo.status}
                  </Badge>
                </div>
              </Card.Body>
            </Card>

            {/* Clear Database — Development Tool */}
            <Card style={{ 
              borderRadius: '16px', 
              border: '1px solid rgba(220, 38, 38, 0.2)', 
              background: 'var(--header-bg)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
            }}>
              <Card.Body className="p-4">
                <h5 className="mb-3 fw-semibold d-flex align-items-center" style={{ color: '#EF4444' }}>
                  <FiTrash2 className="me-2" /> Clear All Data
                </h5>
                <p className="text-muted small mb-3">
                  Permanently delete all scan results, subdomains, endpoints, vulnerabilities, SSL certificates,
                  and other discovered data. This action cannot be undone and is intended for development purposes.
                </p>
                <Button 
                  variant="outline-danger" 
                  disabled={clearing}
                  onClick={() => setShowClearConfirm(true)}
                  style={{ borderRadius: '12px', padding: '8px 20px', fontWeight: '500', fontSize: '0.85rem' }}
                >
                  {clearing ? (
                    <><Spinner animation="border" size="sm" className="me-2" /> Clearing...</>
                  ) : (
                    <><FiTrash2 className="me-2" /> Clear All Data</>
                  )}
                </Button>
                {clearResult && (
                  <div className={`mt-2 small ${clearResult.success ? 'text-success' : 'text-danger'}`}>
                    {clearResult.success 
                      ? `Cleared: ${Object.values(clearResult.counts || {}).reduce((a,b) => a+b, 0)} records`
                      : clearResult.message
                    }
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Preferences & Configuration */}
            <Card style={{ 
              borderRadius: '16px', 
              border: '1px solid var(--header-border)', 
              background: 'var(--header-bg)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
            }}>
              <Card.Body className="p-4 d-flex flex-column gap-4">
                
                {/* Notifications Preferences */}
                <div>
                  <h5 className="mb-3 fw-semibold d-flex align-items-center" style={{ color: 'var(--text-color)' }}>
                    <FiBell className="me-2 text-primary" /> Notifications
                  </h5>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <span className="fw-semibold d-block" style={{ color: 'var(--text-color)', fontSize: '0.9rem' }}>Email Scans Alert</span>
                        <span className="text-muted small" style={{ fontSize: '0.78rem' }}>Notify me when subdomains complete scans</span>
                      </div>
                      <Form.Check 
                        type="switch"
                        id="notif-scan"
                        checked={notifications}
                        onChange={() => setNotifications(!notifications)}
                      />
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <span className="fw-semibold d-block" style={{ color: 'var(--text-color)', fontSize: '0.9rem' }}>Marketing Emails</span>
                        <span className="text-muted small" style={{ fontSize: '0.78rem' }}>Receive product news and tutorials</span>
                      </div>
                      <Form.Check 
                        type="switch"
                        id="notif-marketing"
                        checked={marketingEmails}
                        onChange={() => setMarketingEmails(!marketingEmails)}
                      />
                    </div>
                  </div>
                </div>

                {/* Scans Preference */}
                <hr className="my-0" style={{ opacity: 0.1 }} />
                <div>
                  <h5 className="mb-3 fw-semibold d-flex align-items-center" style={{ color: 'var(--text-color)' }}>
                    <FiSliders className="me-2 text-success" /> Scanning Configuration
                  </h5>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="fw-semibold d-block" style={{ color: 'var(--text-color)', fontSize: '0.9rem' }}>Auto-Scan Added Domains</span>
                      <span className="text-muted small" style={{ fontSize: '0.78rem' }}>Automatically trigger analysis on manual addition</span>
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
                <hr className="my-0" style={{ opacity: 0.1 }} />
                <div>
                  <h5 className="mb-3 fw-semibold d-flex align-items-center" style={{ color: 'var(--text-color)' }}>
                    <FiShield className="me-2 text-danger" /> Security &amp; Account
                  </h5>
                  <div className="d-flex gap-2">
                    <Button variant="outline-primary" style={{ borderRadius: '12px', padding: '8px 16px', fontWeight: '500', fontSize: '0.85rem' }} onClick={() => alert('Password reset email sent!')}>
                      Change Password
                    </Button>
                    <Button variant="outline-danger" style={{ borderRadius: '12px', padding: '8px 16px', fontWeight: '500', fontSize: '0.85rem' }} onClick={() => alert('Account deletion has been requested.')}>
                      Delete Account
                    </Button>
                  </div>
                </div>

              </Card.Body>
            </Card>

          </Col>

          {/* Right Column: Engine Tool Health & Estimates (7 Cols) */}
          <Col lg={7}>
            <Card style={{ 
              borderRadius: '16px', 
              border: '1px solid var(--header-border)', 
              background: 'var(--header-bg)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
              minHeight: '100%'
            }}>
              <Card.Header className="bg-transparent border-bottom-0 pt-4 pb-2 d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                  <h5 className="mb-0 fw-bold d-flex align-items-center" style={{ color: 'var(--text-color)' }}>
                    <FiCpu className="me-2 text-primary" /> Core Security Scanners &amp; Estimates
                  </h5>
                  <span className="text-muted small">Diagnostic health mapping and execution duration estimates of all backend tools.</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline-primary" 
                  disabled={loadingTools} 
                  onClick={loadToolsHealth}
                  style={{ borderRadius: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
                >
                  <FiRefreshCw size={14} className={loadingTools ? 'spin-animation' : ''} />
                  <span>{loadingTools ? 'Checking...' : 'Run Diagnostics'}</span>
                </Button>
              </Card.Header>
              
              <Card.Body className="p-0">
                {loadingTools && toolsHealth.length === 0 ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" className="mb-2" />
                    <p className="text-muted small mb-0">Running pipeline integrity checks on 14 backend scanners...</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    {/* Pulsing CSS spinner rule inject */}
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                      .spin-animation {
                        animation: spin 1.5s linear infinite;
                      }
                    `}</style>
                    <Table className="mb-0 align-middle" hover style={{ color: 'var(--text-color)', fontSize: '0.88rem' }}>
                      <thead>
                        <tr className="text-muted small border-bottom" style={{ borderColor: 'var(--header-border)' }}>
                          <th className="py-3 px-4">SCANNER TOOL</th>
                          <th>INTEL CATEGORY</th>
                          <th className="text-center">EST. RUNTIME</th>
                          <th className="text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {toolsHealth.map((tool) => {
                          const isAvailable = tool.status === 'AVAILABLE';
                          const isError = tool.status === 'ERROR';
                          
                          return (
                            <tr key={tool.key} className="border-bottom" style={{ borderColor: 'var(--header-border)' }}>
                              <td className="py-3 px-4">
                                <div className="d-flex flex-column">
                                  <span className="fw-semibold" style={{ color: 'var(--text-color)' }}>{tool.name}</span>
                                  <code className="text-muted font-monospace small" style={{ fontSize: '0.72rem', wordBreak: 'break-all', opacity: 0.8 }} title={tool.path}>
                                    {tool.path.length > 50 ? tool.path.slice(0, 47) + '...' : tool.path}
                                  </code>
                                </div>
                              </td>
                              <td>
                                <span className="text-muted small">{tool.category}</span>
                              </td>
                              <td className="text-center">
                                <Badge bg="secondary" pill style={{ 
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)', 
                                  color: '#3b82f6', 
                                  border: '1.5px solid rgba(59, 130, 246, 0.2)',
                                  padding: '5px 10px',
                                  fontSize: '0.78rem',
                                  fontWeight: '600'
                                }}>
                                  <FiClock className="me-1" size={12} />
                                  {tool.estimate}
                                </Badge>
                              </td>
                              <td className="text-center">
                                {isAvailable ? (
                                  <Badge bg="success" pill style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <FiCheckCircle size={12} />
                                    <span>Active</span>
                                  </Badge>
                                ) : isError ? (
                                  <Badge bg="warning" text="dark" pill style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }} title={tool.error}>
                                    <FiAlertTriangle size={12} />
                                    <span>Error</span>
                                  </Badge>
                                ) : (
                                  <Badge bg="danger" pill style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }} title={tool.error}>
                                    <FiAlertTriangle size={12} />
                                    <span>Missing</span>
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {toolsHealth.length === 0 && !loadingTools && (
                          <tr>
                            <td colSpan={4} className="text-center text-muted py-4">
                              No tools loaded yet. Click "Run Diagnostics" to scan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

        </Row>

      </div>

      {/* Clear Database Confirmation Modal */}
      <Modal show={showClearConfirm} onHide={() => setShowClearConfirm(false)} centered>
        <Modal.Header closeButton style={{ background: 'var(--header-bg)', borderBottom: '1px solid rgba(220, 38, 38, 0.2)' }}>
          <Modal.Title className="fw-bold d-flex align-items-center" style={{ color: '#EF4444' }}>
            <FiTrash2 className="me-2" /> Clear All Data
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: 'var(--bg-color)' }}>
          <p className="mb-0">
            <strong>Are you sure you want to clear all scan data?</strong>
          </p>
          <p className="text-muted small mt-2 mb-0">
            This will permanently delete all discovered subdomains, endpoints, vulnerabilities, SSL certificates,
            ports, technologies, email security results, directory scans, and scan history.
            This action is <strong className="text-danger">irreversible</strong> and intended for development use only.
          </p>
        </Modal.Body>
        <Modal.Footer style={{ background: 'var(--header-bg)', borderTop: '1px solid var(--header-border)' }}>
          <Button variant="secondary" onClick={() => setShowClearConfirm(false)} disabled={clearing} style={{ borderRadius: '10px' }}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleClearDatabase} disabled={clearing} style={{ borderRadius: '10px' }}>
            {clearing ? <><Spinner animation="border" size="sm" className="me-2" /> Clearing...</> : 'Yes, Clear Everything'}
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default SettingsPage;
