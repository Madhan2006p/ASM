import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiDownload } from 'react-icons/fi';
import "../styles/DigitalFootprintsPage.css";
import axios from 'axios';
import { saveAs } from 'file-saver';
import { cleanupLocalStorageDomains, sanitizeSubdomainStr } from '../utils/domainSanitizer';
import { fetchAllPages } from '../utils/api';
import { useScan } from '../context/ScanContext';

const DirectoriesPage = () => {
  const { refreshKey, scanState } = useScan();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [directories, setDirectories] = useState([]);
  const navigate = useNavigate();
  const { orgId } = useParams();
  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const fileSaverModule = await import('file-saver');
      const saveAs = fileSaverModule.saveAs || fileSaverModule.default?.saveAs || fileSaverModule.default;
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Directories');

      // Add headers
      worksheet.columns = [
        { header: 'S.No', key: 'id', width: 5 },
        { header: 'URL', key: 'url', width: 50 },
        { header: 'Subdomain', key: 'subdomain_name', width: 30 },
        { header: 'Content Type', key: 'content_type', width: 25 },
        { header: 'Content Details', key: 'content_details', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Discovered Date', key: 'discovered_date', width: 20 }
      ];

      // Add data
      directories.forEach((item, index) => {
        worksheet.addRow({
          id: index + 1,
          url: item.url || '-',
          subdomain_name: item.subdomain_name || '-',
          content_type: item.content_type || '-',
          content_details: item.content_details || '-',
          status: item.status || '-',
          discovered_date: item.discovered_date ? new Date(item.discovered_date).toLocaleString() : '-'
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
      saveAs(blob, `directories_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Fetch directories data
  const fetchDirectories = async () => {
    try {
      const activeScanId = scanState.scanId || localStorage.getItem("activeScanId");
      const allResults = await fetchAllPages('directories', activeScanId);
      
      // Deduplicate directories by url
      const seen = new Set();
      const uniqueResults = [];
      allResults.forEach(item => {
        const key = (item.url || '').toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueResults.push(item);
        }
      });

      setDirectories(uniqueResults);
      setError(null);
    } catch (err) {
      setError('Failed to fetch directories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectories();
  }, [refreshKey, JSON.stringify(scanState.phasesDone)]);

  // Get status badge
  const getStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">Unknown</Badge>;
    
    // Handle numeric status codes
    if (typeof status === 'number' || !isNaN(status)) {
      const code = parseInt(status);
      if (code >= 200 && code < 300) return <Badge bg="success">{code}</Badge>;
      if (code >= 300 && code < 400) return <Badge bg="info">{code}</Badge>;
      if (code >= 400 && code < 500) return <Badge bg="warning">{code}</Badge>;
      if (code >= 500) return <Badge bg="danger">{code}</Badge>;
      return <Badge bg="secondary">{code}</Badge>;
    }

    const statusLower = String(status).toLowerCase();
    if (statusLower === 'active') {
      return <Badge bg="success">Active</Badge>;
    } else if (statusLower === 'redirect') {
      return <Badge bg="info">Redirect</Badge>;
    } else if (statusLower.includes('error')) {
      return <Badge bg="danger">{status}</Badge>;
    } else {
      return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // Format date in exact timestamp format (locale representation)
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

  // Removed full-page loading and error states to ensure the page opens instantly

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
            <h2 className="mb-0">Directories</h2>
          </div>
          <div>
            <Button variant="outline-primary" className="me-2" onClick={() => {
              setLoading(true);
              setTimeout(() => {
                fetchDirectories();
              }, 500);
            }}>
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </Button>
            <Button variant="outline-secondary" onClick={exportToExcel}>
              <FiDownload className="me-2" /> Export to Excel
            </Button>
          </div>
        </div>

        {/* Search Box */}
        <div className="card mb-4">
          <div className="card-body">
            <Form.Control
              type="text"
              placeholder="Search directories by URL, subdomain, or content type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive rounded-3 border" style={{ background: 'var(--bg-color)', borderColor: 'var(--header-border)' }}>
          <Table hover className="directories-table mb-0 align-middle">
            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
              <tr>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Subdomain</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Directories</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Status</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Directories Created</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Created</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {directories.length > 0 ? (
                directories
                  .filter(item => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                      (item.url?.toLowerCase() || '').includes(search) ||
                      (item.subdomain_name?.toLowerCase() || '').includes(search) ||
                      (item.content_type?.toLowerCase() || '').includes(search) ||
                      (item.content_details?.toLowerCase() || '').includes(search)
                    );
                  })
                  .map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4">
                        {item.subdomain_name ? (
                          <span className="subdomain-name fw-medium" title={sanitizeSubdomainStr(item.subdomain_name)} style={{ color: 'var(--text-color)' }}>
                            {sanitizeSubdomainStr(item.subdomain_name)}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4">
                        <div className="directories-cell">
                          {/* URL - Teal colored */}
                          {item.url && (
                            <div className="directory-url">
                              <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="url-link fw-medium"
                                title={item.url}
                                style={{ color: '#0ea5e9', textDecoration: 'none' }}
                              >
                                {item.url}
                              </a>
                            </div>
                          )}
                          {/* Content Type - Light blue badge */}
                          {item.content_type && (
                            <div className="directory-content-type">
                              <span className="badge rounded-pill" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', fontWeight: 500 }}>
                                {item.content_type}
                              </span>
                            </div>
                          )}
                          {/* Content Details - Light purple badge */}
                          {item.content_details && (
                            <div className="directory-content-details">
                              <span className="badge rounded-pill" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', fontWeight: 500 }}>
                                {item.content_details}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4">
                        <div className="status-active-glow">
                          {getStatusBadge(item.status)}
                        </div>
                      </td>
                      <td className="px-4">
                        {item.directories_created ? (
                          <span className="date-text" style={{ color: 'var(--text-color)', opacity: 0.8 }}>{formatExactTimestamp(item.directories_created)}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4">
                        {item.created ? (
                          <span className="date-text" style={{ color: 'var(--text-color)', opacity: 0.8 }}>{formatExactTimestamp(item.created)}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4">
                        {item.updated ? (
                          <span className="date-text" style={{ color: 'var(--text-color)', opacity: 0.8 }}>{formatExactTimestamp(item.updated)}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <p className="text-muted mb-0">No directories found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* No results message */}
        {directories.length === 0 && !loading && (
          <div className="text-center py-4">
            <p className="text-muted">No directories found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectoriesPage;

