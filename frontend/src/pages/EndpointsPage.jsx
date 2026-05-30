import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiDownload } from 'react-icons/fi';
import LockedFeatureOverlay from '../components/LockedFeatureOverlay';
import "../styles/DigitalFootprintsPage.css";
import axios from 'axios';
import { saveAs } from 'file-saver';
import { sanitizeSubdomainStr } from '../utils/domainSanitizer';
import { fetchAllPages } from '../utils/api';
import { useScan } from '../context/ScanContext';

// Helper component for recursive Tree Nodes in Endpoint Map View
const TreeNode = ({ name, node, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const childrenKeys = Object.keys(node.children || {});
  const hasChildren = childrenKeys.length > 0;
  const hasEndpoints = node.endpoints && node.endpoints.length > 0;

  return (
    <div style={{ marginLeft: level > 0 ? 20 : 0, marginTop: '2px', marginBottom: '2px' }} className="tree-node-wrapper">
      <div 
        className="d-flex align-items-center justify-content-between py-0.5 px-2.5 rounded-2 hover-node"
        style={{ 
          background: 'transparent', 
          border: 'none',
          cursor: hasChildren ? 'pointer' : 'default',
          transition: 'all 0.2s ease-in-out'
        }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <div className="d-flex align-items-center gap-2">
          {hasChildren ? (
            <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} text-muted`} style={{ fontSize: '0.8rem' }}></i>
          ) : (
            <span style={{ width: 12 }}></span>
          )}
          <i className={`bi ${hasChildren ? 'bi-folder-fill text-warning' : 'bi-file-earmark-code text-info'}`}></i>
          <span className="fw-semibold" style={{ fontSize: '0.85rem', color: 'var(--text-primary, #1e293b)' }}>{name}</span>
          
          {hasEndpoints && node.endpoints.map(ep => {
            const method = ep.method || (ep.http_url.includes('login') ? 'POST' : 'GET');
            const getMethodBadge = (m) => {
              switch(m.toUpperCase()) {
                case 'GET': return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.25)' };
                case 'POST': return { bg: 'rgba(249, 115, 22, 0.12)', color: '#F97316', border: '1px solid rgba(249, 115, 22, 0.25)' };
                case 'PUT': return { bg: 'rgba(234, 179, 8, 0.12)', color: '#EAB308', border: '1px solid rgba(234, 179, 8, 0.25)' };
                case 'DELETE': return { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.25)' };
                default: return { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748B', border: '1px solid rgba(100, 116, 139, 0.25)' };
              }
            };
            const style = getMethodBadge(method);
            return (
              <span 
                key={ep.id} 
                className="badge fw-bold text-uppercase px-1.5 py-0.5 rounded" 
                style={{ 
                  fontSize: '0.65rem', 
                  backgroundColor: style.bg, 
                  color: style.color, 
                  border: style.border 
                }}
              >
                {method}
              </span>
            );
          })}
        </div>

        <div className="d-flex align-items-center gap-2">
          {hasEndpoints && node.endpoints.map(ep => {
            const threatCount = ep.threat_count || (ep.http_status === 403 ? 1 : (ep.http_status === 404 ? 1 : 0));
            const status = ep.http_status || 200;
            return (
              <div key={ep.id} className="d-flex align-items-center gap-2">
                <span className={`badge ${status >= 200 && status < 400 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                  {status}
                </span>
                {threatCount > 0 && (
                  <span 
                    className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0.5 rounded-pill d-flex align-items-center gap-1 animate-pulse" 
                    style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 600,
                      boxShadow: '0 0 6px rgba(239, 68, 68, 0.15)',
                    }}
                    title={`${threatCount} vulnerabilities`}
                  >
                    <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '0.72rem' }}></i>
                    {threatCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="ps-2 mt-0.5" style={{ borderLeft: '1px dashed rgba(30, 41, 59, 0.15)', marginLeft: '8px' }}>
          {childrenKeys.map(childName => (
            <TreeNode 
              key={childName} 
              name={childName} 
              node={node.children[childName]} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Tree-building helper functions
const buildPathTree = (endpointsList) => {
  const root = { name: "/", children: {}, endpoints: [], isRoot: true };
  
  endpointsList.forEach(ep => {
    let path = "/";
    try {
      const urlObj = new URL(ep.http_url);
      path = urlObj.pathname;
    } catch (e) {
      const match = ep.http_url.match(/https?:\/\/[^\/]+(\/.*)/);
      if (match) {
        path = match[1];
      }
    }
    
    // Normalize path
    if (!path.startsWith('/')) path = '/' + path;
    const segments = path.split('/').filter(s => s !== "");
    
    if (segments.length === 0) {
      root.endpoints.push(ep);
    } else {
      let current = root;
      segments.forEach((seg, idx) => {
        if (!current.children[seg]) {
          current.children[seg] = {
            name: seg,
            children: {},
            endpoints: []
          };
        }
        if (idx === segments.length - 1) {
          current.children[seg].endpoints.push(ep);
        }
        current = current.children[seg];
      });
    }
  });
  return root;
};

const getSubdomainTree = (endpointsList) => {
  const grouped = {};
  endpointsList.forEach(ep => {
    const sub = ep.subdomain_name || "unknown";
    if (!grouped[sub]) {
      grouped[sub] = [];
    }
    grouped[sub].push(ep);
  });
  
  const treeGrouped = {};
  Object.keys(grouped).forEach(sub => {
    treeGrouped[sub] = buildPathTree(grouped[sub]);
  });
  return treeGrouped;
};

const EndpointsPage = () => {
  const { refreshKey, scanState } = useScan();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'tree'
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
      const worksheet = workbook.addWorksheet('Endpoints');

      // Add headers in the exact order of API response
      worksheet.columns = [
        { header: 'S.No', key: 'id', width: 5 },
        { header: 'URL', key: 'http_url', width: 40 },
        { header: 'Subdomain', key: 'subdomain_name', width: 30 },
        { header: 'Status Code', key: 'http_status', width: 15 },
        { header: 'Content Type', key: 'content_type', width: 20 },
        { header: 'Content Length', key: 'content_length', width: 15 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Status', key: 'is_alive', width: 15 },
        { header: 'Discovered At', key: 'discovered_at', width: 20 },
        { header: 'Last Scanned', key: 'last_scan', width: 20 }
      ];

      // Add data
      endpoints.forEach((item, index) => {
        worksheet.addRow({
          id: index + 1,
          http_url: item.http_url || '-',
          subdomain_name: item.subdomain_name || '-',
          http_status: item.http_status || '-',
          content_type: item.content_type || '-',
          content_length: item.content_length ? `${item.content_length} bytes` : '-',
          title: item.title || '-',
          is_alive: item.is_alive ? 'Live' : 'Down',
          discovered_at: item.discovered_at ? new Date(item.discovered_at).toLocaleString() : '-',
          last_scan: item.last_scan ? new Date(item.last_scan).toLocaleString() : '-'
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
      saveAs(blob, `endpoints_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Fetch endpoints data
  const fetchEndpoints = async () => {
    try {
      const activeScanId = scanState.scanId || localStorage.getItem("activeScanId");
      const allResults = await fetchAllPages('endpoints', activeScanId);
      
      // Deduplicate endpoints by http_url
      const seen = new Set();
      const uniqueResults = [];
      allResults.forEach(item => {
        const key = (item.http_url || '').toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueResults.push(item);
        }
      });

      setEndpoints(uniqueResults);
      setError(null);
    } catch (err) {
      setError('Failed to fetch endpoints. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, [refreshKey, JSON.stringify(scanState.phasesDone)]);

  useEffect(() => {
    const styleId = "endpoint-tree-styles";
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      styleElement.innerHTML = `
        .hover-node:hover {
          background-color: rgba(255, 255, 255, 0.06) !important;
          transform: translateX(3px);
        }
        .animate-pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
      `;
      document.head.appendChild(styleElement);
    }
  }, []);

  // Get status badge for HTTP status codes
  const getStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">Unknown</Badge>;
    
    if (status >= 200 && status < 300) {
      return <Badge bg="success">{status}</Badge>;
    } else if (status >= 300 && status < 400) {
      return <Badge bg="info">{status}</Badge>;
    } else if (status >= 400 && status < 500) {
      return <Badge bg="warning">{status}</Badge>;
    } else if (status >= 500) {
      return <Badge bg="danger">{status}</Badge>;
    } else {
      return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // Get status badge for live/down status
  const getLiveStatusBadge = (isAlive) => {
    return isAlive ? 
      <Badge bg="success">Live</Badge> : 
      <Badge bg="danger">Down</Badge>;
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


  // Parse technologies array
  const parseTechnologies = (tech) => {
    if (!tech) return [];
    if (Array.isArray(tech)) return tech.filter(t => t && typeof t === 'string');
    if (typeof tech === 'string') return [tech];
    return [];
  };

  // Handle modal open for technologies
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
    <LockedFeatureOverlay featureId="2">
    <div className="digital-page">
      <Sidebar />
      <div className="digital-page-content">

        {/* Header */}
        <div className="digital-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="rounded-circle px-2">
              <FiArrowLeft size={16} />
            </Button>
            <h2 className="mb-0">Endpoints</h2>
          </div>
          <div>
            <Button variant="outline-primary" className="me-2" onClick={() => {
              setLoading(true);
              setTimeout(() => {
                fetchEndpoints();
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
              placeholder="Search endpoints by URL, title, or subdomain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* View Mode Toggle Row */}
        <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded border" style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)' }}>
          <div className="d-flex gap-2">
            <Button 
              variant={viewMode === 'table' ? 'primary' : 'outline-primary'} 
              onClick={() => setViewMode('table')}
              className="d-flex align-items-center gap-2"
              style={{ borderRadius: '8px', fontWeight: 500 }}
            >
              <i className="bi bi-table"></i> Table View
            </Button>
            <Button 
              variant={viewMode === 'tree' ? 'primary' : 'outline-primary'} 
              onClick={() => setViewMode('tree')}
              className="d-flex align-items-center gap-2"
              style={{ borderRadius: '8px', fontWeight: 500 }}
            >
              <i className="bi bi-diagram-3"></i> Endpoint Map View
            </Button>
          </div>
          <div className="small text-muted fw-semibold">
            Found {endpoints.filter(item => {
              if (!searchTerm) return true;
              const search = searchTerm.toLowerCase();
              return (
                (item.http_url?.toLowerCase().includes(search)) ||
                (item.title?.toLowerCase().includes(search)) ||
                (item.subdomain_name?.toLowerCase().includes(search)) ||
                (item.content_type?.toLowerCase().includes(search)) ||
                (item.http_status?.toString().includes(search))
              );
            }).length} endpoints
          </div>
        </div>

        {/* Endpoint Details Modal */}
        {selectedEndpoint && (
          <div className="modal-backdrop" onClick={() => setSelectedEndpoint(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h5 className="modal-title">Endpoint Details</h5>
                <Button 
                  variant="close" 
                  onClick={() => setSelectedEndpoint(null)}
                ></Button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>URL:</strong>
                    <p className="mb-0">
                      <a 
                        href={selectedEndpoint.http_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-break"
                      >
                        {selectedEndpoint.http_url}
                      </a>
                    </p>
                  </div>
                  <div className="col-md-6">
                    <strong>Subdomain:</strong>
                    <p className="mb-0">{selectedEndpoint.subdomain_name || '-'}</p>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Status Code:</strong>
                    <p className="mb-0">{getStatusBadge(selectedEndpoint.http_status)}</p>
                  </div>
                  <div className="col-md-6">
                    <strong>Content Type:</strong>
                    <p className="mb-0">{selectedEndpoint.content_type || '-'}</p>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Content Length:</strong>
                    <p className="mb-0">{selectedEndpoint.content_length ? `${selectedEndpoint.content_length} bytes` : '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <strong>Title:</strong>
                    <p className="mb-0">{selectedEndpoint.title || '-'}</p>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Status:</strong>
                    <p className="mb-0">{getLiveStatusBadge(selectedEndpoint.is_alive)}</p>
                  </div>
                  <div className="col-md-6">
                    <strong>Discovered At:</strong>
                    <p className="mb-0">{formatExactTimestamp(selectedEndpoint.discovered_at)}</p>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <strong>Last Scanned:</strong>
                    <p className="mb-0">{formatExactTimestamp(selectedEndpoint.last_scan)}</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setSelectedEndpoint(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Table with exact API response order */}
        {viewMode === 'table' ? (
          <div className="table-responsive rounded-3 border" style={{ background: 'var(--bg-color)', borderColor: 'var(--header-border)' }}>
            <Table hover className="endpoints-table mb-0 align-middle">
              <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                <tr>
                  <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>S.No</th>
                  <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>HTTP URL</th>
                  <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Subdomain</th>
                  <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Status</th>
                  <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Technologies</th>
                  <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Title</th>
                  <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Content Type</th>
                  <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Content Length</th>
                  <th className="py-3 px-4 fw-semibold border-bottom-0 date-cell" style={{ color: 'var(--text-color)' }}>Created</th>
                  <th className="py-3 px-4 fw-semibold border-bottom-0 date-cell" style={{ color: 'var(--text-color)' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.length > 0 ? (
                  endpoints
                    .filter(item => {
                      if (!searchTerm) return true;
                      const search = searchTerm.toLowerCase();
                      return (
                        (item.http_url?.toLowerCase().includes(search)) ||
                        (item.title?.toLowerCase().includes(search)) ||
                        (item.subdomain_name?.toLowerCase().includes(search)) ||
                        (item.content_type?.toLowerCase().includes(search)) ||
                        (item.http_status?.toString().includes(search))
                      );
                    })
                    .map((item, index) => {
                      const technologies = parseTechnologies(item.technologies);
                      const maxVisible = 3;
                      const techVisible = technologies.slice(0, maxVisible);
                      const techMore = technologies.length - maxVisible;
                      
                      return (
                        <tr key={item.id}>
                          <td className="px-4">{index + 1}</td>
                          <td className="px-4">
                            <div className="url-cell">
                              <a 
                                href={item.http_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title={item.http_url}
                              >
                                {item.http_url}
                              </a>
                            </div>
                          </td>
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
                            {item.http_status >= 200 && item.http_status < 400 ? (
                              <span className="status-active-text fw-semibold" style={{ color: '#10B981' }}>Active</span>
                            ) : (
                              <span className="text-muted fw-semibold" style={{ color: '#EF4444' }}>Inactive</span>
                            )}
                          </td>
                          <td className="px-4">
                            <div className="chips-container">
                              {techVisible.map((tech, i) => (
                                <span key={i} className="tech-chip" title={tech}>{tech}</span>
                              ))}
                              {techMore > 0 && (
                                <span 
                                  className="chip-more chip-clickable" 
                                  onClick={() => handleShowModal('Technologies', technologies)}
                                  title="Click to view all technologies"
                                >
                                  +{techMore}
                                </span>
                              )}
                              {technologies.length === 0 && <span className="text-muted">-</span>}
                            </div>
                          </td>
                          <td className="px-4 title-cell">
                            {item.title ? (
                              <span className="title-text fw-medium" title={item.title} style={{ color: 'var(--text-color)' }}>
                                {item.title}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="px-4">
                            {item.content_type ? (
                              <span className="badge rounded-pill" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', fontWeight: 500 }} title={item.content_type}>
                                {item.content_type}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="px-4">
                            {item.content_length ? (
                              <span className="content-length fw-medium" style={{ color: 'var(--text-color)' }}>
                                {item.content_length.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted">0</span>
                            )}
                          </td>
                          <td className="px-4 date-cell">
                            {renderExactTimestamp(item.discovered_at)}
                          </td>
                          <td className="px-4 date-cell">
                            {renderExactTimestamp(item.last_scan)}
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan="10" className="text-center py-4">
                      <p className="text-muted mb-0">No endpoints found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="p-4 rounded-3 border" style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)', minHeight: '300px' }}>
            {(() => {
              const filtered = endpoints.filter(item => {
                if (!searchTerm) return true;
                const search = searchTerm.toLowerCase();
                return (
                  (item.http_url?.toLowerCase().includes(search)) ||
                  (item.title?.toLowerCase().includes(search)) ||
                  (item.subdomain_name?.toLowerCase().includes(search)) ||
                  (item.content_type?.toLowerCase().includes(search)) ||
                  (item.http_status?.toString().includes(search))
                );
              });
              
              const treeGrouped = getSubdomainTree(filtered);
              const subdomainsList = Object.keys(treeGrouped);
              
              if (subdomainsList.length === 0) {
                return (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">No matching endpoints found for your search query.</p>
                  </div>
                );
              }
              
              return subdomainsList.map(sub => (
                <div key={sub} className="mb-4 p-3 rounded border" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.04)' }}>
                  <h6 className="text-primary fw-bold mb-3 d-flex align-items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                    <i className="bi bi-globe2"></i> {sub}
                  </h6>
                  <div className="ps-2">
                    <TreeNode name="/" node={treeGrouped[sub]} />
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {/* Technologies Modal */}
        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>{modalTitle}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {modalData.length > 0 ? (
              <div className="modal-items-container">
                {modalData.map((item, index) => (
                  <div key={index} className="modal-item">
                    <span className="tech-chip">{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No items to display.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* No results message */}
        {endpoints.length === 0 && !loading && (
          <div className="text-center py-4">
            <p className="text-muted">No endpoints found.</p>
          </div>
        )}
      </div>
    </div>
    </LockedFeatureOverlay>
  );
};

export default EndpointsPage;