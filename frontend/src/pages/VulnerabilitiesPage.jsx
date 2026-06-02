import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiDownload, FiActivity } from 'react-icons/fi';
import LockedFeatureOverlay from '../components/LockedFeatureOverlay';
import "../styles/DigitalFootprintsPage.css";
import axios from 'axios';
import fileSaver from 'file-saver';
import ExcelJS from 'exceljs';
import { cleanupLocalStorageDomains, sanitizeSubdomainStr } from '../utils/domainSanitizer';
import { fetchAllPages, sendVulnerabilitiesToFaraday } from '../utils/api';
import { useScan } from '../context/ScanContext';

const saveAs = fileSaver.saveAs || fileSaver;
const getExcelJS = () => {
  return ExcelJS.Workbook ? ExcelJS : (ExcelJS.default || ExcelJS);
};

const VulnerabilitiesPage = () => {
  const { refreshKey, scanState, addLog, setFaradayImporting, setFaradayResult } = useScan();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [faradayLoading, setFaradayLoading] = useState(false);
  const [faradayError, setFaradayError] = useState(null);
  const [faradaySuccess, setFaradaySuccess] = useState(null);
  const [error, setError] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [prevVulnPhase, setPrevVulnPhase] = useState("pending");
  const [showTransition, setShowTransition] = useState(false);

  const vulnScanPhase = scanState.vulnScanPhase || "pending";
  const isDeepScanning = vulnScanPhase === "basic";
  const isTransitioning = showTransition;
  const navigate = useNavigate();
  const { orgId } = useParams();
  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const Excel = getExcelJS();
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Vulnerabilities');

      // Add headers
      worksheet.columns = [
        { header: 'S.No', key: 'id', width: 5 },
        { header: 'Domain', key: 'domain', width: 30 },
        { header: 'Subdomain', key: 'subdomain', width: 30 },
        { header: 'Vulnerability ID', key: 'vulnerability_id', width: 30 },
        { header: 'Severity', key: 'severity', width: 15 },
        { header: 'CVE', key: 'cve', width: 15 },
        { header: 'Finding', key: 'finding', width: 50 },
        { header: 'Discovered At', key: 'discovered_at', width: 20 }
      ];

      // Add data
      vulnerabilities.forEach((item, index) => {
        worksheet.addRow({
          id: index + 1,
          domain: sanitizeSubdomainStr(item.domain) || '-',
          subdomain: sanitizeSubdomainStr(item.subdomain) || '-',
          vulnerability_id: item.vulnerability_id || '-',
          severity: item.severity || '-',
          cve: item.cve || '-',
          finding: item.finding || '-',
          discovered_at: item.discovered_at ? formatExactTimestamp(item.discovered_at) : '-'
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
      saveAs(blob, `vulnerabilities_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Send vulnerabilities to Faraday
  const handleSendToFaraday = async () => {
    setFaradayLoading(true);
    setFaradayError(null);
    setFaradaySuccess(null);
    setFaradayImporting(true);
    addLog("[+] Sending vulnerabilities to Faraday...", "info");

    try {
      const activeScanId = scanState.scanId || localStorage.getItem("activeScanId");
      if (!activeScanId) {
        throw new Error("No active scan found");
      }
      const result = await sendVulnerabilitiesToFaraday(activeScanId);
      const count = result.created || 0;
      const total = result.total_vulnerabilities || 0;
      setFaradaySuccess(`${count} of ${total} vulnerabilities sent to Faraday successfully!`);
      setFaradayResult(count, null);
      addLog(`[+] ${count} of ${total} vulnerabilities imported to Faraday successfully`, "success");
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Failed to send to Faraday';
      setFaradayError(msg);
      setFaradayResult(0, msg);
      addLog(`[!] Faraday import failed: ${msg}`, "crit");
    } finally {
      setFaradayLoading(false);
      setFaradayImporting(false);
    }
  };

  // Fetch vulnerabilities data
  const fetchVulnerabilities = async () => {
    try {
      const activeScanId = scanState.scanId || localStorage.getItem("activeScanId");
      const allResults = await fetchAllPages('vulnerabilities', activeScanId);
      
      // Deduplicate vulnerabilities by vulnerability_id + subdomain + finding
      const seen = new Set();
      const uniqueResults = [];
      allResults.forEach(item => {
        const key = `${item.vulnerability_id || ''}|${item.subdomain || ''}|${item.finding || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueResults.push(item);
        }
      });

      setVulnerabilities(uniqueResults);
      setError(null);
    } catch (err) {
      setError('Failed to fetch vulnerabilities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Track phase transition to re-fetch when deep scan completes
  useEffect(() => {
    if (prevVulnPhase === "basic" && vulnScanPhase === "complete") {
      // Deep scan finished — PythonScanner results were replaced, re-fetch
      setShowTransition(true);
      setLoading(true);
      setTimeout(() => {
        fetchVulnerabilities().finally(() => {
          setShowTransition(false);
        });
      }, 600);
    }
    setPrevVulnPhase(vulnScanPhase);
  }, [vulnScanPhase]);

  useEffect(() => {
    fetchVulnerabilities();
  }, [refreshKey, JSON.stringify(scanState.phasesDone)]);

  // Format date
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

// Get severity badge with memoization
const getSeverityBadge = React.useCallback((severity) => {
  const s = String(severity).toUpperCase();
  if (s === 'CRITICAL') return <Badge bg="danger">CRITICAL</Badge>;
  if (s === 'HIGH') return <Badge bg="warning" text="dark">HIGH</Badge>;
  if (s === 'MEDIUM') return <Badge bg="primary">MEDIUM</Badge>;
  if (s === 'LOW') return <Badge bg="secondary">LOW</Badge>;
  return <Badge bg="secondary">{s}</Badge>;
}, []);


  // Removed full-page loading state to ensure instant open

  return (
    <LockedFeatureOverlay featureId="6">
    <div className="digital-page">
      <Sidebar />
      <div className="digital-page-content">
        <div className="digital-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="rounded-circle px-2">
              <FiArrowLeft size={16} />
            </Button>
            <h2 className="mb-0">Vulnerabilities</h2>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-primary"
              className="me-2"
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  fetchVulnerabilities();
                }, 500);
              }}
            >
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </Button>
            <Button
              variant="outline-warning"
              onClick={handleSendToFaraday}
              disabled={faradayLoading || vulnerabilities.length === 0}
              className="d-flex align-items-center gap-2"
            >
              {faradayLoading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />
                  Sending to Faraday...
                </>
              ) : (
                <>
                  <FiActivity size={16} />
                  Send to Faraday
                </>
              )}
            </Button>
            <Button variant="outline-secondary" onClick={exportToExcel} className="d-flex align-items-center gap-2">
              <FiDownload size={16} /> Export to Excel
            </Button>
          </div>
        </div>

        {/* Faraday import status */}
        {faradaySuccess && (
          <Alert variant="success" dismissible onClose={() => setFaradaySuccess(null)} className="py-2">
            <FiActivity size={16} className="me-2" />{faradaySuccess}
          </Alert>
        )}
        {faradayError && (
          <Alert variant="danger" dismissible onClose={() => setFaradayError(null)} className="py-2">
            <FiActivity size={16} className="me-2" />{faradayError}
          </Alert>
        )}

        {/* Deep scan in progress banner */}
        {isDeepScanning && (
          <Alert variant="info" className="py-3 mb-4 d-flex align-items-center" style={{
            background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.1), rgba(139, 92, 246, 0.08))',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 12,
          }}>
            <div className="me-3">
              <Spinner animation="grow" size="sm" variant="primary" className="me-1" />
              <Spinner animation="grow" size="sm" variant="info" className="me-1" style={{ animationDelay: '0.2s' }} />
              <Spinner animation="grow" size="sm" variant="secondary" style={{ animationDelay: '0.4s' }} />
            </div>
            <div>
              <strong className="d-block" style={{ color: '#0ea5e9', fontSize: '0.95rem' }}>
                Basic scan complete — Deep scan in progress
              </strong>
              <small style={{ color: '#94a3b8' }}>
                Initial findings shown below are from the Python scanner (headers, config, exposed ports). 
                Nuclei is now running a thorough CVE &amp; misconfiguration scan — results will replace these shortly.
              </small>
            </div>
          </Alert>
        )}

        {/* Transition animation overlay */}
        {isTransitioning && (
          <Alert variant="warning" className="py-3 mb-4 d-flex align-items-center" style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.1), rgba(139, 92, 246, 0.08))',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 12,
          }}>
            <Spinner animation="border" size="sm" variant="warning" className="me-3" />
            <div>
              <strong className="d-block" style={{ color: '#f59e0b', fontSize: '0.95rem' }}>
                Deep scan complete — Loading Nuclei findings...
              </strong>
              <small style={{ color: '#94a3b8' }}>
                The basic PythonScanner results are being replaced with comprehensive Nuclei findings.
              </small>
            </div>
          </Alert>
        )}

        <div className="card mb-4">
          <div className="card-body">
            <Form.Control
              type="text"
              placeholder="Search by ID, domain, CVE or severity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive rounded-3 border" style={{ background: 'var(--bg-color)', borderColor: 'var(--header-border)' }}>
          <Table hover className="vulnerabilities-table mb-0 align-middle">
            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
              <tr>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>S.No</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Vulnerability ID</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Domain / Subdomain</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Severity</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Source Tool</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>CVE / CWE</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Finding</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Discovered</th>
              </tr>
            </thead>
            <tbody>
              {vulnerabilities.length > 0 ? (
                vulnerabilities
                  .filter(item => {
                    if (!searchTerm) return true;
                    const s = searchTerm.toLowerCase();
                    return (
                      (item.vulnerability_id?.toLowerCase() || '').includes(s) ||
                      (item.domain?.toLowerCase() || '').includes(s) ||
                      (item.subdomain?.toLowerCase() || '').includes(s) ||
                      (item.severity?.toLowerCase() || '').includes(s) ||
                      (item.source_tool?.toLowerCase() || '').includes(s) ||
                      (item.cve?.toLowerCase() || '').includes(s)
                    );
                  })
                  .map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4">{index + 1}</td>
                      <td className="px-4 fw-bold text-primary">{item.vulnerability_id}</td>
                      <td className="px-4">
                        <div className="fw-medium" style={{ color: 'var(--text-color)' }}>{sanitizeSubdomainStr(item.domain)}</div>
                        {item.subdomain !== '-' && <div className="small text-muted">{sanitizeSubdomainStr(item.subdomain)}</div>}
                      </td>
                      <td className="px-4">{getSeverityBadge(item.severity)}</td>
                      <td className="px-4">
                        {item.source_tool ? (
                          <span className="badge rounded-pill" style={{
                            background: item.source_tool === 'Wapiti' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                            color: item.source_tool === 'Wapiti' ? '#8B5CF6' : '#64748b',
                            fontWeight: 500,
                            padding: '4px 10px',
                            fontSize: '0.78rem'
                          }}>
                            {item.source_tool === 'Wapiti' && <i className="bi bi-shield-exclamation me-1"></i>}
                            {item.source_tool}
                          </span>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </td>
                      <td className="px-4">
                        <div>{item.cve !== '-' ? <span className="badge rounded-pill" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontWeight: 500 }}>{item.cve}</span> : null}</div>
                        <div className="mt-1">{item.cwe !== '-' ? <span className="badge rounded-pill" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontWeight: 500 }}>{item.cwe}</span> : null}</div>
                      </td>
                      <td className="px-4">
                        <div className="text-wrap text-muted" style={{maxWidth: '300px', fontSize: '0.9rem', lineHeight: '1.4'}}>
                          {item.finding}
                        </div>
                      </td>
                      <td className="px-4 date-cell">
                        {renderExactTimestamp(item.discovered_at)}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>                    <td colSpan="8" className="text-center py-4">No vulnerabilities found.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* Deep scan loader at bottom */}
        {isDeepScanning && (
          <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.02), rgba(56, 189, 248, 0.04))',
            border: '1px dashed rgba(56, 189, 248, 0.3)',
            borderRadius: 16,
            marginTop: 16,
          }}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="spinner-grow text-primary" role="status" style={{ width: '1.2rem', height: '1.2rem', animationDuration: '1.2s' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <div className="spinner-grow text-info" role="status" style={{ width: '1rem', height: '1rem', animationDuration: '1.2s', animationDelay: '0.3s' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <div className="spinner-grow text-secondary" role="status" style={{ width: '0.8rem', height: '0.8rem', animationDuration: '1.2s', animationDelay: '0.6s' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <div className="text-center">
              <strong style={{ color: '#0ea5e9', fontSize: '1.1rem' }}>Deep Scan in Progress</strong>
              <p className="mb-0 mt-1" style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: 400 }}>
                Nuclei is running thousands of CVE and misconfiguration templates. 
                These basic findings will be replaced with comprehensive results once complete.
              </p>
            </div>
            <div className="mt-3 d-flex gap-3">
              <span className="badge rounded-pill" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '6px 14px' }}>
                CVE Scan
              </span>
              <span className="badge rounded-pill" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', padding: '6px 14px' }}>
                Misconfigurations
              </span>
              <span className="badge rounded-pill" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', padding: '6px 14px' }}>
                Exposures
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
    </LockedFeatureOverlay>
  );
};

export default VulnerabilitiesPage;
