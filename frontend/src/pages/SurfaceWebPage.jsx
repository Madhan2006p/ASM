import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Table, Badge, Button, Form, Spinner, Modal, Alert } from "react-bootstrap";
import { FiGithub, FiSearch, FiShield, FiUsers, FiStar, FiAlertTriangle, FiFileText, FiRefreshCw, FiPlus, FiActivity, FiGitBranch, FiClock, FiGitCommit, FiGitPullRequest, FiPlay, FiCheckSquare, FiXSquare, FiMinusSquare, FiUser, FiExternalLink, FiFilter, FiArrowRight, FiEye } from "react-icons/fi";
import Sidebar from "../components/Sidebar";
import { surfaceMonitoringApi } from "../utils/api";

const VISIBILITY_BADGE = {
  public: "success",
  private: "danger",
  unknown: "secondary",
};

const STATUS_BADGE = {
  discovered: "secondary",
  cloning: "info",
  scanning: "warning",
  completed: "success",
  failed: "danger",
  skipped: "secondary",
};

const SCAN_STATUS_BADGE = {
  pending: "secondary",
  running: "info",
  completed: "success",
  failed: "danger",
};

const EVENT_ICONS = {
  push: FiGitCommit,
  create: FiGitPullRequest,
  repo_updated: FiRefreshCw,
  action_pending: FiClock,
  action_in_progress: FiPlay,
  action_completed: FiCheckSquare,
  action_failed: FiXSquare,
  action_cancelled: FiMinusSquare,
};

const EVENT_COLORS = {
  push: "#0d6efd",
  create: "#198754",
  repo_updated: "#6f42c1",
  action_pending: "#6c757d",
  action_in_progress: "#fd7e14",
  action_completed: "#198754",
  action_failed: "#dc3545",
  action_cancelled: "#6c757d",
};

const SurfaceWebPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard stats
  const [stats, setStats] = useState(null);

  // Add Repo modal
  const [showAddRepoModal, setShowAddRepoModal] = useState(false);
  const [addRepoForm, setAddRepoForm] = useState({ full_name: "" });
  const [addingRepo, setAddingRepo] = useState(false);

  // Repositories
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);

  // Scans
  const [scans, setScans] = useState([]);
  const [scansLoading, setScansLoading] = useState(false);

  // Events
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  // Discovery & scan states
  const [discovering, setDiscovering] = useState(false);
  const [scanningRepoId, setScanningRepoId] = useState(null);
  const [batchScanning, setBatchScanning] = useState(false);
  const [pollingRepoId, setPollingRepoId] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotif = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const data = await surfaceMonitoringApi.getStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchRepos = useCallback(async () => {
    setReposLoading(true);
    try {
      const data = await surfaceMonitoringApi.getRepos();
      setRepos(data.results || data || []);
    } catch (err) {
      console.error("Failed to fetch repos:", err);
    } finally {
      setReposLoading(false);
    }
  }, []);

  const fetchScans = useCallback(async () => {
    setScansLoading(true);
    try {
      const data = await surfaceMonitoringApi.getScans();
      setScans(data.results || data || []);
    } catch (err) {
      console.error("Failed to fetch scans:", err);
    } finally {
      setScansLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const typeParam = eventTypeFilter !== "all" ? eventTypeFilter : null;
      const data = await surfaceMonitoringApi.getEvents(null, typeParam);
      setEvents(data.results || data || []);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setEventsLoading(false);
    }
  }, [eventTypeFilter]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchRepos(), fetchScans(), fetchEvents()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchStats, fetchRepos, fetchScans, fetchEvents]);

  const handleDiscoverByOrg = async () => {
    setDiscovering(true);
    try {
      const result = await surfaceMonitoringApi.discoverByOrg();
      const discovered = result?.result?.discovered || 0;
      const githubOrg = result?.result?.github_org || result?.org_name || "your organization";
      const msg = `Organization discovery completed! Found ${discovered} repo(s) for GitHub org "${githubOrg}".`;
      showNotif(msg, discovered > 0 ? "success" : "info");
      // Refresh all data
      await Promise.all([fetchRepos(), fetchStats(), fetchEvents()]);
      setDiscovering(false);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err.message || "Unknown error";
      showNotif("Failed to start organization discovery: " + msg, "danger");
      setDiscovering(false);
    }
  };

  const handleScanRepo = async (repoId) => {
    setScanningRepoId(repoId);
    try {
      await surfaceMonitoringApi.scanRepo(repoId);
      showNotif("Secret scan queued! Results will appear shortly.", "info");
      setTimeout(async () => {
        await Promise.all([fetchRepos(), fetchScans(), fetchStats()]);
        setScanningRepoId(null);
      }, 5000);
    } catch (err) {
      showNotif("Failed to scan repo: " + (err.message || "Unknown"), "danger");
      setScanningRepoId(null);
    }
  };

  const handleScanAllRepos = async () => {
    setBatchScanning(true);
    try {
      await surfaceMonitoringApi.scanAllRepos();
      showNotif("Batch scan triggered for all repositories.", "info");
      setTimeout(async () => {
        await Promise.all([fetchRepos(), fetchScans(), fetchStats()]);
        setBatchScanning(false);
      }, 8000);
    } catch (err) {
      showNotif("Failed to start batch scan", "danger");
      setBatchScanning(false);
    }
  };

  const handleAddRepo = async (e) => {
    e.preventDefault();
    if (!addRepoForm.full_name.trim()) return;
    setAddingRepo(true);
    try {
      const result = await surfaceMonitoringApi.addRepo(addRepoForm.full_name.trim());
      setShowAddRepoModal(false);
      setAddRepoForm({ full_name: "" });
      showNotif(result.message || `Repo "${addRepoForm.full_name}" added!`, "success");
      await Promise.all([fetchRepos(), fetchStats()]);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Failed to add repo";
      showNotif(msg, "danger");
    } finally {
      setAddingRepo(false);
    }
  };

  const handlePollEvents = async (repoId) => {
    setPollingRepoId(repoId);
    try {
      await surfaceMonitoringApi.pollEvents(repoId);
      showNotif("Event polling triggered! Refresh the Activity tab shortly.", "info");
      setTimeout(async () => {
        await fetchEvents();
        await fetchStats();
        setPollingRepoId(null);
      }, 3000);
    } catch (err) {
      showNotif("Failed to poll events", "danger");
      setPollingRepoId(null);
    }
  };

  // Format helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "-";
    }
  };

  const truncate = (str, len = 60) => {
    if (!str) return "-";
    return str.length > len ? str.slice(0, len) + "..." : str;
  };

  return (
    <div className="d-flex" style={{ minHeight: "calc(100vh - 70px)" }}>
      <Sidebar />
      <div style={{ marginLeft: "280px", width: "calc(100% - 280px)", padding: "24px 32px" }}>
        {/* Notification Toast */}
        {notification && (
          <Alert
            variant={notification.type}
            dismissible
            onClose={() => setNotification(null)}
            style={{
              position: "fixed",
              top: 20,
              right: 20,
              zIndex: 9999,
              maxWidth: 400,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              borderRadius: 12,
            }}
          >
            {notification.message}
          </Alert>
        )}

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="mb-1 fw-bold" style={{ color: "var(--text-color)" }}>
              <FiGithub className="me-2" style={{ color: "#6e5494" }} />
              Surface Web Monitoring
            </h3>
            <p className="text-muted small mb-0">
              Discover and monitor GitHub repositories matching your organization name.
              Track pushes, creates, updates, and Actions workflow status.
            </p>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleDiscoverByOrg}
              disabled={discovering}
            >
              {discovering ? (
                <Spinner animation="border" size="sm" className="me-1" />
              ) : (
                <FiSearch className="me-1" size={14} />
              )}
              {stats?.org_name ? `Discover "${stats.org_name}"` : "Discover by Organization"}
            </Button>
            <Button
              variant="outline-success"
              size="sm"
              onClick={() => setShowAddRepoModal(true)}
            >
              <FiGitBranch className="me-1" size={14} />
              Add Repo
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-3">Loading surface monitoring data...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Stats Cards */}
            {stats && (
              <>
                {/* Organization Name Banner */}
                {stats.org_name && (
                  <div
                    className="mb-4 p-3 rounded-3 d-flex align-items-center gap-3"
                    style={{
                      background: "linear-gradient(135deg, #6e549420, #0d6efd15)",
                      border: "1px solid #6e549430",
                      borderRadius: 12,
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{ width: 44, height: 44, background: "#6e549430", color: "#6e5494" }}
                    >
                      <FiUsers size={22} />
                    </div>
                    <div>
                      <span className="text-muted small fw-semibold text-uppercase d-block" style={{ fontSize: "0.7rem", letterSpacing: 0.5 }}>
                        Monitoring Organization
                      </span>
                      <h5 className="mb-0 fw-bold" style={{ color: "var(--text-color)" }}>
                        {stats.org_name}
                      </h5>
                    </div>
                  </div>
                )}

                {/* Primary Stats Row */}
                <Row className="mb-4 g-3">
                  <Col md={3} sm={6}>
                    <Card className="border-0 p-3" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 12, borderLeft: "4px solid #6e5494" }}>
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <span className="text-muted small fw-semibold text-uppercase">Repositories</span>
                          <h3 className="mb-0 fw-bold mt-1" style={{ color: "#6e5494" }}>{stats.total_repos}</h3>
                        </div>
                        <FiGithub size={28} style={{ color: "#6e5494", opacity: 0.4 }} />
                      </div>
                    </Card>
                  </Col>
                  <Col md={3} sm={6}>
                    <Card className="border-0 p-3" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 12, borderLeft: "4px solid #dc3545" }}>
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <span className="text-muted small fw-semibold text-uppercase">Secrets Found</span>
                          <h3 className="mb-0 fw-bold mt-1" style={{ color: "#dc3545" }}>{stats.total_secrets_found}</h3>
                        </div>
                        <FiAlertTriangle size={28} style={{ color: "#dc3545", opacity: 0.4 }} />
                      </div>
                    </Card>
                  </Col>
                  <Col md={3} sm={6}>
                    <Card className="border-0 p-3" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 12, borderLeft: "4px solid #0d6efd" }}>
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <span className="text-muted small fw-semibold text-uppercase">Scans</span>
                          <h3 className="mb-0 fw-bold mt-1" style={{ color: "#0d6efd" }}>{stats.total_scans}</h3>
                        </div>
                        <FiActivity size={28} style={{ color: "#0d6efd", opacity: 0.4 }} />
                      </div>
                    </Card>
                  </Col>
                  <Col md={3} sm={6}>
                    <Card className="border-0 p-3" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 12, borderLeft: "4px solid #198754" }}>
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <span className="text-muted small fw-semibold text-uppercase">Activity (7d)</span>
                          <h3 className="mb-0 fw-bold mt-1" style={{ color: "#198754" }}>{stats.recent_events || 0}</h3>
                        </div>
                        <FiClock size={28} style={{ color: "#198754", opacity: 0.4 }} />
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Event Stats Row - PUSH, CREATE, UPDATE, WATCHING, ACTIONS */}
                <Row className="mb-4 g-3">
                  <Col md={2} sm={6}>
                    <Card className="border-0 p-3" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 12 }}>
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, background: "#0d6efd20", color: "#0d6efd" }}>
                          <FiGitCommit size={16} />
                        </div>
                        <div>
                          <span className="text-muted small d-block" style={{ fontSize: "0.65rem", lineHeight: 1.2, textTransform: "uppercase", fontWeight: 600 }}>Pushed</span>
                          <h4 className="mb-0 fw-bold mt-1" style={{ color: "#0d6efd", fontSize: "1.1rem" }}>{stats.recent_pushes || 0}</h4>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  <Col md={2} sm={6}>
                    <Card className="border-0 p-3" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 12 }}>
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, background: "#19875420", color: "#198754" }}>
                          <FiGitPullRequest size={16} />
                        </div>
                        <div>
                          <span className="text-muted small d-block" style={{ fontSize: "0.65rem", lineHeight: 1.2, textTransform: "uppercase", fontWeight: 600 }}>Created</span>
                          <h4 className="mb-0 fw-bold mt-1" style={{ color: "#198754", fontSize: "1.1rem" }}>{stats.recent_creates || 0}</h4>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  <Col md={2} sm={6}>
                    <Card className="border-0 p-3" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 12 }}>
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, background: "#6f42c120", color: "#6f42c1" }}>
                          <FiRefreshCw size={16} />
                        </div>
                        <div>
                          <span className="text-muted small d-block" style={{ fontSize: "0.65rem", lineHeight: 1.2, textTransform: "uppercase", fontWeight: 600 }}>Updated</span>
                          <h4 className="mb-0 fw-bold mt-1" style={{ color: "#6f42c1", fontSize: "1.1rem" }}>{stats.recent_updates || 0}</h4>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  <Col md={3} sm={6}>
                    <Card className="border-0 p-3" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 12 }}>
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, background: "#fd7e1420", color: "#fd7e14" }}>
                          <FiPlay size={16} />
                        </div>
                        <div>
                          <span className="text-muted small d-block" style={{ fontSize: "0.65rem", lineHeight: 1.2, textTransform: "uppercase", fontWeight: 600 }}>Actions</span>
                          <div className="d-flex gap-2 mt-1 align-items-center">
                            <span className="fw-bold" style={{ color: "#198754", fontSize: "0.95rem" }}>{stats.recent_action_success || 0} OK</span>
                            <span className="text-muted" style={{ fontSize: "0.7rem" }}>/</span>
                            <span className="fw-bold" style={{ color: "#dc3545", fontSize: "0.95rem" }}>{stats.recent_action_failed || 0} Fail</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  <Col md={3} sm={6}>
                    <Card className="border-0 p-3" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 12 }}>
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, background: "#0dcaf020", color: "#0dcaf0" }}>
                          <FiEye size={16} />
                        </div>
                        <div>
                          <span className="text-muted small d-block" style={{ fontSize: "0.65rem", lineHeight: 1.2, textTransform: "uppercase", fontWeight: 600 }}>Watching</span>
                          <h4 className="mb-0 fw-bold mt-1" style={{ color: "#0dcaf0", fontSize: "1.1rem" }}>{stats.total_watching || 0}</h4>
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </>
            )}

            {/* Tab Navigation */}
            <div
              className="d-flex border-bottom mb-4 pb-2"
              style={{ gap: 8, borderColor: "var(--header-border)" }}
            >
              {[
                { id: "dashboard", label: "Dashboard", icon: FiActivity },
                { id: "activity", label: "Activity", icon: FiClock },
                { id: "repos", label: "Repositories", icon: FiGithub },
                { id: "scans", label: "Scan History", icon: FiShield },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "primary" : "none"}
                    onClick={() => setActiveTab(tab.id)}
                    className="d-inline-flex align-items-center gap-2"
                    style={{
                      borderRadius: 20,
                      padding: "8px 16px",
                      fontSize: "0.82rem",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      border:
                        activeTab === tab.id
                          ? "none"
                          : "1.5px solid var(--border-color, rgba(0,0,0,0.08))",
                      color:
                        activeTab === tab.id
                          ? "#ffffff"
                          : "var(--text-secondary, #4a5568)",
                      background:
                        activeTab === tab.id
                          ? "var(--gradient-accent, #3b82f6)"
                          : "var(--bg-color, #ffffff)",
                      boxShadow:
                        activeTab === tab.id
                          ? "0 4px 12px rgba(59, 130, 246, 0.35)"
                          : "none",
                    }}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </Button>
                );
              })}
            </div>

            {/* Tab: Dashboard */}
            {activeTab === "dashboard" && stats && (
              <>
                {/* Recent Activity Feed (Latest 5 events) */}
                <Card className="border-0 mb-4" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 16 }}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-bold mb-0" style={{ color: "var(--text-color)" }}>
                        <FiClock className="me-2" />
                        Recent Activity
                      </h6>
                      <Button size="sm" variant="outline-secondary" onClick={() => setActiveTab("activity")}>
                        View All <FiArrowRight className="ms-1" size={14} />
                      </Button>
                    </div>
                    {stats.latest_events && stats.latest_events.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {stats.latest_events.map((ev) => {
                          const icon = EVENT_ICONS[ev.event_type] || FiActivity;
                          const color = EVENT_COLORS[ev.event_type] || "#6c757d";
                          const Icon = icon;
                          return (
                            <div key={ev.id} className="d-flex align-items-center gap-3 p-2 rounded" style={{ background: "var(--input-bg, #f8f9fa)", borderLeft: `3px solid ${color}` }}>
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 32, height: 32, background: `${color}20`, color }}>
                                <Icon size={14} />
                              </div>
                              <div className="flex-grow-1 min-w-0">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-semibold small" style={{ color: "var(--text-color)" }}>
                                    {ev.repo_name}
                                  </span>
                                  <span className="text-muted" style={{ fontSize: "0.7rem" }}>{ev.event_type?.replace(/_/g, ' ') || 'event'}</span>
                                </div>
                                {ev.commit_message && (
                                  <small className="text-muted d-block" style={{ fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>
                                    {truncate(ev.commit_message, 60)}
                                  </small>
                                )}
                                {ev.action_name && (
                                  <small className="text-muted d-block" style={{ fontSize: "0.75rem" }}>
                                    {ev.action_name}
                                  </small>
                                )}
                              </div>
                              <small className="text-muted flex-shrink-0" style={{ fontSize: "0.7rem" }}>
                                {formatDate(ev.event_occurred_at)}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-muted">
                        <FiClock size={24} className="mb-1 opacity-50" />
                        <p className="small mb-0">No recent activity. Click <strong>"Discover by Organization"</strong> to find repos, then poll events from the Activity tab.</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>

                <Row className="g-4">
                  {/* Repos by Visibility */}
                  <Col md={6}>
                    <Card className="border-0 h-100" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 16 }}>
                      <Card.Body>
                        <h6 className="fw-bold mb-3" style={{ color: "var(--text-color)" }}>Repositories by Visibility</h6>
                        <div className="d-flex flex-column gap-2">
                          {Object.entries(stats.repos_by_visibility || {}).length > 0 ? (
                            Object.entries(stats.repos_by_visibility).map(([vis, count]) => (
                              <div key={vis} className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: "var(--input-bg, #f8f9fa)" }}>
                                <span className="fw-medium" style={{ color: "var(--text-color)" }}>
                                  <Badge bg={VISIBILITY_BADGE[vis] || "secondary"} className="me-2">{vis}</Badge>
                                  {vis.charAt(0).toUpperCase() + vis.slice(1)}
                                </span>
                                <span className="fw-bold" style={{ color: "var(--text-color)" }}>{count}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted small mb-0">No data yet. Discover repositories to see stats.</p>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Repos by Language */}
                  <Col md={6}>
                    <Card className="border-0 h-100" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 16 }}>
                      <Card.Body>
                        <h6 className="fw-bold mb-3" style={{ color: "var(--text-color)" }}>Repositories by Language</h6>
                        <div className="d-flex flex-column gap-2">
                          {Object.entries(stats.repos_by_language || {}).length > 0 ? (
                            Object.entries(stats.repos_by_language).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([lang, count]) => (
                              <div key={lang} className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: "var(--input-bg, #f8f9fa)" }}>
                                <span className="fw-medium" style={{ color: "var(--text-color)" }}>{lang}</span>
                                <span className="fw-bold" style={{ color: "var(--text-color)" }}>{count}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted small mb-0">No data yet. Discover repositories to see stats.</p>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Quick Actions */}
                  <Col md={12}>
                    <Card className="border-0" style={{ background: "var(--header-bg)", border: "1px solid var(--header-border)", borderRadius: 16 }}>
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="fw-bold mb-0" style={{ color: "var(--text-color)" }}>
                            <FiActivity className="me-2" />Quick Actions
                          </h6>
                        </div>
                        <Row className="g-3">
                          <Col md={3}>
                            <Button variant="outline-primary" className="w-100 py-3" onClick={handleDiscoverByOrg} disabled={discovering} style={{ borderRadius: 12 }}>
                              {discovering ? <Spinner animation="border" size="sm" className="mb-1 d-block mx-auto" /> : <FiSearch size={20} className="mb-1 d-block mx-auto" />}
                              <span className="small">Discover by {stats?.org_name ? `"${stats.org_name}"` : "Organization"}</span>
                            </Button>
                          </Col>
                          <Col md={3}>
                            <Button variant="outline-success" className="w-100 py-3" onClick={() => setActiveTab("repos")} style={{ borderRadius: 12 }}>
                              <FiGithub size={20} className="mb-1 d-block mx-auto" />
                              <span className="small">View Repositories</span>
                            </Button>
                          </Col>
                          <Col md={3}>
                            <Button variant="outline-warning" className="w-100 py-3" onClick={() => setActiveTab("activity")} style={{ borderRadius: 12 }}>
                              <FiClock size={20} className="mb-1 d-block mx-auto" />
                              <span className="small">View Activity</span>
                            </Button>
                          </Col>
                          <Col md={3}>
                            <Button variant="outline-danger" className="w-100 py-3" onClick={handleScanAllRepos} disabled={batchScanning || repos.length === 0} style={{ borderRadius: 12 }}>
                              {batchScanning ? <Spinner animation="border" size="sm" className="mb-1 d-block mx-auto" /> : <FiShield size={20} className="mb-1 d-block mx-auto" />}
                              <span className="small">Scan All for Secrets</span>
                            </Button>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </>
            )}

            {/* Tab: Repositories */}
            {activeTab === "repos" && (
              <Card
                className="border-0"
                style={{
                  background: "var(--header-bg)",
                  border: "1px solid var(--header-border)",
                  borderRadius: 16,
                }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0" style={{ color: "var(--text-color)" }}>
                      <FiGithub className="me-2" />
                      Discovered Repositories
                      {stats?.org_name && (
                        <span className="text-muted ms-2" style={{ fontSize: "0.8rem", fontWeight: 400 }}>
                          — matching "{stats.org_name}"
                        </span>
                      )}
                    </h6>
                    <div className="d-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={handleDiscoverByOrg}
                        disabled={discovering}
                      >
                        {discovering ? (
                          <Spinner animation="border" size="sm" className="me-1" />
                        ) : (
                          <FiSearch className="me-1" size={14} />
                        )}
                        {stats?.org_name ? `Discover "${stats.org_name}"` : "Discover by Organization"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={handleScanAllRepos}
                        disabled={batchScanning || repos.length === 0}
                      >
                        {batchScanning ? (
                          <Spinner animation="border" size="sm" className="me-1" />
                        ) : (
                          <FiShield className="me-1" size={14} />
                        )}
                        Scan All for Secrets
                      </Button>
                    </div>
                  </div>

                  {reposLoading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" size="sm" />
                      <span className="ms-2 text-muted small">Loading repositories...</span>
                    </div>
                  ) : repos.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <FiGithub size={32} className="mb-2 opacity-50" />
                      <p className="small mb-0">
                        No repositories discovered yet. Click <strong>"Discover by Organization"</strong> to find repos matching your organization name on GitHub.
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive rounded-3 border" style={{ borderColor: "var(--header-border)" }}>
                      <Table hover className="mb-0 align-middle">
                        <thead>
                          <tr>
                            <th className="py-3 px-3 border-0">Repository</th>
                            <th className="py-3 px-3 border-0 text-center" title="Watching">
                              <FiEye size={14} /> Watch
                            </th>
                            <th className="py-3 px-3 border-0 text-center" title="Pushes (7d)">
                              <FiGitCommit size={14} /> Push
                            </th>
                            <th className="py-3 px-3 border-0 text-center" title="Created (7d)">
                              <FiGitPullRequest size={14} /> Create
                            </th>
                            <th className="py-3 px-3 border-0 text-center" title="Updated (7d)">
                              <FiRefreshCw size={14} /> Update
                            </th>
                            <th className="py-3 px-3 border-0 text-center" title="Latest Action Status">
                              <FiPlay size={14} /> Action
                            </th>
                            <th className="py-3 px-3 border-0 text-center">
                              <FiStar size={14} /> Stars
                            </th>
                            <th className="py-3 px-3 border-0 text-center">
                              <FiAlertTriangle size={14} /> Secrets
                            </th>
                            <th className="py-3 px-3 border-0">Status</th>
                            <th className="py-3 px-3 border-0 text-end">Act</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repos.map((repo) => {
                            const actionStatus = repo.latest_action_status;
                            const actionColor = actionStatus?.status === 'completed' ? '#198754' : actionStatus?.status === 'failed' ? '#dc3545' : actionStatus?.status === 'running' ? '#fd7e14' : actionStatus?.status === 'cancelled' ? '#6c757d' : '#adb5bd';
                            return (
                            <tr key={repo.id}>
                              <td className="px-3 py-3">
                                <div className="d-flex flex-column">
                                  <a
                                    href={repo.repo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="fw-semibold text-decoration-none"
                                    style={{ color: "var(--text-color)" }}
                                  >
                                    {repo.name}
                                  </a>
                                  <span className="small text-muted">{truncate(repo.description, 50)}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="fw-semibold" style={{ color: "#0dcaf0", fontSize: "0.9rem" }}>
                                  {repo.watching_count || 0}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="fw-semibold" style={{ color: "#0d6efd" }}>
                                  {repo.recent_pushes || 0}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="fw-semibold" style={{ color: "#198754" }}>
                                  {repo.recent_creates || 0}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="fw-semibold" style={{ color: "#6f42c1" }}>
                                  {repo.recent_updates || 0}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                {actionStatus ? (
                                  <div title={`${actionStatus.name || ''} - ${actionStatus.conclusion || actionStatus.status}`}>
                                    <span
                                      className="fw-semibold small d-inline-flex align-items-center gap-1"
                                      style={{ color: actionColor }}
                                    >
                                      <span
                                        style={{
                                          display: 'inline-block',
                                          width: 8,
                                          height: 8,
                                          borderRadius: '50%',
                                          background: actionColor,
                                          flexShrink: 0,
                                        }}
                                      />
                                      {actionStatus.status}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>—</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <div className="d-flex align-items-center justify-content-center gap-1">
                                  <FiStar size={12} className="text-warning" />
                                  <span>{repo.stars}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                {repo.hardcoded_credentials_count > 0 ? (
                                  <span className="fw-bold text-danger">
                                    {repo.hardcoded_credentials_count}
                                  </span>
                                ) : (
                                  <span className="text-muted">{repo.hardcoded_credentials_count}</span>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <div className="d-flex flex-column align-items-start gap-1">
                                  <Badge bg={STATUS_BADGE[repo.status] || "secondary"} pill style={{ fontSize: "0.65rem" }}>
                                    {repo.status}
                                  </Badge>
                                  <small className="text-muted" style={{ fontSize: "0.6rem" }}>
                                    {formatDate(repo.last_scanned_at)}
                                  </small>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-end">
                                <div className="d-flex gap-1 justify-content-end">
                                  <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() => handlePollEvents(repo.id)}
                                    disabled={pollingRepoId === repo.id}
                                    title="Poll events"
                                    style={{ padding: "4px 8px", fontSize: "0.7rem" }}
                                  >
                                    <FiRefreshCw size={11} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => handleScanRepo(repo.id)}
                                    disabled={scanningRepoId === repo.id || repo.status === "scanning"}
                                    title="Scan for secrets"
                                    style={{ padding: "4px 8px", fontSize: "0.7rem" }}
                                  >
                                    {scanningRepoId === repo.id ? (
                                      <Spinner animation="border" size="sm" />
                                    ) : (
                                      <FiShield size={11} />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )})}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Tab: Activity Feed */}
            {activeTab === "activity" && (
              <Card
                className="border-0"
                style={{
                  background: "var(--header-bg)",
                  border: "1px solid var(--header-border)",
                  borderRadius: 16,
                }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0" style={{ color: "var(--text-color)" }}>
                      <FiClock className="me-2" />
                      GitHub Activity Feed
                    </h6>
                    <div className="d-flex gap-2">
                      <div className="d-flex align-items-center gap-1">
                        <FiFilter size={14} className="text-muted" />
                        <Form.Select
                          size="sm"
                          value={eventTypeFilter}
                          onChange={(e) => setEventTypeFilter(e.target.value)}
                          style={{
                            borderRadius: 8,
                            fontSize: "0.8rem",
                            width: "auto",
                            minWidth: 130,
                          }}
                        >
                          <option value="all">All Events</option>
                          <option value="push">Pushes</option>
                          <option value="create">Created</option>
                          <option value="repo_updated">Repo Updated</option>
                          <option value="action_completed">Actions: Success</option>
                          <option value="action_failed">Actions: Failed</option>
                          <option value="action_in_progress">Actions: Running</option>
                        </Form.Select>
                      </div>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => { fetchEvents(); }}
                        disabled={eventsLoading}
                      >
                        <FiRefreshCw className="me-1" size={14} />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {eventsLoading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" size="sm" />
                      <span className="ms-2 text-muted small">Loading activity feed...</span>
                    </div>
                  ) : events.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <FiClock size={32} className="mb-2 opacity-50" />
                      <p className="small mb-0">
                        No GitHub events recorded yet. Discover repos by organization and poll events to see activity here.
                      </p>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {events.map((ev) => {
                        const icon = EVENT_ICONS[ev.event_type] || FiActivity;
                        const color = EVENT_COLORS[ev.event_type] || "#6c757d";
                        const Icon = icon;
                        return (
                          <div
                            key={ev.id}
                            className="d-flex align-items-start gap-3 p-3 rounded"
                            style={{
                              background: "var(--input-bg, #f8f9fa)",
                              borderLeft: `4px solid ${color}`,
                            }}
                          >
                            <div
                              className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                              style={{
                                width: 40,
                                height: 40,
                                background: `${color}20`,
                                color: color,
                              }}
                            >
                              <Icon size={18} />
                            </div>
                            <div className="flex-grow-1 min-w-0">
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <span
                                    className="fw-semibold"
                                    style={{ color: "var(--text-color)", fontSize: "0.9rem" }}
                                  >
                                    <a
                                      href={ev.repo_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-decoration-none"
                                      style={{ color: "var(--text-color)" }}
                                    >
                                      {ev.repo_name}
                                    </a>
                                  </span>
                                  <Badge
                                    bg="none"
                                    className="ms-2"
                                    style={{
                                      background: `${color}20`,
                                      color: color,
                                      fontSize: "0.7rem",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {ev.event_type?.replace(/_/g, ' ') || ev.event_type}
                                  </Badge>
                                </div>
                                <small
                                  className="text-muted flex-shrink-0 ms-2"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  {formatDate(ev.event_occurred_at)}
                                </small>
                              </div>

                              {/* Actor */}
                              {ev.actor && (
                                <div className="d-flex align-items-center gap-1 mt-1">
                                  <FiUser size={11} className="text-muted" />
                                  <small className="text-muted">{ev.actor}</small>
                                </div>
                              )}

                              {/* Push details */}
                              {ev.event_type === "push" && (
                                <div className="mt-1">
                                  {ev.ref && (
                                    <small className="text-muted d-block">
                                      <FiGitBranch size={11} className="me-1" />
                                      {ev.ref?.replace('refs/heads/', '') || ev.ref}
                                    </small>
                                  )}
                                  {ev.commit_message && (
                                    <small
                                      className="d-block mt-1"
                                      style={{
                                        color: "var(--text-color)",
                                        fontStyle: "italic",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: 500,
                                      }}
                                    >
                                      <FiGitCommit size={11} className="me-1 text-muted" />
                                      {truncate(ev.commit_message, 80)}
                                    </small>
                                  )}
                                  {ev.commit_count > 0 && (
                                    <small className="text-muted mt-1 d-block">
                                      {ev.commit_count} commit{ev.commit_count > 1 ? 's' : ''}
                                    </small>
                                  )}
                                </div>
                              )}

                              {/* Create details */}
                              {ev.event_type === "create" && ev.ref && (
                                <small className="text-muted mt-1 d-block">
                                  <FiGitPullRequest size={11} className="me-1" />
                                  {ev.ref}
                                </small>
                              )}

                              {/* Action details */}
                              {ev.event_type.startsWith("action") && (
                                <div className="mt-1">
                                  {ev.action_name && (
                                    <small className="d-block" style={{ color: "var(--text-color)" }}>
                                      <FiPlay size={11} className="me-1 text-muted" />
                                      {ev.action_name}
                                    </small>
                                  )}
                                  {ev.ref && (
                                    <small className="text-muted d-block">
                                      <FiGitBranch size={11} className="me-1" />
                                      {ev.ref}
                                    </small>
                                  )}
                                  {ev.action_run_url && (
                                    <a
                                      href={ev.action_run_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="small text-decoration-none mt-1 d-inline-block"
                                    >
                                      <FiExternalLink size={11} className="me-1" />
                                      View Run
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Repo Updated */}
                              {ev.event_type === "repo_updated" && ev.commit_message && (
                                <small className="text-muted mt-1 d-block">
                                  {ev.commit_message}
                                </small>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Tab: Scan History */}
            {activeTab === "scans" && (
              <Card
                className="border-0"
                style={{
                  background: "var(--header-bg)",
                  border: "1px solid var(--header-border)",
                  borderRadius: 16,
                }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0" style={{ color: "var(--text-color)" }}>
                      <FiShield className="me-2" />
                      Secret Scan History
                    </h6>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={fetchScans}
                      disabled={scansLoading}
                    >
                      <FiRefreshCw className="me-1" size={14} />
                      Refresh
                    </Button>
                  </div>

                  {scansLoading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" size="sm" />
                      <span className="ms-2 text-muted small">Loading scan history...</span>
                    </div>
                  ) : scans.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <FiShield size={32} className="mb-2 opacity-50" />
                      <p className="small mb-0">
                        No scans performed yet. Click the shield icon on a repository to scan it for hardcoded secrets.
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive rounded-3 border" style={{ borderColor: "var(--header-border)" }}>
                      <Table hover className="mb-0 align-middle">
                        <thead>
                          <tr>
                            <th className="py-3 px-3 border-0">Repository</th>
                            <th className="py-3 px-3 border-0">Status</th>
                            <th className="py-3 px-3 border-0 text-center">
                              <FiAlertTriangle size={14} /> Secrets
                            </th>
                            <th className="py-3 px-3 border-0 text-center">
                              <FiFileText size={14} /> Files
                            </th>
                            <th className="py-3 px-3 border-0">Summary</th>
                            <th className="py-3 px-3 border-0">Started</th>
                            <th className="py-3 px-3 border-0">Completed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scans.map((scan) => (
                            <tr key={scan.id}>
                              <td className="px-3 py-3 fw-semibold" style={{ color: "var(--text-color)" }}>
                                {scan.repo_name || "N/A"}
                              </td>
                              <td className="px-3 py-3">
                                <Badge bg={SCAN_STATUS_BADGE[scan.status] || "secondary"} pill>
                                  {scan.status}
                                </Badge>
                              </td>
                              <td className="px-3 py-3 text-center">
                                {scan.hardcoded_credentials_count > 0 ? (
                                  <span className="fw-bold text-danger">
                                    {scan.hardcoded_credentials_count}
                                  </span>
                                ) : (
                                  <span className="text-muted">{scan.hardcoded_credentials_count}</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center text-muted">
                                {scan.scanned_files_count}
                              </td>
                              <td className="px-3 py-3 small text-muted">
                                {truncate(scan.secrets_summary, 40)}
                              </td>
                              <td className="px-3 py-3 small text-muted">
                                {formatDate(scan.started_at)}
                              </td>
                              <td className="px-3 py-3 small text-muted">
                                {formatDate(scan.completed_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
          </>
        )}

        {/* Add Repo Modal */}
        <Modal show={showAddRepoModal} onHide={() => setShowAddRepoModal(false)} centered>
          <Modal.Header closeButton style={{ borderBottom: "1px solid var(--border-color)" }}>
            <Modal.Title className="fw-bold" style={{ fontSize: "1rem" }}>
              <FiGithub className="me-2" />
              Add Repository Manually
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleAddRepo}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-muted">GITHUB REPOSITORY</Form.Label>
                <Form.Control
                  type="text"
                  placeholder='e.g., "octocat/Hello-World" or "https://github.com/octocat/Hello-World"'
                  value={addRepoForm.full_name}
                  onChange={(e) => setAddRepoForm({ ...addRepoForm, full_name: e.target.value })}
                  required
                  style={{ borderRadius: 10, height: 46 }}
                />
                <Form.Text className="text-muted">
                  Enter <code>owner/repo</code> or a full GitHub URL.
                  The repository metadata will be fetched from the GitHub API.
                </Form.Text>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer style={{ borderTop: "1px solid var(--border-color)" }}>
              <Button variant="outline-secondary" onClick={() => setShowAddRepoModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                disabled={addingRepo || !addRepoForm.full_name.trim()}
              >
                {addingRepo ? (
                  <Spinner animation="border" size="sm" className="me-1" />
                ) : (
                  <FiPlus className="me-1" />
                )}
                Add Repository
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default SurfaceWebPage;
