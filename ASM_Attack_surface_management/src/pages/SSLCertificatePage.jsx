import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Spinner, Alert, Badge, Modal, Row, Col, Card } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiDownload } from 'react-icons/fi';
import "../styles/DigitalFootprintsPage.css";
import axios from 'axios';
import fileSaver from 'file-saver';
import ExcelJS from 'exceljs';
import { cleanupLocalStorageDomains, sanitizeSubdomainStr } from '../utils/domainSanitizer';
import { fetchAllPages } from '../utils/api';
import { useScan } from '../context/ScanContext';

const saveAs = fileSaver.saveAs || fileSaver;

const SSLCertificatePage = () => {
  const { refreshKey } = useScan();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sslCertificates, setSslCertificates] = useState([]);
  const navigate = useNavigate();
  const { orgId } = useParams();
  const token = localStorage.getItem('accessToken');

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('SSL Certificates');

          // Add headers
          worksheet.columns = [
            { header: 'S.No', key: 'id', width: 5 },
            { header: 'Domain', key: 'domain', width: 40 },
            { header: 'Subdomain', key: 'subdomain', width: 40 },
            { header: 'IP', key: 'ip', width: 20 },
            { header: 'RDNS', key: 'rdns', width: 50 },
            { header: 'SSL Grade', key: 'ssl_grade', width: 15 },
            { header: 'Issuer Name', key: 'issuer_name', width: 50 },
            { header: 'Expiry Date', key: 'expiry_date', width: 20 },
            { header: 'Purchase Date', key: 'purchase_date', width: 20 },
            { header: 'Location', key: 'location', width: 20 },
            { header: 'Created', key: 'created_at', width: 20 },
            { header: 'Updated', key: 'updated_at', width: 20 }
          ];

          // Add data
          sslCertificates.forEach((item, index) => {
            worksheet.addRow({
              id: index + 1,
              domain: item.domain || '-',
              subdomain: item.subdomain || '-',
              ip: item.ip || '-',
              rdns: item.rdns || '-',
              ssl_grade: item.ssl_grade || '-',
              issuer_name: item.issuer_name || '-',
              expiry_date: item.expiry_date || '-',
              purchase_date: item.purchase_date || '-',
              location: item.location || '-',
              created_at: item.created_at ? formatExactTimestamp(item.created_at) : '-',
              updated_at: item.updated_at ? formatExactTimestamp(item.updated_at) : '-'
            });
          });

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `ssl_certificates_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Fetch SSL certificates data
  const fetchSSLCertificates = async () => {
    try {
      const userStr = localStorage.getItem('user');
      let userOrgId = null;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userOrgId = user.organization_id || user.organization?.id;
        } catch (e) {}
      }
      const organizationId = orgId || userOrgId || '1';
      const allResults = await fetchAllPages('ssl-certificates', organizationId);
      setSslCertificates(allResults);
      setError(null);
    } catch (err) {
      setError('Failed to fetch SSL certificates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSSLCertificates();
  }, [orgId, refreshKey]);

  // Format date in exact format
  const formatExactTimestamp = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString();
    } catch (error) {
      return '-';
    }
  };

  // Calculate days until expiry (negative means expired, positive means days left)
  const getDaysUntilExpiry = (expiryDateStr) => {
    if (!expiryDateStr || expiryDateStr === '-') return null;
    try {
      // Parse DD-MM-YYYY format
      const [day, month, year] = expiryDateStr.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiryDate.setHours(0, 0, 0, 0);
      
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return null;
    }
  };

  // Render exact timestamp as a two-line block to avoid horizontal collision
  const renderExactTimestamp = (dateString) => {
    if (!dateString) return <span className="text-muted">-</span>;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return <span className="text-muted">-</span>;
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();
      return (
        <div className="d-flex flex-column align-items-start" style={{ lineHeight: '1.2' }}>
          <span style={{ color: 'var(--text-primary, #1e293b)', fontWeight: 500, fontSize: '0.82rem' }}>{dateStr}</span>
          <span style={{ color: 'var(--text-primary, #1e293b)', opacity: 0.6, fontSize: '0.72rem' }}>{timeStr}</span>
        </div>
      );
    } catch (error) {
      return <span className="text-muted">-</span>;
    }
  };

// Calculate Pillar Metrics with memoization
const expiringCount = React.useMemo(() => {
  return sslCertificates.filter(c => {
    const days = getDaysUntilExpiry(c.expiry_date);
    return days !== null && days <= 30;
  }).length;
}, [sslCertificates]);

const strongEncryptionCount = React.useMemo(() => {
  return sslCertificates.filter(c => c.ssl_grade === 'A+' || c.ssl_grade === 'A').length;
}, [sslCertificates]);

const trustedCount = React.useMemo(() => {
  return sslCertificates.filter(c => c.is_trusted !== false).length;
}, [sslCertificates]);

const identityAlignedCount = React.useMemo(() => {
  return sslCertificates.filter(c => c.domain_aligned !== false).length;
}, [sslCertificates]);

const shadowItCount = React.useMemo(() => {
  return sslCertificates.filter(c => c.is_shadow_it === true).length;
}, [sslCertificates]);

  return (
    <div className="digital-page">
      <Sidebar />
      <div className="digital-page-content">

        <div className="digital-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="rounded-circle px-2">
              <FiArrowLeft size={16} />
            </Button>
            <h2 className="mb-0">SSL Certificate {orgId && `(Organization: ${orgId})`}</h2>
          </div>
          <div>
            <Button variant="outline-primary" className="me-2" onClick={() => {
              setLoading(true);
              setTimeout(() => {
                fetchSSLCertificates();
              }, 500);
            }}>
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </Button>
            <Button variant="outline-secondary" onClick={exportToExcel}>
              <FiDownload className="me-2" /> Export to Excel
            </Button>
          </div>
        </div>

        {/* 5 Pillar KPI Cards */}
        <Row className="mb-4 g-3">
          <Col md={2} style={{ width: '20%' }}>
            <Card className="border-0 p-3 h-100 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderTop: '4px solid #3b82f6', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Lifecycle & Expiry</span>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <h3 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>{expiringCount}</h3>
                <div className="p-2 rounded bg-primary bg-opacity-10 text-primary">
                  <i className="bi bi-calendar-x fs-5"></i>
                </div>
              </div>
              <span className="small text-muted mt-2 d-block">Expiring in 30 days</span>
            </Card>
          </Col>
          <Col md={2} style={{ width: '20%' }}>
            <Card className="border-0 p-3 h-100 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderTop: '4px solid #10b981', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Encryption Strength</span>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <h3 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>{strongEncryptionCount}</h3>
                <div className="p-2 rounded bg-success bg-opacity-10 text-success">
                  <i className="bi bi-shield-lock fs-5"></i>
                </div>
              </div>
              <span className="small text-muted mt-2 d-block">A or A+ Grade Certs</span>
            </Card>
          </Col>
          <Col md={2} style={{ width: '20%' }}>
            <Card className="border-0 p-3 h-100 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderTop: '4px solid #8b5cf6', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Issuance Integrity</span>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <h3 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>{trustedCount}</h3>
                <div className="p-2 rounded" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  <i className="bi bi-patch-check fs-5"></i>
                </div>
              </div>
              <span className="small text-muted mt-2 d-block">Trusted CA Issuers</span>
            </Card>
          </Col>
          <Col md={2} style={{ width: '20%' }}>
            <Card className="border-0 p-3 h-100 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderTop: '4px solid #f59e0b', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Identity Alignment</span>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <h3 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>{identityAlignedCount}</h3>
                <div className="p-2 rounded bg-warning bg-opacity-10 text-warning">
                  <i className="bi bi-person-badge fs-5"></i>
                </div>
              </div>
              <span className="small text-muted mt-2 d-block">Valid Domain Matching</span>
            </Card>
          </Col>
          <Col md={2} style={{ width: '20%' }}>
            <Card className="border-0 p-3 h-100 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderTop: '4px solid #ef4444', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Shadow IT</span>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <h3 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>{shadowItCount}</h3>
                <div className="p-2 rounded bg-danger bg-opacity-10 text-danger">
                  <i className="bi bi-cloud-slash fs-5"></i>
                </div>
              </div>
              <span className="small text-muted mt-2 d-block">Unmanaged Assets</span>
            </Card>
          </Col>
        </Row>

        {/* Search Box */}
        <div className="card mb-4">
          <div className="card-body">
            <Form.Control
              type="text"
              placeholder="Search SSL certificates by domain, IP, or issuer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive rounded-3 border" style={{ background: 'var(--bg-color)', borderColor: 'var(--header-border)' }}>
          <Table hover className="ssl-certificate-table mb-0 align-middle">
            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
              <tr>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>S.No</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Domain</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>IP</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>RDNS</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>SSL Grade</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Issuer Name</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Expiry Date</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Purchase Date</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Location</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Created</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {sslCertificates.length > 0 ? (
                sslCertificates
                  .filter(item => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                      (item.domain?.toLowerCase().includes(search)) ||
                      (item.ip?.toLowerCase().includes(search)) ||
                      (item.rdns?.toLowerCase().includes(search)) ||
                      (item.issuer_name?.toLowerCase().includes(search))
                    );
                  })
                  .map((item, index) => {
                    const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);
                    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
                    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
                    const daysRemaining = daysUntilExpiry !== null && daysUntilExpiry > 0 ? daysUntilExpiry : null;
                    
                    return (
                      <tr key={item.id}>
                        <td className="px-4">{index + 1}</td>
                        <td className="px-4">
                          {item.domain ? (
                            <div>
                              <span className="domain-name fw-medium" title={sanitizeSubdomainStr(item.domain)} style={{ color: 'var(--text-color)' }}>
                                {sanitizeSubdomainStr(item.domain)}
                              </span>
                              {item.domain_aligned === false && (
                                <Badge bg="warning" text="dark" className="ms-2" style={{ fontSize: '0.65rem' }}>Mismatch</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4">
                          {item.ip && item.ip !== '-' ? (
                            <div>
                              <a 
                                href={`https://${item.ip}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="ip-link fw-medium"
                                title={item.subdomain && item.subdomain !== '-' ? `Subdomain: ${item.subdomain}\nIP: ${item.ip}` : `IP: ${item.ip}`}
                                style={{ color: '#0ea5e9', textDecoration: 'none' }}
                              >
                                {item.ip}
                              </a>
                              {item.subdomain && item.subdomain !== '-' && item.subdomain !== item.domain && (
                                <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                                  {sanitizeSubdomainStr(item.subdomain)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4">
                          {item.rdns && item.rdns !== '-' ? (
                            <a 
                              href={`https://${item.rdns}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="rdns-link"
                              title={item.rdns}
                              style={{ color: 'var(--text-color)' }}
                            >
                              {item.rdns}
                            </a>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4">
                          {item.ssl_grade && item.ssl_grade !== '-' ? (
                            <div>
                              <span className={`badge rounded-pill ${item.ssl_grade === 'A+' || item.ssl_grade === 'A' ? 'bg-success bg-opacity-10 text-success' : item.ssl_grade === 'F' ? 'bg-danger bg-opacity-10 text-danger' : 'bg-warning bg-opacity-10 text-warning'}`} style={{ fontWeight: 600 }}>
                                {item.ssl_grade}
                              </span>
                              {item.cipher_suite && (
                                <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>{item.cipher_suite}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4">
                          <div className="issuer-name fw-medium" title={item.issuer_name}>
                            {item.issuer_name && item.issuer_name !== '-' ? item.issuer_name : '-'}
                          </div>
                          {item.is_trusted === false && (
                            <Badge bg="danger" className="mt-1" style={{ fontSize: '0.65rem' }}>Self-Signed</Badge>
                          )}
                        </td>
                        <td className="px-4 date-cell">
                          {item.expiry_date && item.expiry_date !== '-' ? (
                            <div>
                              <span className="date-text" style={{ color: 'var(--text-color)', opacity: 0.8 }}>{item.expiry_date}</span>
                              {daysRemaining !== null && (
                                <div className="mt-1">
                                  <Badge bg="danger" className="expiry-badge">{daysRemaining} Days Delay</Badge>
                                </div>
                              )}
                              {isExpired && (
                                <div className="mt-1">
                                  <Badge bg="danger" className="expiry-badge">Expired</Badge>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 date-cell">
                          {item.purchase_date && item.purchase_date !== '-' ? (
                            <span className="date-text" style={{ color: 'var(--text-color)', opacity: 0.8 }}>{item.purchase_date}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4">
                          {item.location && item.location !== '-' ? (
                            <div>
                              <span className="location-text">{item.location}</span>
                              {item.is_shadow_it && (
                                <div className="mt-1"><Badge bg="secondary" style={{ fontSize: '0.65rem' }}>Unmanaged</Badge></div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 date-cell">
                          {item.created_at ? (
                            renderExactTimestamp(item.created_at)
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 date-cell">
                          {item.updated_at ? (
                            renderExactTimestamp(item.updated_at)
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan="11" className="text-center py-4">
                    <p className="text-muted mb-0">No SSL certificates found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default SSLCertificatePage;

