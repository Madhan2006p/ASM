import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Form, Spinner, Badge, Card, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiRefreshCw, FiShield, FiSearch, FiGlobe, FiZap, FiCrosshair, FiLayers, FiMail, FiLock, FiServer, FiCode, FiBox, FiActivity } from 'react-icons/fi';
import { ATTACK_SURFACE_URL } from '../utils/apiConfig';
import axios from 'axios';
import "../styles/DigitalFootprintsPage.css";

const SCAN_TYPE_CONFIG = {
  FULL_SCAN:    { label: 'Surface Scan', icon: FiShield,      color: '#0EA5E9', bgColor: 'rgba(14, 165, 233, 0.1)' },
  WAPITI:       { label: 'Wapiti',       icon: FiShield,      color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' },
  NUCLEI:       { label: 'Nuclei',       icon: FiZap,         color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  NMAP:         { label: 'Nmap',         icon: FiCrosshair,   color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  DIRSEARCH:    { label: 'Dirsearch',    icon: FiSearch,      color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' },
  HTTPX_TECH:   { label: 'Httpx Tech',   icon: FiLayers,      color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  INQL:         { label: 'InQL',         icon: FiCode,        color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.1)' },
  GAU:          { label: 'GAU',          icon: FiGlobe,       color: '#14B8A6', bgColor: 'rgba(20, 184, 166, 0.1)' },
  WAYBACKURLS:  { label: 'Waybackurls',  icon: FiBox,         color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.1)' },
  SWAGGER:      { label: 'Swagger',      icon: FiCode,        color: '#A855F7', bgColor: 'rgba(168, 85, 247, 0.1)' },
  SOAP_WSDL:    { label: 'SOAP WSDL',    icon: FiCode,        color: '#F43F5E', bgColor: 'rgba(244, 63, 94, 0.1)' },
  GRPCURL:      { label: 'gRPCurl',      icon: FiServer,      color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.1)' },
  ARJUN:        { label: 'Arjun',        icon: FiCrosshair,   color: '#D946EF', bgColor: 'rgba(217, 70, 239, 0.1)' },
  SSL_CHECK:    { label: 'SSL/TLS',      icon: FiLock,        color: '#64748B', bgColor: 'rgba(100, 116, 139, 0.1)' },
  FULL_WORKFLOW: { label: 'Full Workflow', icon: FiActivity,  color: '#0EA5E9', bgColor: 'rgba(14, 165, 233, 0.1)' },
};

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' },
  RUNNING:   { label: 'Running',   color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  COMPLETED: { label: 'Completed', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  FAILED:    { label: 'Failed',    color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
};

const formatTimestamp = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      full: date.toLocaleString(),
      raw: date,
    };
  } catch {
    return null;
  }
};

const getDuration = (start, end) => {
  if (!start || !end) return null;
  const diffMs = new Date(end) - new Date(start);
  if (diffMs < 0) return null;
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const ScanHistoryPage = () => {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const token = localStorage.getItem('accessToken');
  const pollIntervalRef = useRef(null);

  // Shared fetcher — silent skips loading/error state updates for background polling
  const doFetch = useCallback(async (silent = false) => {
    try {
      const response = await axios.get(`${ATTACK_SURFACE_URL}/scan-history/?org_id=1`);
      const data = response.data?.results || response.data || [];
      setScans(data);
      return data;
    } catch (err) {
      if (!silent) setError('Failed to load scan history. Please try again.');
      return null;
    }
  }, []);

  const fetchScanHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    await doFetch(false);
    setLoading(false);
  }, [doFetch]);

  // Initial load
  useEffect(() => {
    fetchScanHistory();
  }, [fetchScanHistory]);

  // Polling: every 5s when there are RUNNING or PENDING scans
  useEffect(() => {
    const cleanup = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    const hasActive = scans.some(s => s.status === 'RUNNING' || s.status === 'PENDING');

    if (hasActive) {
      // Clear any existing interval before setting a new one
      cleanup();
      pollIntervalRef.current = setInterval(() => {
        doFetch(true);
      }, 5000);
    } else {
      cleanup();
    }

    return cleanup;
  }, [scans, doFetch]);

  const filteredScans = scans.filter(scan => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (scan.target?.toLowerCase() || '').includes(s) ||
      (scan.status?.toLowerCase() || '').includes(s)
    );
  });

  const getScanConfig = () => {
    return SCAN_TYPE_CONFIG['FULL_SCAN'] || {
      label: 'Surface Scan',
      icon: FiShield,
      color: '#0EA5E9',
      bgColor: 'rgba(14, 165, 233, 0.1)',
    };
  };

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || {
      label: status || 'Unknown',
      color: '#64748B',
      bgColor: 'rgba(100, 116, 139, 0.1)',
    };
  };

  // Group scans by date for timeline
  const groupedScans = React.useMemo(() => {
    const groups = {};
    filteredScans.forEach(scan => {
      const ts = formatTimestamp(scan.started_at);
      const dateKey = ts ? ts.date : 'Unknown date';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(scan);
    });
    // Sort dates in reverse chronological order
    const sortedDates = Object.keys(groups).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateB - dateA;
    });
    return sortedDates.map(date => ({ date, scans: groups[date] }));
  }, [filteredScans]);

  return (
    <div className="digital-page">
      <Sidebar />
      <div className="digital-page-content">
        {/* Header */}
        <div className="digital-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="rounded-circle px-2">
              <FiArrowLeft size={16} />
            </Button>
            <h2 className="mb-0">Scan History</h2>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-primary"
              onClick={fetchScanHistory}
              disabled={loading}
            >
              <FiRefreshCw className={`me-2 ${loading ? 'spinner-border spinner-border-sm' : ''}`} size={14} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        {!loading && scans.length > 0 && (
          <Row className="mb-4 g-3">
            <Col md={3} sm={6}>
              <Card className="border-0 p-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px', borderLeft: '4px solid #3B82F6' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase">Total Scans</span>
                    <h3 className="mb-0 fw-bold mt-1" style={{ color: '#3B82F6' }}>{scans.length}</h3>
                  </div>
                  <FiActivity size={24} style={{ color: '#3B82F6', opacity: 0.5 }} />
                </div>
              </Card>
            </Col>
            <Col md={3} sm={6}>
              <Card className="border-0 p-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px', borderLeft: '4px solid #10B981' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase">Completed</span>
                    <h3 className="mb-0 fw-bold mt-1" style={{ color: '#10B981' }}>{scans.filter(s => s.status === 'COMPLETED').length}</h3>
                  </div>
                  <FiShield size={24} style={{ color: '#10B981', opacity: 0.5 }} />
                </div>
              </Card>
            </Col>
            <Col md={3} sm={6}>
              <Card className="border-0 p-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px', borderLeft: '4px solid #EF4444' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase">Failed</span>
                    <h3 className="mb-0 fw-bold mt-1" style={{ color: '#EF4444' }}>{scans.filter(s => s.status === 'FAILED').length}</h3>
                  </div>
                  <FiZap size={24} style={{ color: '#EF4444', opacity: 0.5 }} />
                </div>
              </Card>
            </Col>
            <Col md={3} sm={6}>
              <Card className="border-0 p-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px', borderLeft: '4px solid #F59E0B' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase">Running</span>
                    <h3 className="mb-0 fw-bold mt-1" style={{ color: '#F59E0B' }}>{scans.filter(s => s.status === 'RUNNING').length}</h3>
                  </div>
                  <FiActivity size={24} style={{ color: '#F59E0B', opacity: 0.5 }} />
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Search */}
        <div className="card mb-4">
          <div className="card-body">
            <Form.Control
              type="text"
              placeholder="Search by target domain or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-3">Loading scan history...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-5">
            <div className="mb-3" style={{ fontSize: '3rem', opacity: 0.3 }}>⚠️</div>
            <p className="text-danger mb-1">{error}</p>
            <Button variant="outline-primary" onClick={fetchScanHistory} className="mt-2">
              <FiRefreshCw className="me-2" /> Retry
            </Button>
          </div>
        )}

        {/* Timeline */}
        {!loading && !error && groupedScans.length === 0 && (
          <div className="text-center py-5">
            <div className="mb-3" style={{ fontSize: '3rem', opacity: 0.2 }}>📋</div>
            <p className="text-muted">No scans found. Run a scan to see it here.</p>
          </div>
        )}

        {!loading && groupedScans.map((group) => (
          <div key={group.date} className="mb-4">
            {/* Date Header */}
            <div className="d-flex align-items-center mb-3">
              <div className="me-3 px-3 py-1 rounded-3 fw-semibold" style={{
                background: 'var(--header-bg)',
                border: '1px solid var(--header-border)',
                color: 'var(--text-color)',
                fontSize: '0.85rem',
              }}>
                {group.date}
              </div>
              <div style={{ flex: 1, height: '1px', background: 'var(--header-border)', opacity: 0.5 }} />
              <span className="ms-3 small text-muted">{group.scans.length} scan{group.scans.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Scan Cards */}
            <div className="d-flex flex-column gap-3">
              {group.scans.map((scan) => {
                const scanCfg = getScanConfig(scan.scan_type);
                const statusCfg = getStatusConfig(scan.status);
                const ScanIcon = scanCfg.icon;
                const started = formatTimestamp(scan.started_at);
                const completed = formatTimestamp(scan.completed_at);
                const duration = getDuration(scan.started_at, scan.completed_at);
                const isRunning = scan.status === 'RUNNING';

                return (
                  <Card
                    key={scan.id}
                    className="border-0 scan-history-card"
                    style={{
                      background: 'var(--header-bg)',
                      border: '1px solid var(--header-border)',
                      borderRadius: '14px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/scan-detail/${scan.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = scanCfg.color;
                      e.currentTarget.style.boxShadow = `0 4px 20px ${scanCfg.color}15`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--header-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Card.Body className="p-4">
                      <div className="d-flex align-items-start gap-4">
                        {/* Scan Type Icon */}
                        <div
                          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{
                            width: '46px',
                            height: '46px',
                            background: scanCfg.bgColor,
                            color: scanCfg.color,
                          }}
                        >
                          {isRunning ? (
                            <Spinner animation="grow" size="sm" style={{ color: statusCfg.color, width: '18px', height: '18px' }} />
                          ) : (
                            <ScanIcon size={20} />
                          )}
                        </div>

                        {/* Main Content */}
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                            <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>
                              {scanCfg.label}
                            </h6>
                            <Badge
                              pill
                              style={{
                                background: statusCfg.bgColor,
                                color: statusCfg.color,
                                fontWeight: 600,
                                fontSize: '0.72rem',
                                padding: '4px 10px',
                              }}
                            >
                              {isRunning && <Spinner animation="grow" size="sm" className="me-1" style={{ width: '6px', height: '6px' }} />}
                              {statusCfg.label}
                            </Badge>
                            <span className="small font-monospace" style={{ color: 'var(--text-muted, #64748b)' }}>
                              #{scan.id}
                            </span>
                          </div>

                          <p className="mb-2 small fw-medium" style={{ color: 'var(--text-secondary, #4a5568)' }}>
                            <FiGlobe size={12} className="me-1" />
                            {scan.target_domain || 'Unknown target'}
                          </p>

                          {/* Metadata Row */}
                          <div className="d-flex flex-wrap gap-3 small" style={{ color: 'var(--text-muted, #64748b)' }}>
                            {started && (
                              <span>
                                <span className="fw-semibold">Started:</span> {started.date} at {started.time}
                              </span>
                            )}
                            {completed && (
                              <span>
                                <span className="fw-semibold">Completed:</span> {completed.date} at {completed.time}
                              </span>
                            )}
                            {duration && (
                              <span>
                                <span className="fw-semibold">Duration:</span> {duration}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Result Counts */}
                        <div className="d-flex gap-2 flex-shrink-0">
                          {scan.vulnerability_count > 0 && (
                            <div
                              className="rounded-3 text-center px-3 py-2"
                              style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                minWidth: '60px',
                              }}
                            >
                              <div className="fw-bold" style={{ color: '#EF4444', fontSize: '1.1rem' }}>
                                {scan.vulnerability_count}
                              </div>
                              <div className="small text-muted" style={{ fontSize: '0.68rem', lineHeight: 1.1 }}>
                                Vulnerabilities
                              </div>
                            </div>
                          )}
                          {scan.status === 'COMPLETED' && scan.vulnerability_count === 0 && (
                            <div
                              className="rounded-3 text-center px-3 py-2"
                              style={{
                                background: 'rgba(16, 185, 129, 0.08)',
                                minWidth: '60px',
                              }}
                            >
                              <div className="fw-bold" style={{ color: '#10B981', fontSize: '1.1rem' }}>
                                0
                              </div>
                              <div className="small text-muted" style={{ fontSize: '0.68rem', lineHeight: 1.1 }}>
                                Issues
                              </div>
                            </div>
                          )}
                          {scan.result_file && (
                            <div
                              className="rounded-3 text-center px-3 py-2"
                              style={{
                                background: 'rgba(59, 130, 246, 0.08)',
                                minWidth: '48px',
                              }}
                            >
                              <div className="fw-bold" style={{ color: '#3B82F6', fontSize: '1.1rem' }}>
                                ✓
                              </div>
                              <div className="small text-muted" style={{ fontSize: '0.68rem', lineHeight: 1.1 }}>
                                Output
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScanHistoryPage;
