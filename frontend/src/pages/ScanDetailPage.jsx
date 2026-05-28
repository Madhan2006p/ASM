import React, { useState, useEffect } from 'react';
import { Button, Spinner, Badge, Card, Row, Col, Table, Form } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
  FiArrowLeft, FiShield, FiSearch, FiGlobe, FiZap, FiCrosshair,
  FiLayers, FiMail, FiLock, FiServer, FiCode, FiBox, FiActivity,
  FiExternalLink, FiClock, FiDownload, FiFileText,
} from 'react-icons/fi';
import { VULNERABILITIES_URL } from '../utils/apiConfig';
import axios from 'axios';
import fileSaver from 'file-saver';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import "../styles/DigitalFootprintsPage.css";

const saveAs = fileSaver.saveAs || fileSaver;
const getExcelJS = () => {
  return ExcelJS.Workbook ? ExcelJS : (ExcelJS.default || ExcelJS);
};

const SCAN_TYPE_CONFIG = {
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

const formatTS = (dateString) => {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString(),
      full: d.toLocaleString(),
      raw: d,
    };
  } catch { return null; }
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

const getSeverityBadge = (severity) => {
  const s = String(severity).toUpperCase();
  if (s === 'CRITICAL') return <Badge bg="danger">CRITICAL</Badge>;
  if (s === 'HIGH') return <Badge bg="warning" text="dark">HIGH</Badge>;
  if (s === 'MEDIUM') return <Badge bg="primary">MEDIUM</Badge>;
  if (s === 'LOW') return <Badge bg="secondary">LOW</Badge>;
  return <Badge bg="secondary">{s}</Badge>;
};

const ScanDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const token = localStorage.getItem('accessToken');

  const [scanInfo, setScanInfo] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${VULNERABILITIES_URL}/by_scan/?scan_id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setScanInfo(res.data.scan);
        setVulnerabilities(res.data.vulnerabilities || []);
      } catch (err) {
        setError('Failed to load scan details. The scan may not exist or you may not have permission.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  const scanCfg = scanInfo ? (SCAN_TYPE_CONFIG[scanInfo.scan_type] || {
    label: scanInfo.scan_type || 'Unknown',
    icon: FiActivity,
    color: '#64748B',
    bgColor: 'rgba(100, 116, 139, 0.1)',
  }) : null;

  const statusCfg = scanInfo ? (STATUS_CONFIG[scanInfo.status] || {
    label: scanInfo.status || 'Unknown',
    color: '#64748B',
    bgColor: 'rgba(100, 116, 139, 0.1)',
  }) : null;

  const started = scanInfo ? formatTS(scanInfo.started_at) : null;
  const completed = scanInfo ? formatTS(scanInfo.completed_at) : null;
  const duration = scanInfo ? getDuration(scanInfo.started_at, scanInfo.completed_at) : null;
  const isRunning = scanInfo?.status === 'RUNNING';

  const filteredVulns = vulnerabilities.filter(v => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (v.title?.toLowerCase() || '').includes(s) ||
      (v.severity?.toLowerCase() || '').includes(s) ||
      (v.cve_id?.toLowerCase() || '').includes(s) ||
      (v.description?.toLowerCase() || '').includes(s)
    );
  });

  // Count by severity
  const severityCounts = React.useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    vulnerabilities.forEach(v => {
      const key = v.severity?.toUpperCase();
      if (key in counts) counts[key]++;
    });
    return counts;
  }, [vulnerabilities]);

  const ScanIcon = scanCfg?.icon || FiActivity;

  // ── Export to Excel ──
  const exportToExcel = async () => {
    if (vulnerabilities.length === 0) return;
    try {
      const Excel = getExcelJS();
      const workbook = new Excel.Workbook();
      const ws = workbook.addWorksheet('Vulnerabilities');

      ws.columns = [
        { header: '#', key: 'no', width: 5 },
        { header: 'Severity', key: 'severity', width: 12 },
        { header: 'CVE ID', key: 'cve_id', width: 18 },
        { header: 'CWE ID', key: 'cwe_id', width: 18 },
        { header: 'Title', key: 'title', width: 50 },
        { header: 'Description', key: 'description', width: 60 },
        { header: 'Remediation', key: 'remediation', width: 40 },
        { header: 'CVSS Score', key: 'cvss_score', width: 12 },
        { header: 'Source Tool', key: 'source_tool', width: 15 },
        { header: 'Discovered', key: 'discovered_on', width: 22 },
      ];

      vulnerabilities.forEach((vuln, idx) => {
        ws.addRow({
          no: idx + 1,
          severity: vuln.severity || '-',
          cve_id: vuln.cve_id || '-',
          cwe_id: vuln.cwe_id || '-',
          title: vuln.title || '-',
          description: vuln.description || '-',
          remediation: vuln.remediation || '-',
          cvss_score: vuln.cvss_score ?? '-',
          source_tool: vuln.source_tool || '-',
          discovered_on: vuln.discovered_on ? new Date(vuln.discovered_on).toLocaleString() : '-',
        });
      });

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const domain = scanInfo?.target_domain?.replace(/\./g, '_') || 'scan';
      saveAs(blob, `scan_${scanInfo?.id}_${domain}_vulnerabilities.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Failed to export Excel. Please try again.');
    }
  };

  // ── Export to PDF ──
  const exportToPDF = () => {
    if (vulnerabilities.length === 0) return;
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const domain = scanInfo?.target_domain || 'Unknown';
      const scanLabel = scanCfg?.label || scanInfo?.scan_type || 'Scan';

      // Title
      doc.setFontSize(16);
      doc.text(`Scan Report: ${scanLabel} — ${domain}`, 14, 18);

      // Subtitle
      doc.setFontSize(10);
      doc.setTextColor(100);
      const startedStr = started ? `${started.date} at ${started.time}` : 'N/A';
      doc.text(`Started: ${startedStr}  |  Status: ${statusCfg?.label || scanInfo?.status || 'N/A'}`, 14, 26);
      doc.text(`Severity: ${vulnerabilities.filter(v => v.severity?.toUpperCase() === 'CRITICAL').length} Critical, ${vulnerabilities.filter(v => v.severity?.toUpperCase() === 'HIGH').length} High, ${vulnerabilities.filter(v => v.severity?.toUpperCase() === 'MEDIUM').length} Medium, ${vulnerabilities.filter(v => v.severity?.toUpperCase() === 'LOW').length} Low`, 14, 32);

      // Table
      const rows = vulnerabilities.map((vuln, idx) => [
        idx + 1,
        vuln.severity || '-',
        vuln.cve_id || '-',
        vuln.title || '-',
        vuln.description ? vuln.description.substring(0, 120) + (vuln.description.length > 120 ? '...' : '') : '-',
        vuln.discovered_on ? new Date(vuln.discovered_on).toLocaleString() : '-',
      ]);

      doc.autoTable({
        startY: 38,
        head: [['#', 'Severity', 'CVE ID', 'Title', 'Description', 'Discovered']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 16 },
          2: { cellWidth: 26 },
          3: { cellWidth: 60 },
          4: { cellWidth: 120 },
          5: { cellWidth: 40 },
        },
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        },
      });

      const safeDomain = domain.replace(/\./g, '_');
      doc.save(`scan_${scanInfo?.id}_${safeDomain}_report.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  return (
    <div className="digital-page">
      <Sidebar />
      <div className="digital-page-content">
        {/* Header */}
        <div className="digital-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate('/scan-history')} className="rounded-circle px-2">
              <FiArrowLeft size={16} />
            </Button>
            <h2 className="mb-0">Scan Details</h2>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-danger" size="sm" onClick={exportToPDF} disabled={vulnerabilities.length === 0}>
              <FiFileText className="me-1" size={14} /> PDF
            </Button>
            <Button variant="outline-success" size="sm" onClick={exportToExcel} disabled={vulnerabilities.length === 0}>
              <FiDownload className="me-1" size={14} /> Excel
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={() => navigate('/scan-history')}>
              <FiArrowLeft className="me-1" size={14} /> Back
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-3">Loading scan details...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-5">
            <div className="mb-3" style={{ fontSize: '3rem', opacity: 0.3 }}>⚠️</div>
            <p className="text-danger mb-1">{error}</p>
            <Button variant="outline-primary" onClick={() => navigate('/scan-history')} className="mt-2">
              Return to Scan History
            </Button>
          </div>
        )}

        {!loading && !error && scanInfo && (
          <>
            {/* Scan Summary Card */}
            <Card className="border-0 mb-4" style={{
              background: 'var(--header-bg)',
              border: '1px solid var(--header-border)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}>
              <div className="p-4" style={{
                background: `linear-gradient(135deg, ${scanCfg?.color}08 0%, transparent 100%)`,
                borderBottom: '1px solid var(--header-border)',
              }}>
                <div className="d-flex align-items-center gap-4">
                  {/* Icon */}
                  <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{
                    width: '56px', height: '56px',
                    background: scanCfg?.bgColor,
                    color: scanCfg?.color,
                  }}>
                    {isRunning ? (
                      <Spinner animation="grow" size="sm" style={{ color: statusCfg?.color, width: '22px', height: '22px' }} />
                    ) : (
                      <ScanIcon size={26} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                      <h4 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>
                        {scanCfg?.label} Scan
                      </h4>
                      <Badge pill style={{
                        background: statusCfg?.bgColor,
                        color: statusCfg?.color,
                        fontWeight: 600, fontSize: '0.75rem', padding: '5px 12px',
                      }}>
                        {isRunning && <Spinner animation="grow" size="sm" className="me-1" style={{ width: '6px', height: '6px' }} />}
                        {statusCfg?.label}
                      </Badge>
                    </div>
                    <p className="mb-0 fw-medium" style={{ color: 'var(--text-secondary, #4a5568)' }}>
                      <FiGlobe size={13} className="me-1" />
                      {scanInfo.target_domain || 'Unknown target'}
                      <span className="ms-3 text-muted font-monospace" style={{ fontSize: '0.82rem' }}>
                        #{scanInfo.id}
                      </span>
                    </p>
                  </div>

                  {/* Quick Stats */}
                  <div className="d-flex gap-3 flex-shrink-0">
                    <div className="text-center px-3 py-2 rounded-3" style={{ background: 'rgba(239, 68, 68, 0.06)', minWidth: '60px' }}>
                      <div className="fw-bold" style={{ color: '#EF4444', fontSize: '1.2rem' }}>{vulnerabilities.length}</div>
                      <div className="small text-muted" style={{ fontSize: '0.68rem', lineHeight: 1.1 }}>Findings</div>
                    </div>
                    {duration && (
                      <div className="text-center px-3 py-2 rounded-3" style={{ background: 'rgba(59, 130, 246, 0.06)', minWidth: '60px' }}>
                        <div className="fw-bold" style={{ color: '#3B82F6', fontSize: '1.2rem' }}>{duration}</div>
                        <div className="small text-muted" style={{ fontSize: '0.68rem', lineHeight: 1.1 }}>Duration</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata Row */}
              <Card.Body className="p-3" style={{ background: 'rgba(0,0,0,0.02)' }}>
                <Row className="g-2 small text-muted">
                  {started && (
                    <Col xs="auto">
                      <FiClock size={12} className="me-1" />
                      <span className="fw-semibold">Started:</span> {started.date} at {started.time}
                    </Col>
                  )}
                  {completed && (
                    <Col xs="auto">
                      <FiClock size={12} className="me-1" />
                      <span className="fw-semibold">Completed:</span> {completed.date} at {completed.time}
                    </Col>
                  )}
                  {scanInfo.result_file && (
                    <Col xs="auto">
                      <FiExternalLink size={12} className="me-1" />
                      {scanInfo.result_file}
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>

            {/* Severity Breakdown */}
            {vulnerabilities.length > 0 && (
              <Row className="mb-4 g-2">
                {Object.entries(severityCounts).map(([sev, count]) => {
                  const colors = {
                    CRITICAL: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)' },
                    HIGH:     { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' },
                    MEDIUM:   { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)' },
                    LOW:      { color: '#64748B', bg: 'rgba(100, 116, 139, 0.08)' },
                    INFO:     { color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.08)' },
                  };
                  const c = colors[sev] || { color: '#64748B', bg: 'rgba(100, 116, 139, 0.08)' };
                  return count > 0 ? (
                    <Col key={sev} xs={6} md={2}>
                      <div className="rounded-3 text-center p-2" style={{ background: c.bg }}>
                        <div className="fw-bold" style={{ color: c.color, fontSize: '1.1rem' }}>{count}</div>
                        <div className="small" style={{ color: c.color, fontSize: '0.7rem', opacity: 0.8 }}>{sev}</div>
                      </div>
                    </Col>
                  ) : null;
                })}
              </Row>
            )}

            {/* Search */}
            <div className="card mb-3">
              <div className="card-body py-3">
                <Form.Control
                  type="text"
                  placeholder="Search by title, severity, CVE, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Vulnerability Table */}
            <div className="table-responsive rounded-3 border" style={{ background: 'var(--bg-color)', borderColor: 'var(--header-border)' }}>
              <Table hover className="vulnerabilities-table mb-0 align-middle">
                <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                  <tr>
                    <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>#</th>
                    <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Severity</th>
                    <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>CVE / CWE</th>
                    <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Title</th>
                    <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Discovered</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVulns.length > 0 ? (
                    filteredVulns.map((vuln, idx) => (
                      <tr key={vuln.id}>
                        <td className="px-4 text-muted">{idx + 1}</td>
                        <td className="px-4">{getSeverityBadge(vuln.severity)}</td>
                        <td className="px-4">
                          {vuln.cve_id && (
                            <span className="badge rounded-pill me-1" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontWeight: 500 }}>
                              {vuln.cve_id}
                            </span>
                          )}
                          {vuln.cwe_id && (
                            <span className="badge rounded-pill" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontWeight: 500 }}>
                              {vuln.cwe_id}
                            </span>
                          )}
                          {!vuln.cve_id && !vuln.cwe_id && <span className="text-muted small">-</span>}
                        </td>
                        <td className="px-4">
                          <div className="fw-medium" style={{ color: 'var(--text-color)', maxWidth: '400px' }}>
                            {vuln.title}
                          </div>
                          {vuln.description && (
                            <div className="small text-muted text-truncate" style={{ maxWidth: '400px', fontSize: '0.78rem' }}>
                              {vuln.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4">
                          {vuln.discovered_on ? (
                            <div style={{ lineHeight: '1.2' }}>
                              <div style={{ color: 'var(--text-primary, #1e293b)', fontWeight: 500, fontSize: '0.82rem' }}>
                                {new Date(vuln.discovered_on).toLocaleDateString()}
                              </div>
                              <div style={{ color: 'var(--text-primary, #1e293b)', opacity: 0.6, fontSize: '0.72rem' }}>
                                {new Date(vuln.discovered_on).toLocaleTimeString()}
                              </div>
                            </div>
                          ) : <span className="text-muted small">-</span>}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        {searchTerm ? 'No vulnerabilities match your search.' : 'No vulnerabilities found for this scan.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScanDetailPage;
