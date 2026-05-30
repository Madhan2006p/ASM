<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiDownload } from 'react-icons/fi';
import "../styles/DigitalFootprintsPage.css";
import axios from 'axios';
import { saveAs } from 'file-saver';
import { cleanupLocalStorageDomains, sanitizeSubdomainStr } from '../utils/domainSanitizer';
import { fetchAllPages } from '../utils/api';
import { useScan } from '../context/ScanContext';

const OpenPortsPage = () => {
  const { refreshKey } = useScan();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openPorts, setOpenPorts] = useState([]);
  const navigate = useNavigate();
  const { orgId } = useParams();
  const token = localStorage.getItem('accessToken');

  const normalizePort = (p) => {
    if (p && typeof p === 'object') return p;
    return { port: p, service: '', product: '', version: '' };
  };

  const formatPort = (p) => {
    const obj = normalizePort(p);
    const parts = [`Port ${obj.port}`];
    if (obj.service) parts.push(obj.service);
    if (obj.product) parts.push(obj.product);
    if (obj.version) parts.push(obj.version);
    return parts.join(' - ');
  };

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const fileSaverModule = await import('file-saver');
      const saveAs = fileSaverModule.saveAs || fileSaverModule.default?.saveAs || fileSaverModule.default;
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Open Ports');

      // Add headers
      worksheet.columns = [
        { header: 'S.No', key: 'id', width: 5 },
        { header: 'Domain', key: 'domain', width: 40 },
        { header: 'Ports', key: 'ports', width: 30 },
        { header: 'Created', key: 'created_at', width: 20 },
        { header: 'Last Updated', key: 'updated_at', width: 20 }
      ];

      // Add data
      openPorts.forEach((item, index) => {
        worksheet.addRow({
          id: index + 1,
          domain: item.domain || '-',
          ports: Array.isArray(item.ports) ? item.ports.map(p => formatPort(normalizePort(p))).join(', ') : '-',
          created_at: item.created_at ? formatDateShort(item.created_at) : '-',
          updated_at: item.updated_at ? formatDateShort(item.updated_at) : '-'
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
      saveAs(blob, `open_ports_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Fetch open ports data
  const fetchOpenPorts = async () => {
    try {
      const organizationId = orgId || '1';
      const allResults = await fetchAllPages('open-ports', organizationId);
      setOpenPorts(allResults);
      setError(null);
    } catch (err) {
      setError('Failed to fetch open ports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenPorts();
  }, [orgId, refreshKey]);

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

  // Handle modal open for ports
  const handleShowModal = (title, data) => {
    setModalTitle(title);
    setModalData(Array.isArray(data) ? data : []);
    setShowModal(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setModalTitle('');
    setModalData([]);
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
            <h2 className="mb-0">Open Ports {orgId && `(Organization: ${orgId})`}</h2>
          </div>
          <div>
            <Button variant="outline-primary" className="me-2" onClick={() => {
              setLoading(true);
              setTimeout(() => {
                fetchOpenPorts();
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
              placeholder="Search open ports by domain or port..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive rounded-3 border" style={{ background: 'var(--bg-color)', borderColor: 'var(--header-border)' }}>
          <Table hover className="open-ports-table mb-0 align-middle">
            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
              <tr>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>S.No</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Domain</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Ports</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Created</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {openPorts.length > 0 ? (
                openPorts
                  .filter(item => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                      (item.domain?.toLowerCase().includes(search)) ||
                      (item.ports && Array.isArray(item.ports) && item.ports.some(p => {
                        const obj = normalizePort(p);
                        return String(obj.port).includes(search) ||
                               (obj.service || '').toLowerCase().includes(search) ||
                               (obj.product || '').toLowerCase().includes(search) ||
                               (obj.version || '').toLowerCase().includes(search);
                      }))
                    );
                  })
                  .map((item, index) => {
                    const ports = Array.isArray(item.ports) ? item.ports : [];
                    
                    return (
                      <tr key={item.id}>
                        <td className="px-4">{index + 1}</td>
                        <td className="px-4">
                          {item.domain ? (
                            <span className="domain-name fw-medium" title={sanitizeSubdomainStr(item.domain)} style={{ color: 'var(--text-color)' }}>
                              {sanitizeSubdomainStr(item.domain)}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4" style={{ color: 'var(--text-color)' }}>
                          {ports.length > 0 ? <span>Open: <strong>{ports.map(formatPort).join(', ')}</strong></span> : <span className="text-muted fst-italic">No open ports</span>}
                        </td>
                        <td className="px-4 date-cell">
                          {item.created_at ? (
                            <span className="date-text" style={{ color: 'var(--text-color)', opacity: 0.8 }}>{formatExactTimestamp(item.created_at)}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 date-cell">
                          {item.updated_at ? (
                            <span className="date-text" style={{ color: 'var(--text-color)', opacity: 0.8 }}>{formatExactTimestamp(item.updated_at)}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    <p className="text-muted mb-0">No open ports found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* Empty State */}
        {openPorts.length === 0 && !loading && (
          <div className="text-center py-5">
            <p className="text-muted">No open ports found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenPortsPage;

=======
import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiDownload } from 'react-icons/fi';
import LockedFeatureOverlay from '../components/LockedFeatureOverlay';
import "../styles/DigitalFootprintsPage.css";
import axios from 'axios';
import { saveAs } from 'file-saver';
import { cleanupLocalStorageDomains, sanitizeSubdomainStr } from '../utils/domainSanitizer';
import { fetchAllPages } from '../utils/api';
import { useScan } from '../context/ScanContext';

const OpenPortsPage = () => {
  const { refreshKey, scanState } = useScan();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openPorts, setOpenPorts] = useState([]);
  const navigate = useNavigate();
  const { orgId } = useParams();

  const normalizePort = (p) => {
    if (p && typeof p === 'object') return p;
    return { port: p, service: '', product: '', version: '' };
  };

  const formatPort = (p) => {
    const obj = normalizePort(p);
    const parts = [`Port ${obj.port}`];
    if (obj.service) parts.push(obj.service);
    if (obj.product) parts.push(obj.product);
    if (obj.version) parts.push(obj.version);
    return parts.join(' - ');
  };

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const fileSaverModule = await import('file-saver');
      const saveAs = fileSaverModule.saveAs || fileSaverModule.default?.saveAs || fileSaverModule.default;
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Open Ports');

      // Add headers
      worksheet.columns = [
        { header: 'S.No', key: 'id', width: 5 },
        { header: 'Domain', key: 'domain', width: 40 },
        { header: 'Ports', key: 'ports', width: 30 },
        { header: 'Created', key: 'created_at', width: 20 },
        { header: 'Last Updated', key: 'updated_at', width: 20 }
      ];

      // Add data
      openPorts.forEach((item, index) => {
        worksheet.addRow({
          id: index + 1,
          domain: item.domain || '-',
          ports: Array.isArray(item.ports) ? item.ports.map(p => formatPort(normalizePort(p))).join(', ') : '-',
          created_at: item.created_at ? formatDateShort(item.created_at) : '-',
          updated_at: item.updated_at ? formatDateShort(item.updated_at) : '-'
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
      saveAs(blob, `open_ports_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Fetch open ports data
  const fetchOpenPorts = async () => {
    try {
      const activeScanId = scanState.scanId || localStorage.getItem("activeScanId");
      const allResults = await fetchAllPages('open-ports', activeScanId);
      
      // Deduplicate open ports by domain
      const seen = new Set();
      const uniqueResults = [];
      allResults.forEach(item => {
        const key = (item.domain || '').toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueResults.push(item);
        }
      });

      setOpenPorts(uniqueResults);
      setError(null);
    } catch (err) {
      setError('Failed to fetch open ports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenPorts();
  }, [refreshKey, JSON.stringify(scanState.phasesDone)]);

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

  // Handle modal open for ports
  const handleShowModal = (title, data) => {
    setModalTitle(title);
    setModalData(Array.isArray(data) ? data : []);
    setShowModal(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setModalTitle('');
    setModalData([]);
  };

  // Removed full-page loading and error states to ensure the page opens instantly

  return (
    <LockedFeatureOverlay featureId="3">
    <div className="digital-page">
      <Sidebar />
      <div className="digital-page-content">

        {/* Header */}
        <div className="digital-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="rounded-circle px-2">
              <FiArrowLeft size={16} />
            </Button>
            <h2 className="mb-0">Open Ports</h2>
          </div>
          <div>
            <Button variant="outline-primary" className="me-2" onClick={() => {
              setLoading(true);
              setTimeout(() => {
                fetchOpenPorts();
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
              placeholder="Search open ports by domain or port..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive rounded-3 border" style={{ background: 'var(--bg-color)', borderColor: 'var(--header-border)' }}>
          <Table hover className="open-ports-table mb-0 align-middle">
            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
              <tr>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>S.No</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Domain</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Ports</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Created</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {openPorts.length > 0 ? (
                openPorts
                  .filter(item => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                      (item.domain?.toLowerCase().includes(search)) ||
                      (item.ports && Array.isArray(item.ports) && item.ports.some(p => {
                        const obj = normalizePort(p);
                        return String(obj.port).includes(search) ||
                               (obj.service || '').toLowerCase().includes(search) ||
                               (obj.product || '').toLowerCase().includes(search) ||
                               (obj.version || '').toLowerCase().includes(search);
                      }))
                    );
                  })
                  .map((item, index) => {
                    const ports = Array.isArray(item.ports) ? item.ports : [];
                    
                    return (
                      <tr key={item.id}>
                        <td className="px-4">{index + 1}</td>
                        <td className="px-4">
                          {item.domain ? (
                            <span className="domain-name fw-medium" title={sanitizeSubdomainStr(item.domain)} style={{ color: 'var(--text-color)' }}>
                              {sanitizeSubdomainStr(item.domain)}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4" style={{ color: 'var(--text-color)' }}>
                          {ports.length > 0 ? <span>Open: <strong>{ports.map(formatPort).join(', ')}</strong></span> : <span className="text-muted fst-italic">No open ports</span>}
                        </td>
                        <td className="px-4 date-cell">
                          {item.created_at ? (
                            <span className="date-text" style={{ color: 'var(--text-color)', opacity: 0.8 }}>{formatExactTimestamp(item.created_at)}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 date-cell">
                          {item.updated_at ? (
                            <span className="date-text" style={{ color: 'var(--text-color)', opacity: 0.8 }}>{formatExactTimestamp(item.updated_at)}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    <p className="text-muted mb-0">No open ports found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* Empty State */}
        {openPorts.length === 0 && !loading && (
          <div className="text-center py-5">
            <p className="text-muted">No open ports found.</p>
          </div>
        )}
      </div>
    </div>
    </LockedFeatureOverlay>
  );
};

export default OpenPortsPage;

>>>>>>> latest
