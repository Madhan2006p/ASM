import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import {
  fetchFaradayFindings,
  fetchFaradaySummary,
} from '../utils/api';
import '../styles/DefectDojoFindingsPage.css';

const severityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1, Info: 0 };
const pageSize = 10;

const severityClass = (severity) => `severity-pill severity-${String(severity || 'info').toLowerCase()}`;

const hasCve = (finding) => Boolean(finding.cve && String(finding.cve).trim() && String(finding.cve).trim() !== '-');

const truncate = (value, size = 180) => {
  if (!value) return '-';
  return value.length > size ? `${value.slice(0, size)}...` : value;
};

const DefectDojoFindingsPage = () => {
  const [summary, setSummary] = useState(null);
  const [findings, setFindings] = useState([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, findingsData] = await Promise.all([
        fetchFaradaySummary(),
        fetchFaradayFindings(),
      ]);
      setSummary(summaryData);
      setFindings(findingsData.findings || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load Faraday findings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const significantFindings = useMemo(() => {
    return findings
      .filter((finding) => ['Critical', 'High'].includes(finding.severity) || hasCve(finding))
      .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))
      .slice(0, 12);
  }, [findings]);

  const filteredFindings = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return findings
      .filter((finding) => severityFilter === 'All' || finding.severity === severityFilter)
      .filter((finding) => {
        if (!needle) return true;
        return [
          finding.finding_id,
          finding.title,
          finding.severity,
          finding.cve,
          finding.cwe,
          finding.endpoint,
          finding.description,
          finding.mitigation,
        ].some((value) => String(value || '').toLowerCase().includes(needle));
      })
      .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));
  }, [findings, search, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredFindings.length / pageSize));
  const pagedFindings = filteredFindings.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, severityFilter]);

  const cards = [
    ['Total Findings', summary?.total_findings ?? 0, 'total'],
    ['Critical', summary?.critical_count ?? 0, 'critical'],
    ['High', summary?.high_count ?? 0, 'high'],
    ['Medium', summary?.medium_count ?? 0, 'medium'],
    ['Low', summary?.low_count ?? 0, 'low'],
    ['Risk Score', summary?.risk_score ?? 0, 'score'],
    ['Risk Level', summary?.risk_level ?? 'Low', 'level'],
  ];

  return (
    <div className="dojo-page">
      <Sidebar />
      <main className="dojo-content">
        <div className="dojo-hero">
          <div>
            <p className="dojo-eyebrow">Nuclei output to Faraday</p>
            <h1>Faraday Findings Dashboard</h1>
            <p className="dojo-subtitle">Nuclei vulnerability scan results are imported into Faraday automatically after scan completion.</p>
          </div>
          <div className="dojo-actions">
            <button className="refresh-button" onClick={loadDashboard} disabled={loading}>Refresh</button>
          </div>
        </div>

        {error && <div className="dojo-alert error">{error}</div>}

        <section className="summary-grid">
          {cards.map(([label, value, type]) => (
            <article className={`summary-card ${type}`} key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>

        <section className="dojo-panel">
          <div className="panel-header">
            <div>
              <h2>Significant Findings</h2>
              <p>Critical, high, and CVE-linked findings.</p>
            </div>
          </div>
          <div className="dojo-table-wrap">
            <table className="dojo-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>CVE</th>
                  <th>Endpoint</th>
                  <th>Description</th>
                  <th>Recommended Fix</th>
                </tr>
              </thead>
              <tbody>
                {significantFindings.map((finding) => (
                  <tr key={`sig-${finding.finding_id}`}>
                    <td><span className={severityClass(finding.severity)}>{finding.severity}</span></td>
                    <td>{finding.title}</td>
                    <td>{finding.cve || '-'}</td>
                    <td>{finding.endpoint || '-'}</td>
                    <td>{truncate(finding.description)}</td>
                    <td>{truncate(finding.mitigation)}</td>
                  </tr>
                ))}
                {!loading && significantFindings.length === 0 && (
                  <tr><td colSpan="6" className="empty-cell">No significant findings available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dojo-panel">
          <div className="panel-header table-controls">
            <div>
              <h2>Full Findings</h2>
              <p>Sorted by severity, with search, filtering, and pagination.</p>
            </div>
            <div className="filters">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search findings..." />
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                {['All', 'Critical', 'High', 'Medium', 'Low', 'Info'].map((severity) => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="dojo-table-wrap">
            <table className="dojo-table full-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>CVE</th>
                  <th>CWE</th>
                  <th>Endpoint</th>
                  <th>Active</th>
                  <th>Date Found</th>
                </tr>
              </thead>
              <tbody>
                {pagedFindings.map((finding) => (
                  <tr key={finding.finding_id}>
                    <td>{finding.finding_id}</td>
                    <td><span className={severityClass(finding.severity)}>{finding.severity}</span></td>
                    <td>{finding.title}</td>
                    <td>{finding.cve || '-'}</td>
                    <td>{finding.cwe || '-'}</td>
                    <td>{finding.endpoint || '-'}</td>
                    <td>{finding.active ? 'Active' : 'Inactive'}</td>
                    <td>{finding.date_found ? new Date(finding.date_found).toLocaleString() : '-'}</td>
                  </tr>
                ))}
                {!loading && pagedFindings.length === 0 && (
                  <tr><td colSpan="8" className="empty-cell">No findings match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination-row">
            <span>{filteredFindings.length} findings</span>
            <div>
              <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DefectDojoFindingsPage;
