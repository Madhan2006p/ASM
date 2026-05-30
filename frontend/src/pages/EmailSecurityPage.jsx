import React, { useState, useEffect } from "react";
import { Container, Card, Table, Badge, Spinner } from "react-bootstrap";
import { FiShield, FiMail, FiServer, FiCheckCircle, FiAlertTriangle, FiInfo } from "react-icons/fi";
import Sidebar from "../components/Sidebar";
import LockedFeatureOverlay from "../components/LockedFeatureOverlay";
import { fetchAllPages } from "../utils/api";
import { useScan } from "../context/ScanContext";

const EmailSecurityPage = () => {
  const { scanState } = useScan();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const scanId = localStorage.getItem("activeScanId");
        const data = await fetchAllPages("email-security", scanId);
        setResults(data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Re-fetch when scan phases change (email_done completes)
    if (scanState.phasesDone?.email_done) {
      loadData();
    }
  }, [scanState.phasesDone?.email_done]);

  const scanId = localStorage.getItem("activeScanId");

  // Helper to render a status badge
  const statusBadge = (condition, ifTrue = "Configured", ifFalse = "Missing") => {
    return condition ? (
      <Badge bg="success" pill className="px-3">{ifTrue}</Badge>
    ) : (
      <Badge bg="danger" pill className="px-3">{ifFalse}</Badge>
    );
  };

  // Format raw SMTP data for display
  const formatSMTPHosts = (hosts) => {
    if (!hosts || hosts.length === 0) return <span className="text-muted">-</span>;
    return hosts.map((h, i) => (
      <div key={i} className="small font-monospace" style={{ color: "var(--text-color)" }}>{h}</div>
    ));
  };

  return (
    <LockedFeatureOverlay featureId="8">
    <div className="d-flex" style={{ minHeight: "calc(100vh - 70px)" }}>
      <Sidebar />
      <div style={{ marginLeft: "280px", width: "calc(100% - 280px)", padding: "24px 32px" }}>
        <div className="d-flex align-items-center gap-3 mb-4">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #f97316, #ef4444)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiMail size={24} color="#fff" />
          </div>
          <div>
            <h3 className="mb-0 fw-bold" style={{ color: "var(--text-color)" }}>
              Email Security
            </h3>
            <span className="text-muted small">
              SPF, DMARC, DKIM & SMTP security posture for scanned domains.
              {scanId && <> — Scan #{scanId}</>}
            </span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="d-flex gap-3 mb-4 flex-wrap">
          <Card className="border-0 flex-fill" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 14, minWidth: 160 }}>
            <Card.Body className="p-3 text-center">
              <FiShield size={20} className="text-warning mb-2" />
              <div className="fw-bold fs-4" style={{ color: "var(--text-color)" }}>{results.length}</div>
              <div className="small text-muted">Domains Scanned</div>
            </Card.Body>
          </Card>
          <Card className="border-0 flex-fill" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 14, minWidth: 160 }}>
            <Card.Body className="p-3 text-center">
              <FiCheckCircle size={20} className="text-success mb-2" />
              <div className="fw-bold fs-4" style={{ color: "var(--text-color)" }}>
                {results.filter(r => r.spf?.length > 0).length}
              </div>
              <div className="small text-muted">SPF Configured</div>
            </Card.Body>
          </Card>
          <Card className="border-0 flex-fill" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 14, minWidth: 160 }}>
            <Card.Body className="p-3 text-center">
              <FiCheckCircle size={20} className="text-info mb-2" />
              <div className="fw-bold fs-4" style={{ color: "var(--text-color)" }}>
                {results.filter(r => r.dmarc?.length > 0).length}
              </div>
              <div className="small text-muted">DMARC Configured</div>
            </Card.Body>
          </Card>
          <Card className="border-0 flex-fill" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 14, minWidth: 160 }}>
            <Card.Body className="p-3 text-center">
              <FiAlertTriangle size={20} className="text-danger mb-2" />
              <div className="fw-bold fs-4" style={{ color: "var(--text-color)" }}>
                {results.filter(r => r.smtp_open_relay?.is_open_relay).length}
              </div>
              <div className="small text-muted">Open Relays</div>
            </Card.Body>
          </Card>
        </div>

        {/* Main Results Table */}
        <Card className="border-0" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 16 }}>
          <Card.Header className="bg-transparent pt-4 pb-2 border-bottom-0">
            <h5 className="mb-0 fw-bold" style={{ color: "var(--text-color)" }}>
              <FiShield className="me-2" style={{ color: "#f97316" }} /> Email Security Scan Results
            </h5>
          </Card.Header>
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="text-muted small mt-2 mb-0">Loading email security results...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FiMail size={40} className="mb-3 opacity-50" />
                <p className="mb-1 fw-semibold">No email security results found</p>
                <p className="small mb-0">Run a scan on a domain to check its email security posture.</p>
              </div>
            ) : (
              <div className="table-responsive rounded-3 border" style={{ borderColor: "var(--header-border)", background: "var(--bg-color)" }}>
                <Table hover className="mb-0 align-middle">
                  <thead>
                    <tr>
                      <th className="py-3 px-4 border-0">Domain</th>
                      <th className="py-3 px-4 border-0">SPF</th>
                      <th className="py-3 px-4 border-0">DMARC</th>
                      <th className="py-3 px-4 border-0">DKIM</th>
                      <th className="py-3 px-4 border-0">MX Records</th>
                      <th className="py-3 px-4 border-0">SMTP Hosts</th>
                      <th className="py-3 px-4 border-0">StartTLS</th>
                      <th className="py-3 px-4 border-0">Open Relay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((es) => (
                      <tr key={es.id}>
                        <td className="px-4 py-3 fw-semibold" style={{ color: "var(--text-color)" }}>
                          <FiServer size={14} className="me-2 text-muted" />
                          {es.domain}
                        </td>
                        <td className="px-4 py-3">
                          {statusBadge(es.spf?.length > 0)}
                          {es.spf?.length > 0 && (
                            <div className="small text-muted mt-1 font-monospace" style={{ fontSize: "0.65rem", wordBreak: "break-all", maxWidth: 180 }}>
                              {es.spf.slice(0, 1).map((s, i) => <div key={i}>{s}</div>)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {statusBadge(es.dmarc?.length > 0)}
                          {es.dmarc?.length > 0 && (
                            <div className="small text-muted mt-1 font-monospace" style={{ fontSize: "0.65rem", wordBreak: "break-all", maxWidth: 180 }}>
                              {es.dmarc.slice(0, 1).map((d, i) => <div key={i}>{d}</div>)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {es.dkim_selector1?.length > 0 || es.dkim_default?.length > 0 ? (
                            <Badge bg="success" pill className="px-3">Found</Badge>
                          ) : (
                            <Badge bg="secondary" pill className="px-3">Not Found</Badge>
                          )}
                          {(es.dkim_selector1?.length > 0 || es.dkim_default?.length > 0) && (
                            <div className="small text-muted mt-1 font-monospace" style={{ fontSize: "0.65rem" }}>
                              {es.dkim_selector1?.length > 0 && <div>selector1: {es.dkim_selector1.length} records</div>}
                              {es.dkim_default?.length > 0 && <div>default: {es.dkim_default.length} records</div>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge bg="info" pill className="px-3">{es.mx?.length || 0} records</Badge>
                          {es.mx?.length > 0 && (
                            <div className="small text-muted mt-1 font-monospace" style={{ fontSize: "0.65rem", wordBreak: "break-all", maxWidth: 200 }}>
                              {es.mx.slice(0, 3).map((m, i) => <div key={i}>{m}</div>)}
                              {es.mx.length > 3 && <div className="text-muted">+{es.mx.length - 3} more</div>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3" style={{ fontSize: "0.82rem" }}>
                          {formatSMTPHosts(es.smtp_hosts)}
                        </td>
                        <td className="px-4 py-3">
                          {es.smtp_starttls?.starttls_supported ? (
                            <Badge bg="success" pill className="px-3">Supported</Badge>
                          ) : es.smtp_starttls?.starttls_supported === false ? (
                            <Badge bg="warning" pill className="px-3">Not Supported</Badge>
                          ) : (
                            <Badge bg="secondary" pill className="px-3">N/A</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {es.smtp_open_relay?.is_open_relay ? (
                            <Badge bg="danger" pill className="px-3">
                              <FiAlertTriangle size={12} className="me-1" /> Vulnerable
                            </Badge>
                          ) : (
                            <Badge bg="success" pill className="px-3">Secure</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
    </LockedFeatureOverlay>
  );
};

export default EmailSecurityPage;
