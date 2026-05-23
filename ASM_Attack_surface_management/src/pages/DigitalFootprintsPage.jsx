import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Spinner, Alert, Modal, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiDownload } from 'react-icons/fi';
import "../styles/DigitalFootprintsPage.css";
import axios from 'axios';
import { saveAs } from 'file-saver';
import { fetchAllPages } from '../utils/api';
import { getRootDomain, sanitizeSubdomainStr, combineSubdomainAndRoot } from '../utils/domainSanitizer';
import { useScan } from '../context/ScanContext';

const DigitalFootprintsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subdomains, setSubdomains] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Smart scan wizard states
  const [wizardStep, setWizardStep] = useState("input_subdomain"); // input_subdomain, ask_domain_type, select_existing, enter_new, confirm_rescan, scanning
  const [inputSubdomainName, setInputSubdomainName] = useState("");
  const [selectedExistingDomain, setSelectedExistingDomain] = useState("");
  const [newRootDomain, setNewRootDomain] = useState("");
  const [specificPrefix, setSpecificPrefix] = useState("");

  // Scan simulation states
  const [scanTargetName, setScanTargetName] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState("");
  const [scanPhaseIndex, setScanPhaseIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [activeScan, setActiveScan] = useState(null);
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'info', onConfirm: null });
  const { startScan: contextStartScan, scanState, refreshKey } = useScan();

   // Compute unique domains dynamically with memoization
   const uniqueDomains = React.useMemo(() => {
     const domainsSet = new Set();
     subdomains.forEach(s => {
       const root = getRootDomain(s.domain);
       if (root) domainsSet.add(root);
     });
     return Array.from(domainsSet);
   }, [subdomains]);

   const processedSubdomains = React.useMemo(() => {
     // First, filter by search term if any
     const filtered = subdomains.filter(item => {
       if (!searchTerm) return true;
       return item.domain?.toLowerCase().includes(searchTerm.toLowerCase());
     });

     // Enrich items with computed values to avoid repeated calculations in render
     const enriched = filtered.map(item => {
       const domain = item.domain || '';
       const rootDomain = getRootDomain(domain).toLowerCase() || "unknown";
       const isApex = rootDomain === domain.toLowerCase();
       const statusInfo = getStatusInfo(item.status);
       
       return {
         ...item,
         _computed: {
           rootDomain,
           isApex,
           statusInfo,
           ipCount: item.ip && Array.isArray(item.ip) ? item.ip.length : 0,
           dnsCount: item.dns_records ? item.dns_records.length : 0,
           vulnCount: item.vulnerabilities_count || 0
         }
       };
     });

     // Now, let's group by root domain
     const groups = {};
     enriched.forEach(item => {
       const root = item._computed.rootDomain;
       if (!groups[root]) {
         groups[root] = [];
       }
       groups[root].push(item);
     });

     // Sort the root domains alphabetically
     const sortedRoots = Object.keys(groups).sort();

     const result = [];
     sortedRoots.forEach(root => {
       const items = groups[root];
       // Separate apex domain and subdomains
       const apexItems = items.filter(item => item._computed.isApex);
       const subItems = items.filter(item => !item._computed.isApex);

       // Sort subdomains alphabetically by domain name
       subItems.sort((a, b) => a.domain.localeCompare(b.domain));

       // Add apex items first, then subdomains
       result.push(...apexItems);
       result.push(...subItems);
     });

     return result;
   }, [subdomains, searchTerm]);

  const getOrgId = () => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const fromUser = u.organization_id;
      const fromUrl = new URLSearchParams(window.location.search).get('org_id');
      return String(fromUser || fromUrl || '1');
    } catch {
      return new URLSearchParams(window.location.search).get('org_id') || '1';
    }
  };

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const fileSaverModule = await import('file-saver');
      const saveAs = fileSaverModule.saveAs || fileSaverModule.default?.saveAs || fileSaverModule.default;
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Subdomains');

      // Add headers
      worksheet.columns = [
        { header: 'S.No', key: 'id', width: 5 },
        { header: 'Domain', key: 'domain', width: 30 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Title', key: 'title', width: 40 },
        { header: 'Technologies', key: 'technologies', width: 30 },
        { header: 'IP', key: 'ip', width: 20 },
        { header: 'Ports', key: 'ports', width: 15 },
        { header: 'WAF', key: 'waf', width: 20 },
        { header: 'CDN', key: 'cdn', width: 20 },
        { header: 'Created Date', key: 'created_at', width: 20 },
        { header: 'Updated Date', key: 'updated_at', width: 20 }
      ];

      // Add data
      subdomains.forEach((item, index) => {
        worksheet.addRow({
          id: index + 1,
          domain: item.domain || '-',
          status: item.status || '-',
          title: item.title || '-',
          technologies: Array.isArray(item.technologies) ? item.technologies.join(', ') : '-',
          ip: Array.isArray(item.ip) ? item.ip.join(', ') : '-',
          ports: Array.isArray(item.ports) ? item.ports.join(', ') : '-',
          waf: item.waf && item.waf !== 'Yet to Enable' ? item.waf : '-',
          cdn: item.cdn && item.cdn !== 'Yet to Enable' ? item.cdn : '-',
          created_at: item.created_at ? new Date(item.created_at).toLocaleString() : '-',
          updated_at: item.updated_at ? new Date(item.updated_at).toLocaleString() : '-'
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
      saveAs(blob, `subdomains_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Fetch subdomain data
  const fetchSubdomains = async () => {
    try {
      const orgId = getOrgId();
      const allResults = await fetchAllPages('subdomains', orgId);
      setSubdomains(allResults.map(s => ({
        ...s,
        dns_records: s.dns_records || [],
        vulnerabilities_count: s.vulnerabilities_count || 0,
        technologies: s.technologies || [],
        ip: s.ip || [],
        ports: s.ports || [],
      })));
      setError(null);
    } catch (err) {
      setError('Failed to fetch subdomains. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubdomains();
  }, [refreshKey]);

  const runSimulatedScan = (target) => {
    setIsScanning(true);
    setScanTargetName(target);
    setActiveScan(target);
    contextStartScan(target);
  };

  useEffect(() => {
    if (!scanState.isScanning && !isScanning && scanState.target && !scanState.scanId) {
      return;
    }
  }, [scanState.isScanning]);

  const handleWizardSubmit = (e) => {
    e.preventDefault();
    if (wizardStep === "input_subdomain") {
      let rawVal = inputSubdomainName.trim().toLowerCase();
      rawVal = rawVal.replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
      rawVal = sanitizeSubdomainStr(rawVal);
      if (!rawVal) return;

      const existing = subdomains.find(s => s.domain === rawVal);
      if (existing) {
        setScanTargetName(rawVal);
        setWizardStep("confirm_rescan");
      } else {
        setInputSubdomainName(rawVal);
        
        // Auto-extract root domain and prefix
        const parts = rawVal.split('.');
        if (parts.length > 2) {
          const root = parts.slice(-2).join('.');
          const prefix = parts.slice(0, -2).join('.');
          setNewRootDomain(root);
          setSpecificPrefix(prefix);
          if (uniqueDomains.includes(root)) {
            setSelectedExistingDomain(root);
          } else {
            setSelectedExistingDomain("");
          }
        } else {
          setNewRootDomain(rawVal);
          setSpecificPrefix("");
          setSelectedExistingDomain("");
        }

        setWizardStep("ask_domain_type");
      }
    }
  };

  const handleExistingDomainSubmit = (e) => {
    e.preventDefault();
    if (!selectedExistingDomain) return;
    
    const targetSub = sanitizeSubdomainStr(combineSubdomainAndRoot(specificPrefix, selectedExistingDomain));

    const existing = subdomains.find(s => s.domain === targetSub);
    if (existing) {
      setScanTargetName(targetSub);
      setWizardStep("confirm_rescan");
    } else {
      runSimulatedScan(targetSub);
    }
  };

  const handleNewDomainSubmit = (e) => {
    e.preventDefault();
    let root = newRootDomain.trim().toLowerCase();
    root = root.replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
    if (!root) return;
    
    const targetSub = sanitizeSubdomainStr(combineSubdomainAndRoot(specificPrefix, root));

    const existing = subdomains.find(s => s.domain === targetSub);
    if (existing) {
      setScanTargetName(targetSub);
      setWizardStep("confirm_rescan");
    } else {
      runSimulatedScan(targetSub);
    }
  };

   const getStatusInfo = React.useCallback((status) => {
     // Handle both string status ('Active'/'Inactive'/'Down'/'Scanning') and numeric status codes
     let text = 'Inactive';
     let isActive = false;
     let isScanning = false;

     if (typeof status === 'string') {
       const lower = status.toLowerCase();
       if (lower === 'active') {
         isActive = true;
         text = 'Active';
       } else if (lower === 'scanning') {
         isScanning = true;
         text = 'Scanning';
       }
     } else if (typeof status === 'number') {
       isActive = status >= 200 && status < 400;
       text = isActive ? 'Active' : 'Inactive';
     }
     
     return {
       text: text,
       bgColor: isActive ? '#e8f5e9' : (isScanning ? '#fff8e1' : '#ffebee'),
       textColor: isActive ? '#2e7d32' : (isScanning ? '#b78103' : '#d32f2f'),
       dotColor: isActive ? '#4caf50' : (isScanning ? '#ffb300' : '#f44336')
     };
   }, []);

  const parseArrayData = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') {
      for (const key of ['technologies', 'detected', 'items']) {
        if (Array.isArray(data[key])) return data[key];
      }
      return Object.values(data);
    }
    return [String(data)];
  };

  const parseTechnologies = (tech) => {
    const arr = parseArrayData(tech);
    return arr.filter(t => t && typeof t === 'string');
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

  // Handle modal open for technologies, IPs, or Ports
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
            <h2 className="mb-0">Subdomains</h2>
          </div>
          <div>
            <Button variant="primary" className="me-2" onClick={() => {
              setWizardStep("input_subdomain");
              setInputSubdomainName('');
              setSpecificPrefix('');
              setSelectedExistingDomain('');
              setNewRootDomain('');
              setShowAddModal(true);
            }}>
              <i className="bi bi-plus-circle"></i> Add Subdomain
            </Button>
            <Button variant="outline-primary" className="me-2" onClick={() => {
              setLoading(true);
              setTimeout(() => {
                fetchSubdomains();
              }, 500);
            }}>
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </Button>
            <Button variant="outline-secondary" onClick={exportToExcel}>
              <FiDownload className="me-2" /> Export to Excel
            </Button>
          </div>
        </div>

        {/* Real-time Scanning Progress Widget */}
        {activeScan && (
          <Card className="mb-4 border-primary" style={{ background: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold text-primary">
                  <Spinner animation="grow" size="sm" className="me-2" variant="primary" />
                  Scanner active on: <span className="text-decoration-underline">{activeScan}</span>
                </span>
                <span className="fw-semibold text-primary">{scanProgress}%</span>
              </div>
              <div className="progress mb-2" style={{ height: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px' }}>
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated" 
                  role="progressbar" 
                  style={{ width: `${scanProgress}%`, borderRadius: '4px' }}
                ></div>
              </div>
              <div className="text-muted small">
                <strong>Current Field:</strong> {scanPhase}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Add subdomain logic migrated to interactive double-prompt modal dialog */}

        {/* Search Box */}
        <div className="card mb-4">
          <div className="card-body">
            <Form.Control
              type="text"
              placeholder="Search subdomains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive rounded-3 border" style={{ background: 'var(--bg-color)', borderColor: 'var(--header-border)' }}>
          <Table hover className="subdomains-table mb-0 align-middle">
            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
              <tr>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Domain / Asset</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Scan Status</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Hosted</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>IP Count</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>DNS Count</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Vulnerability Count</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Updated At</th>
              </tr>
            </thead>
             <tbody>
               {processedSubdomains.map((item, index) => {
                   const { _computed } = item;
                   const isHosted = _computed.ipCount > 0;
                   
                   // Circular Progress Logic
                   const progress = _computed.statusInfo.text === 'Active' ? 100 : (_computed.statusInfo.text === 'Scanning' ? 50 : 0);
                   const progressColor = _computed.statusInfo.text === 'Active' ? '#10B981' : (_computed.statusInfo.text === 'Scanning' ? '#F59E0B' : '#EF4444');

                   return (
                     <tr key={item.id} className="align-middle">
                       <td className="px-4 py-3 fw-medium" style={{ color: 'var(--text-color)' }}>
                         {(() => {
                           if (_computed.isApex) {
                             return (
                               <div className="d-flex align-items-center flex-wrap gap-2">
                                 <i className="bi bi-globe text-primary" style={{ fontSize: '1rem' }} title="Apex Domain"></i>
                                 <span style={{ fontWeight: 600 }}>{item.domain}</span>
                                 <span className="badge rounded-pill" style={{
                                   backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                   color: '#3B82F6',
                                   padding: '4px 8px',
                                   fontSize: '0.72rem',
                                   fontWeight: 600
                                 }}>Apex Domain</span>
                               </div>
                             );
                           } else {
                             return (
                               <div className="d-flex align-items-center flex-wrap gap-2" style={{ paddingLeft: '1.25rem' }}>
                                 <span className="text-muted font-monospace" style={{ opacity: 0.6 }}>└─</span>
                                 <i className="bi bi-diagram-2" style={{ color: '#8B5CF6', fontSize: '0.9rem' }} title="Subdomain"></i>
                                 <span style={{ fontWeight: 500, opacity: 0.9 }}>{item.domain}</span>
                                 <span className="badge rounded-pill" style={{
                                   backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                   color: '#8B5CF6',
                                   padding: '4px 8px',
                                   fontSize: '0.72rem',
                                   fontWeight: 600
                                 }}>Subdomain</span>
                               </div>
                             );
                           }
                         })()}
                       </td>
                       <td className="px-4 py-3">
                         <div className="d-flex align-items-center" title={`Status: ${_computed.statusInfo.text}`}>
                           <div style={{ position: 'relative', width: '36px', height: '36px' }} className="me-2">
                             <svg width="36" height="36" viewBox="0 0 36 36">
                               <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
                               <path
                                 d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                 fill="none"
                                 stroke={progressColor}
                                 strokeWidth="3"
                                 strokeDasharray={`${progress}, 100`}
                                 style={{ transition: 'stroke-dasharray 0.5s ease', strokeLinecap: 'round' }}
                               />
                             </svg>
                             {progress === 100 ? (
                               <i className="bi bi-check" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: progressColor, fontSize: '1.2rem' }}></i>
                             ) : progress === 0 ? (
                               <i className="bi bi-x" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: progressColor, fontSize: '1.2rem' }}></i>
                             ) : (
                               <Spinner animation="border" size="sm" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: progressColor, width: '12px', height: '12px', borderWidth: '2px' }} />
                             )}
                           </div>
                           <span style={{ fontSize: '0.85rem', color: 'var(--text-color)', opacity: 0.8 }}>
                             {progress === 100 ? 'Completed' : progress === 0 ? 'Failed' : 'Scanning'}
                           </span>
                         </div>
                       </td>
                       <td className="px-4 py-3">
                         <span className="badge rounded-pill" style={{ 
                           backgroundColor: isHosted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                           color: isHosted ? '#10B981' : '#EF4444',
                           padding: '6px 12px',
                           fontWeight: 500
                         }}>
                           {isHosted ? 'Yes' : 'No'}
                         </span>
                       </td>
                       <td className="px-4 py-3" style={{ color: 'var(--text-color)' }}>
                         <div className="d-flex align-items-center">
                           <div className="rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '28px', height: '28px', background: 'rgba(59, 130, 246, 0.1)' }}>
                             <span style={{ color: '#3B82F6', fontWeight: 600, fontSize: '0.85rem' }}>{_computed.ipCount}</span>
                           </div>
                         </div>
                       </td>
                       <td className="px-4 py-3" style={{ color: 'var(--text-color)' }}>
                         <div className="d-flex align-items-center">
                           <div className="rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '28px', height: '28px', background: 'rgba(139, 92, 246, 0.1)' }}>
                             <span style={{ color: '#8B5CF6', fontWeight: 600, fontSize: '0.85rem' }}>{_computed.dnsCount}</span>
                           </div>
                         </div>
                       </td>
                       <td className="px-4 py-3" style={{ color: 'var(--text-color)' }}>
                         <div className="d-flex align-items-center">
                           {_computed.vulnCount > 0 ? (
                             <span className="badge rounded-pill bg-danger" style={{ padding: '6px 10px' }}>
                               <i className="bi bi-bug me-1"></i> {_computed.vulnCount}
                             </span>
                           ) : (
                             <span style={{ opacity: 0.5 }}>-</span>
                           )}
                         </div>
                       </td>
                       <td className="px-4 py-3 date-cell">
                         {renderExactTimestamp(item.updated_at)}
                       </td>
                     </tr>
                   );
                 })}
                {sortedSubdomains.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      <p className="text-muted mb-0">No subdomains found.</p>
                    </td>
                  </tr>
                )}
            </tbody>
          </Table>
        </div>

        {/* Empty State */}
        {subdomains.length === 0 && !loading && (
          <div className="text-center py-5">
            <p className="text-muted">No subdomains found.</p>
          </div>
        )}

        {/* Technologies/IPs/Ports Modal */}
        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>{modalTitle}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {modalData.length > 0 ? (
              <div className="modal-items-container">
                {modalData.map((item, index) => (
                  <div key={index} className="modal-item">
                    {modalTitle === 'Technologies' && (
                      <span className="tech-chip">{item}</span>
                    )}
                    {modalTitle === 'IP Addresses' && (
                      <span className="ip-chip">{item}</span>
                    )}
                    {modalTitle === 'Ports' && (
                      <span className="port-chip">{item}</span>
                    )}
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

        {/* Reusable Small Notification Modal */}
        <Modal show={notification.show} onHide={() => setNotification({ ...notification, show: false })} centered size="sm">
          <Modal.Header closeButton>
            <Modal.Title className="fs-6 fw-semibold">{notification.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="py-3 text-center">
            <p className="mb-0 text-muted small">{notification.message}</p>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0 d-flex justify-content-center gap-2">
            {notification.type === 'confirm' ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setNotification({ ...notification, show: false })} className="px-3" style={{ borderRadius: '8px' }}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={() => {
                  setNotification({ ...notification, show: false });
                  if (notification.onConfirm) notification.onConfirm();
                }} className="px-3" style={{ borderRadius: '8px' }}>
                  Yes, Rescan
                </Button>
              </>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setNotification({ ...notification, show: false })} className="px-4" style={{ borderRadius: '8px' }}>
                OK
              </Button>
            )}
          </Modal.Footer>
        </Modal>

        {/* ADD SUBDOMAIN MODAL */}
        <Modal show={showAddModal} onHide={() => !isScanning && setShowAddModal(false)} centered>
          <Modal.Header closeButton={!isScanning}>
            <Modal.Title className="fw-semibold">
              {isScanning ? "Scanning Surface..." : "Add & Scan Subdomain"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            
            {isScanning ? (
              <div className="text-center py-2">
                <h5 className="fw-semibold mb-3">Scanning {scanTargetName}</h5>
                
                {/* 3-card stats block */}
                <div className="row g-2 mb-4">
                  <div className="col-4">
                    <div className="p-2.5 rounded-3 text-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.12)' }}>
                      <div className="text-muted fw-semibold" style={{ fontSize: '0.72rem' }}>Total Tasks</div>
                      <div className="h4 mb-0 fw-bold text-primary">6</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2.5 rounded-3 text-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                      <div className="text-muted fw-semibold" style={{ fontSize: '0.72rem' }}>Completed</div>
                      <div className="h4 mb-0 fw-bold text-success">{scanPhaseIndex}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2.5 rounded-3 text-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
                      <div className="text-muted fw-semibold" style={{ fontSize: '0.72rem' }}>Remaining</div>
                      <div className="h4 mb-0 fw-bold text-warning">{6 - scanPhaseIndex}</div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress mb-4" style={{ height: '8px', background: 'rgba(0, 0, 0, 0.05)', borderRadius: '4px' }}>
                  <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${scanProgress}%`, borderRadius: '4px' }}></div>
                </div>

                {/* Vertical Checklist Stepper */}
                <div className="d-flex flex-column gap-2 text-start bg-light p-3 rounded-3 border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  {[
                    "Initializing Passive Discovery (Subfinder, Amass)",
                    "Resolving DNS & IP Records",
                    "Scanning Open Ports (80, 443, 8080)",
                    "Crawling Web Directories & Hidden Files",
                    "Checking Technology signatures & frameworks",
                    "Running Deep Vulnerability Scans (OWASP Top 10)"
                  ].map((phaseName, idx) => {
                    let icon, color, weight;
                    if (scanPhaseIndex > idx) {
                      icon = <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '1rem' }}></i>;
                      color = 'var(--text-primary, #1e293b)';
                      weight = '500';
                    } else if (scanPhaseIndex === idx) {
                      icon = <Spinner animation="border" size="sm" variant="primary" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />;
                      color = 'var(--accent-blue, #3b82f6)';
                      weight = '600';
                    } else {
                      icon = <i className="bi bi-circle text-muted" style={{ fontSize: '1rem' }}></i>;
                      color = 'var(--text-muted, #64748b)';
                      weight = '400';
                    }
                    return (
                      <div key={idx} className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: scanPhaseIndex === idx ? 'rgba(59, 130, 246, 0.05)' : 'transparent', transition: 'all 0.2s ease' }}>
                        <div style={{ width: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{icon}</div>
                        <span style={{ color, fontWeight: weight, fontSize: '0.82rem' }}>{phaseName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Wizard Step 1: Input subdomain / name check */}
                {wizardStep === "input_subdomain" && (
                  <Form onSubmit={handleWizardSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted fw-semibold">Enter Target Domain/Subdomain to Scan</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="e.g. portal.example.com or example.com" 
                        value={inputSubdomainName}
                        onChange={(e) => setInputSubdomainName(e.target.value)}
                        required
                      />
                      <Form.Text className="text-muted small">
                        We will check if this asset exists before starting the discovery scan.
                      </Form.Text>
                    </Form.Group>
                    <Button 
                      type="submit" 
                      variant="primary" 
                      className="w-100 mt-2" 
                      style={{ borderRadius: '10px' }}
                      disabled={!inputSubdomainName.trim()}
                    >
                      Check &amp; Continue
                    </Button>
                  </Form>
                )}

                {/* Wizard Step 1.5: Confirm Rescan */}
                {wizardStep === "confirm_rescan" && (
                  <div className="text-center">
                    <i className="bi bi-exclamation-triangle text-warning fs-1 mb-3"></i>
                    <h5>Subdomain Already Exists</h5>
                    <p className="text-muted small mb-4">
                      The subdomain <strong>"{scanTargetName}"</strong> is already scanned and present in your footprint list. Do you need to rescan it?
                    </p>
                    <div className="d-flex gap-2">
                      <Button variant="outline-secondary" className="w-50" onClick={() => setWizardStep("input_subdomain")} style={{ borderRadius: '10px' }}>
                        Back
                      </Button>
                      <Button variant="primary" className="w-50" onClick={() => runSimulatedScan(scanTargetName)} style={{ borderRadius: '10px' }}>
                        Yes, Rescan
                      </Button>
                    </div>
                  </div>
                )}

                {/* Wizard Step 2: Choose existing vs new domain */}
                {wizardStep === "ask_domain_type" && (
                  <div>
                    <h6 className="fw-semibold text-center mb-3">Is the new subdomain from an existing domain or a new domain?</h6>
                    <div className="p-3 border rounded bg-light mb-3 text-center">
                      <span className="small text-muted">Subdomain Prefix Target:</span>
                      <h6 className="mb-0 text-primary fw-bold mt-1">{inputSubdomainName}</h6>
                    </div>
                    <div className="d-flex gap-2">
                      <Button variant="outline-primary" className="w-50 py-3" onClick={() => setWizardStep("select_existing")} style={{ borderRadius: '10px' }}>
                        <i className="bi bi-folder-check d-block fs-4 mb-1"></i> Existing Domain
                      </Button>
                      <Button variant="primary" className="w-50 py-3" onClick={() => setWizardStep("enter_new")} style={{ borderRadius: '10px' }}>
                        <i className="bi bi-folder-plus d-block fs-4 mb-1"></i> New Domain
                      </Button>
                    </div>
                    <Button variant="link" className="w-100 text-muted small mt-3" onClick={() => setWizardStep("input_subdomain")}>
                      Back to Step 1
                    </Button>
                  </div>
                )}

                {/* Wizard Step 3: Selected Existing Domain Path */}
                {wizardStep === "select_existing" && (
                  <Form onSubmit={handleExistingDomainSubmit}>
                    <div className="p-2 border rounded bg-light mb-3 text-center">
                      <span className="small text-muted">Subdomain Target:</span>
                      <h6 className="mb-0 text-primary fw-bold mt-1">{inputSubdomainName}</h6>
                    </div>

                    {/* Real-time constructed path preview banner */}
                    <div className="p-3 mb-3 border rounded text-center bg-light">
                      <span className="small text-muted d-block mb-1">CONSTRUCTED TARGET PATH PREVIEW</span>
                      <code className="text-primary fw-bold fs-6 font-monospace" style={{ wordBreak: 'break-all' }}>
                        {sanitizeSubdomainStr(combineSubdomainAndRoot(specificPrefix, selectedExistingDomain || 'root-domain'))}
                      </code>
                    </div>
                    
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted fw-semibold">Select Existing Root Domain</Form.Label>
                      <Form.Select 
                        value={selectedExistingDomain}
                        onChange={(e) => setSelectedExistingDomain(e.target.value)}
                        required
                      >
                        <option value="">-- Choose registered domain --</option>
                        {uniqueDomains.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted fw-semibold">Specific Subdomain Prefix to scan</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="e.g. portal" 
                        value={specificPrefix}
                        onChange={(e) => setSpecificPrefix(e.target.value)}
                      />
                      <Form.Text className="text-muted small">
                        Leave blank to scan root domain itself.
                      </Form.Text>
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button variant="outline-secondary" className="w-50" onClick={() => setWizardStep("ask_domain_type")} style={{ borderRadius: '10px' }}>
                        Back
                      </Button>
                      <Button type="submit" variant="primary" className="w-50" disabled={!selectedExistingDomain} style={{ borderRadius: '10px' }}>
                        Add &amp; Scan
                      </Button>
                    </div>
                  </Form>
                )}

                {/* Wizard Step 4: Choose New Domain Path */}
                {wizardStep === "enter_new" && (
                  <Form onSubmit={handleNewDomainSubmit}>
                    <div className="p-2 border rounded bg-light mb-3 text-center">
                      <span className="small text-muted">Subdomain Target:</span>
                      <h6 className="mb-0 text-primary fw-bold mt-1">{inputSubdomainName}</h6>
                    </div>

                    {/* Real-time constructed path preview banner */}
                    <div className="p-3 mb-3 border rounded text-center bg-light">
                      <span className="small text-muted d-block mb-1">CONSTRUCTED TARGET PATH PREVIEW</span>
                      <code className="text-primary fw-bold fs-6 font-monospace" style={{ wordBreak: 'break-all' }}>
                        {sanitizeSubdomainStr(combineSubdomainAndRoot(specificPrefix, newRootDomain || 'new-root-domain'))}
                      </code>
                    </div>

                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted fw-semibold">Enter New Root Domain</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="e.g. example.com" 
                        value={newRootDomain}
                        onChange={(e) => setNewRootDomain(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted fw-semibold">Specific Subdomain Prefix to scan</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="e.g. portal" 
                        value={specificPrefix}
                        onChange={(e) => setSpecificPrefix(e.target.value)}
                      />
                      <Form.Text className="text-muted small">
                        Leave blank to scan root domain itself.
                      </Form.Text>
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button variant="outline-secondary" className="w-50" onClick={() => setWizardStep("ask_domain_type")} style={{ borderRadius: '10px' }}>
                        Back
                      </Button>
                      <Button type="submit" variant="primary" className="w-50" disabled={!newRootDomain.trim()} style={{ borderRadius: '10px' }}>
                        Add &amp; Scan
                      </Button>
                    </div>
                  </Form>
                )}
              </>
            )}
          </Modal.Body>
        </Modal>

      </div>
    </div>
  );
};

export default DigitalFootprintsPage;
