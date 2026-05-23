import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
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
const getExcelJS = () => {
  return ExcelJS.Workbook ? ExcelJS : (ExcelJS.default || ExcelJS);
};

const VulnerabilitiesPage = () => {
  const { refreshKey } = useScan();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const navigate = useNavigate();
  const { orgId } = useParams();
  const token = localStorage.getItem('accessToken');

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

  // Fetch vulnerabilities data
  const fetchVulnerabilities = async () => {
    try {
      const organizationId = orgId || '1';
      const allResults = await fetchAllPages('vulnerabilities', organizationId);
      setVulnerabilities(allResults);
      setError(null);
    } catch (err) {
      setError('Failed to fetch vulnerabilities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVulnerabilities();
  }, [orgId, refreshKey]);

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
    <div className="digital-page">
      <Sidebar />
      <div className="digital-page-content">
        <div className="digital-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="rounded-circle px-2">
              <FiArrowLeft size={16} />
            </Button>
            <h2 className="mb-0">Vulnerabilities {orgId && `(Organization: ${orgId})`}</h2>
          </div>
          <div>
            <Button variant="outline-primary" className="me-2" onClick={() => {
              setLoading(true);
              setTimeout(() => {
                fetchVulnerabilities();
              }, 500);
            }}>
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </Button>
            <Button variant="outline-secondary" onClick={exportToExcel} className="d-flex align-items-center gap-2">
              <FiDownload size={16} /> Export to Excel
            </Button>
          </div>
        </div>

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
                      item.vulnerability_id?.toLowerCase().includes(s) ||
                      item.domain?.toLowerCase().includes(s) ||
                      item.subdomain?.toLowerCase().includes(s) ||
                      item.severity?.toLowerCase().includes(s) ||
                      item.cve?.toLowerCase().includes(s)
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
                <tr>
                  <td colSpan="7" className="text-center py-4">No vulnerabilities found.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default VulnerabilitiesPage;
