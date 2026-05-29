import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
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

const TechnologiesPage = () => {
  const { refreshKey, scanState } = useScan();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [technologies, setTechnologies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState([]);
  const navigate = useNavigate();
  const { orgId } = useParams();
  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Technologies');

      // Add headers
      worksheet.columns = [
        { header: 'S.No', key: 'id', width: 5 },
        { header: 'Domain', key: 'domain', width: 40 },
        { header: 'Technologies', key: 'technologies', width: 50 },
        { header: 'Created', key: 'created_at', width: 20 },
        { header: 'Last Updated', key: 'updated_at', width: 20 }
      ];

      // Add data
      technologies.forEach((item, index) => {
        worksheet.addRow({
          id: index + 1,
          domain: item.domain || '-',
          technologies: Array.isArray(item.technologies) ? item.technologies.join(', ') : '-',
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
      saveAs(blob, `technologies_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Fetch technologies data
  const fetchTechnologies = async () => {
    try {
      const activeScanId = scanState.scanId || localStorage.getItem("activeScanId");
      const allResults = await fetchAllPages('technologies', activeScanId);
      
      // Deduplicate technologies by domain
      const seen = new Set();
      const uniqueResults = [];
      allResults.forEach(item => {
        const key = (item.domain || '').toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueResults.push(item);
        }
      });

      setTechnologies(uniqueResults);
      setError(null);
    } catch (err) {
      setError('Failed to fetch technologies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnologies();
  }, [refreshKey, JSON.stringify(scanState.phasesDone)]);

  // Render exact timestamp as a two-line block to avoid horizontal collision
  const renderExactTimestamp = (dateString) => {
    if (!dateString) return <span className="text-muted">-</span>;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return <span className="text-muted">-</span>;
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();
      return (
        <div style={{ lineHeight: '1.2' }}>
          <div style={{ color: 'var(--text-color)', fontWeight: 500 }}>{dateStr}</div>
          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{timeStr}</div>
        </div>
      );
    } catch (error) {
      return <span className="text-muted">-</span>;
    }
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
    <div className="digital-page">
      <Sidebar />
      <div className="digital-page-content">

        <div className="digital-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="rounded-circle px-2">
              <FiArrowLeft size={16} />
            </Button>
            <h2 className="mb-0">Technologies</h2>
          </div>
          <div>
            <Button variant="outline-primary" className="me-2" onClick={() => {
              setLoading(true);
              setTimeout(() => {
                fetchTechnologies();
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
              placeholder="Search technologies by domain or technology name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive rounded-3 border" style={{ background: 'var(--bg-color)', borderColor: 'var(--header-border)' }}>
          <Table hover className="technologies-table mb-0 align-middle">
            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
              <tr>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>S.No</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Domain</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Technologies</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Created</th>
                <th className="py-3 px-4 fw-semibold border-bottom-0" style={{ color: 'var(--text-color)' }}>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {technologies.length > 0 ? (
                technologies
                  .filter(item => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                      (item.domain?.toLowerCase().includes(search)) ||
                      (item.technologies && Array.isArray(item.technologies) && 
                       item.technologies.some(tech => tech && tech.toLowerCase().includes(search)))
                    );
                  })
                  .map((item, index) => {
                    const maxVisible = 3;
                    const techsVisible = item.technologies ? item.technologies.slice(0, maxVisible) : [];
                    const techsMore = item.technologies ? item.technologies.length - maxVisible : 0;

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
                        <td className="px-4">
                          <div className="chips-container">
                            {techsVisible.map((tech, i) => (
                              <span 
                                key={i} 
                                className="tech-chip"
                                title={tech}
                              >
                                {tech}
                              </span>
                            ))}
                            {techsMore > 0 && (
                              <span 
                                className="chip-more chip-clickable" 
                                onClick={() => handleShowModal('Technologies', item.technologies)}
                                title="Click to view all technologies"
                              >
                                +{techsMore}
                              </span>
                            )}
                            {(!item.technologies || item.technologies.length === 0) && (
                              <span className="text-muted">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 date-cell">
                          {renderExactTimestamp(item.created_at)}
                        </td>
                        <td className="px-4 date-cell">
                          {renderExactTimestamp(item.updated_at)}
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    <p className="text-muted mb-0">No technologies found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

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
                    <span className="tech-chip">
                      {item}
                    </span>
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
      </div>
    </div>
  );
};

export default TechnologiesPage;

