<<<<<<< HEAD
import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Table, Badge, Modal, Button, Form, Spinner } from "react-bootstrap";
import { FiPlusCircle, FiTrendingUp, FiShield, FiBell, FiEye, FiDownload, FiCheckCircle, FiAlertOctagon, FiAlertTriangle, FiAlertCircle } from "react-icons/fi";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import * as jsPDFModule from "jspdf";
import { sanitizeSubdomainStr, getRootDomain, combineSubdomainAndRoot } from "../utils/domainSanitizer";
import { addMonitoredDomain, fetchAllPages, fetchMonitoredDomains } from "../utils/api";
import { useScan } from "../context/ScanContext";

const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default?.jsPDF || jsPDFModule.default || jsPDFModule;

const DashboardPage = () => {
  const navigate = useNavigate();
  const { startScan: contextStartScan, scanState, refreshKey } = useScan();

  // Modal states
  const [showScanModal, setShowScanModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [userPlan, setUserPlan] = useState(localStorage.getItem("userPlan") || "Free");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Smart scan wizard states
  const [wizardStep, setWizardStep] = useState("input_subdomain");
  const [inputSubdomainName, setInputSubdomainName] = useState("");
  const [selectedExistingDomain, setSelectedExistingDomain] = useState("");
  const [newRootDomain, setNewRootDomain] = useState("");
  const [specificPrefix, setSpecificPrefix] = useState("");

  // Render exact timestamp as a two-line block to avoid horizontal collision
  const renderExactTimestamp = (dateString) => {
    if (!dateString) return <span className="text-muted">-</span>;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return <span className="text-muted">-</span>;
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      return (
        <div className="d-flex flex-column align-items-start" style={{ lineHeight: '1.2' }}>
          <span style={{ color: 'var(--text-primary, #1a1a1a)', fontWeight: 500, fontSize: '0.82rem' }}>{dateStr}</span>
          <span style={{ color: 'var(--text-secondary, #4a5568)', opacity: 0.8, fontSize: '0.72rem' }}>{timeStr}</span>
        </div>
      );
    } catch (error) {
      return <span className="text-muted">-</span>;
    }
  };

  const [reportReady, setReportReady] = useState(false);
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'info', onConfirm: null });

  // Dashboard stats and listings
  const [subdomains, setSubdomains] = useState([]);
  const [uniqueDomains, setUniqueDomains] = useState([]);
  const [expandedDomain, setExpandedDomain] = useState(null);

  const sortedSubdomains = React.useMemo(() => {
    // Group and sort subdomains alphabetically right after their root (Apex) domains
    const groups = {};
    subdomains.forEach(item => {
      const root = getRootDomain(item.domain).toLowerCase() || "unknown";
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
      const apexItems = items.filter(item => getRootDomain(item.domain).toLowerCase() === item.domain.toLowerCase());
      const subItems = items.filter(item => getRootDomain(item.domain).toLowerCase() !== item.domain.toLowerCase());

      // Sort subdomains alphabetically by domain name
      subItems.sort((a, b) => a.domain.localeCompare(b.domain));

      // Add apex items first, then subdomains
      result.push(...apexItems);
      result.push(...subItems);
    });

    return result;
  }, [subdomains]);
  const [stats, setStats] = useState([]);
  const [vulns, setVulns] = useState([]);
  const [activities, setActivities] = useState([]);

  // Tab State for Asset & Environment Explorer
  const [explorerTab, setExplorerTab] = useState("web_entities");
  const [domainInput, setDomainInput] = useState("");
  const [morningTime, setMorningTime] = useState("09:00");
  const [nightTime, setNightTime] = useState("21:00");
  const [monitoredDomains, setMonitoredDomains] = useState([]);
  const [domainSaving, setDomainSaving] = useState(false);

  // States for extra explorer tabs
  const [buckets, setBuckets] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [software, setSoftware] = useState([]);
  const [hostsByCountry, setHostsByCountry] = useState([]);
  const [discoverySources, setDiscoverySources] = useState([]);
  const [trends, setTrends] = useState([]);
  const [webEntities, setWebEntities] = useState([]);

  const [portCount, setPortCount] = useState(0);

  // Dashboard severity counts
  const [vulnerabilityCounts, setVulnerabilityCounts] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  });



  const loadData = useCallback(async (scanId = null) => {
    try {
      const orgId = "1";
      const [subList, vulnList, endpointsList, portList, techList, sslList, domainList] = await Promise.all([
        fetchAllPages('subdomains', orgId, scanId).catch(() => []),
        fetchAllPages('vulnerabilities', orgId, scanId).catch(() => []),
        fetchAllPages('endpoints', orgId, scanId).catch(() => []),
        fetchAllPages('open-ports', orgId, scanId).catch(() => []),
        fetchAllPages('technologies', orgId, scanId).catch(() => []),
        fetchAllPages('ssl-certificates', orgId, scanId).catch(() => []),
        fetchMonitoredDomains(orgId).catch(() => []),
      ]);

      const safeSubs = subList.map(s => ({
        ...s,
        dns_records: s.dns_records || [],
        vulnerabilities_count: s.vulnerabilities_count || 0,
        technologies: s.technologies || [],
        ip: s.ip || [],
        ports: s.ports || [],
      }));
      setSubdomains(safeSubs);

      const domainsSet = new Set();
      safeSubs.forEach(s => {
        const root = getRootDomain(s.domain);
        if (root) domainsSet.add(root);
      });
      setUniqueDomains(Array.from(domainsSet));

      const displayVulns = vulnList.map(v => ({
        id: v.id,
        title: v.finding || v.title || "Vulnerability",
        severity: (v.severity || "Low").charAt(0).toUpperCase() + (v.severity || "low").slice(1).toLowerCase(),
        status: "Open",
        time: v.discovered_at ? new Date(v.discovered_at).toLocaleString() : new Date().toLocaleString()
      }));
      setVulns(displayVulns);

      const crit = vulnList.filter(v => v.severity?.toUpperCase() === "CRITICAL").length;
      const high = vulnList.filter(v => v.severity?.toUpperCase() === "HIGH").length;
      const med = vulnList.filter(v => v.severity?.toUpperCase() === "MEDIUM").length;
      const low = vulnList.filter(v => v.severity?.toUpperCase() === "LOW").length;

      setStats([
        { title: "Critical Issues", count: crit || 0, color: "danger" },
        { title: "High Severity", count: high || 0, color: "warning" },
        { title: "Medium Severity", count: med || 0, color: "info" },
        { title: "Subdomains Scanned", count: safeSubs.length, color: "primary" },
      ]);

      setVulnerabilityCounts({ critical: crit, high, medium: med, low });

      setWebEntities(endpointsList);
      setCertificates(sslList);
      setPortCount(portList.length);
      
      if (domainList && domainList.length > 0) {
        setMonitoredDomains(domainList);
      } else {
        setMonitoredDomains([]);
      }

      setActivities(prev => ["Dashboard loaded with live scan data.", ...prev.slice(0, 4)]);
    } catch (err) {
      setActivities(prev => ["Dashboard loaded (some data may be unavailable).", ...prev.slice(0, 4)]);
    }
  }, []);

  useEffect(() => {
    const handleShowSub = () => setShowSubscriptionModal(true);
    window.addEventListener('showSubscription', handleShowSub);

    return () => window.removeEventListener('showSubscription', handleShowSub);
  }, []);

  const prevPhasesRef = React.useRef({});
  useEffect(() => {
    const phases = scanState.phasesDone || {};
    const changed = Object.keys(phases).some(k => phases[k] && !prevPhasesRef.current[k]);
    if (changed) {
      prevPhasesRef.current = { ...phases };
      loadData(scanState.scanId);
    }
  }, [scanState.phasesDone, loadData, scanState.scanId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Reset report generator states when modal opens/closes
  useEffect(() => {
    if (!showReportModal) {
      setReportReady(false);
    }
  }, [showReportModal]);

  const badgeVariant = (sev) => {
    switch (sev) {
      case "Critical": return "danger";
      case "High": return "warning";
      case "Medium": return "info";
      default: return "secondary";
    }
  };

  const normalizeDomainInput = (value) => {
    return value.trim().toLowerCase().replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    const domain = normalizeDomainInput(domainInput);
    if (!domain) return;

    // Check plan restriction: Free tier is limited to 1 monitored domain
    if (userPlan === "Free" && monitoredDomains.length >= 1) {
      setShowSubscriptionModal(true);
      return;
    }

    setDomainSaving(true);
    try {
      const result = await addMonitoredDomain({
        domain,
        org_id: "1",
        morning_time: morningTime,
        night_time: nightTime,
        morning_enabled: true,
        night_enabled: true,
        auto_scan_on_add: true,
        scan_now: false,
      });
      contextStartScan(domain);
      setActivities(prev => [`Domain added, scheduled, and scan started for ${domain}`, ...prev.slice(0, 9)]);
      setDomainInput("");
      await loadData();
    } catch {
            setActivities(prev => [`Failed to add domain ${domain}. Server may be unavailable.`, ...prev.slice(0, 9)]);
    } finally {
      setDomainSaving(false);
    }
  };

  const handleQuickScan = async () => {
    const domain = normalizeDomainInput(domainInput || monitoredDomains[0]?.domain || "");
    if (!domain) return;

    // Check plan restriction: If scanning a NEW domain and Free limit is reached
    const isExisting = monitoredDomains.some(m => m.domain === domain);
    if (!isExisting && userPlan === "Free" && monitoredDomains.length >= 1) {
      setShowSubscriptionModal(true);
      return;
    }

    setDomainSaving(true);
    try {
      contextStartScan(domain);
      setActivities(prev => [`Quick scan started for ${domain}`, ...prev.slice(0, 9)]);
      
      setDomainInput("");
    } catch {
            setActivities(prev => [`Quick scan failed for ${domain}. Server may be unavailable.`, ...prev.slice(0, 9)])
    } finally {
      setDomainSaving(false);
    }
  };

  // Smart Subdomain wizard submit handler
  const handleWizardSubmit = (e) => {
    e.preventDefault();

    if (wizardStep === "input_subdomain") {
      let rawVal = inputSubdomainName.trim().toLowerCase();
      rawVal = rawVal.replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
      rawVal = sanitizeSubdomainStr(rawVal);
      
      if (!rawVal) return;

      setInputSubdomainName(rawVal);
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
  };

  const handleExistingDomainSubmit = (e) => {
    e.preventDefault();
    if (!selectedExistingDomain) return;
    const targetSub = sanitizeSubdomainStr(combineSubdomainAndRoot(specificPrefix, selectedExistingDomain));
    setShowScanModal(false);
    contextStartScan(targetSub);
  };

  const handleNewDomainSubmit = (e) => {
    e.preventDefault();
    let root = newRootDomain.trim().toLowerCase();
    root = root.replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
    if (!root) return;
    const targetSub = sanitizeSubdomainStr(combineSubdomainAndRoot(specificPrefix, root));
    // Check plan restriction: Free tier is limited to 1 monitored domain
    if (userPlan === "Free" && monitoredDomains.length >= 1) {
      setShowSubscriptionModal(true);
      setShowScanModal(false);
      return;
    }
    setShowScanModal(false);
    contextStartScan(targetSub);
  };

  // Synchronous PDF Compilation and Instant Save on direct user trigger
  const handleDownloadPDF = (isAutoDownload = false) => {
    try {
      // Initialize jsPDF document (A4 portrait)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      const margin = 40;
      let y = 120;

      // 1. Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 595.28, 90, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("SENTINEL SECURITY", margin, 45);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("EXECUTIVE AUDIT & VULNERABILITY REPORT", margin, 65);
      
      // Date/Info on Right
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 595.28 - margin - 180, 45);
      doc.text("Format: Comprehensive Executive PDF", 595.28 - margin - 180, 60);

      // Section 1: Executive Summary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("1. Executive Summary", margin, y);
      y += 15;
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(1);
      doc.line(margin, y, 595.28 - margin, y);
      y += 20;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("This report compiles a comprehensive snapshot of security vulnerabilities discovered during automated passive and active discovery scans. It outlines exposed endpoints, technologies, and system vulnerability logs ranked by standard CVSS severity levels.", margin, y, { maxWidth: 515 });
      y += 45;

      // Render Executive Stats Cards
      const boxWidth = 117;
      const boxHeight = 50;
      const boxGap = 15;
      let boxX = margin;
      
      stats.forEach((stat) => {
        let r = 241, g = 245, b = 249; // default slate-100
        let textR = 71, textG = 85, textB = 105;
        
        if (stat.color === 'danger') {
          r = 254; g = 242; b = 242; // red-50
          textR = 220; textG = 38; textB = 38; // red-600
        } else if (stat.color === 'warning') {
          r = 255; g = 251; b = 235; // amber-50
          textR = 217; textG = 119; textB = 6; // amber-600
        } else if (stat.color === 'info') {
          r = 240; g = 253; b = 250; // teal-50
          textR = 13; textG = 148; textB = 136; // teal-600
        } else if (stat.color === 'primary') {
          r = 239; g = 246; b = 255; // blue-50
          textR = 37; textG = 99; textB = 235; // blue-600
        }
        
        doc.setFillColor(r, g, b);
        doc.rect(boxX, y, boxWidth, boxHeight, 'F');
        
        doc.setFillColor(textR, textG, textB);
        doc.rect(boxX, y, 4, boxHeight, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(stat.title.toUpperCase(), boxX + 10, y + 18);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(textR, textG, textB);
        doc.text(String(stat.count), boxX + 10, y + 38);
        
        boxX += boxWidth + boxGap;
      });
      
      y += boxHeight + 35;

      // Section 2: Logged Vulnerabilities
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("2. Logged Vulnerabilities", margin, y);
      y += 15;
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(1);
      doc.line(margin, y, 595.28 - margin, y);
      y += 20;

      // Table Header
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(margin, y, 515, 25, 'F');
      
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, 595.28 - margin, y);
      doc.line(margin, y + 25, 595.28 - margin, y + 25);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // slate-600
      
      doc.text("SEVERITY", margin + 10, y + 16);
      doc.text("FINDING / VULNERABILITY TITLE", margin + 90, y + 16);
      doc.text("STATUS", margin + 370, y + 16);
      doc.text("DISCOVERED", margin + 430, y + 16);
      
      y += 25;

      // Table Rows
      vulns.forEach((v) => {
        if (!v) return;
        const severityStr = String(v.severity || 'LOW').toUpperCase();
        const statusStr = String(v.status || 'Open');
        const titleStr = String(v.title || v.finding || '');
        const timeStr = String(v.time || v.discovered_at || '');

        if (y > 740) {
          doc.addPage();
          y = 50;
          
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, 515, 25, 'F');
          
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y, 595.28 - margin, y);
          doc.line(margin, y + 25, 595.28 - margin, y + 25);
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          
          doc.text("SEVERITY", margin + 10, y + 16);
          doc.text("FINDING / VULNERABILITY TITLE", margin + 90, y + 16);
          doc.text("STATUS", margin + 370, y + 16);
          doc.text("DISCOVERED", margin + 430, y + 16);
          
          y += 25;
        }

        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y, 515, 30, 'F');
        
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 30, 595.28 - margin, y + 30);
        
        let badgeR = 100, badgeG = 116, badgeB = 139;
        if (severityStr === 'CRITICAL') {
          badgeR = 220; badgeG = 38; badgeB = 38;
        } else if (severityStr === 'HIGH') {
          badgeR = 217; badgeG = 119; badgeB = 6;
        } else if (severityStr === 'MEDIUM') {
          badgeR = 13; badgeG = 148; badgeB = 136;
        } else if (severityStr === 'LOW') {
          badgeR = 37; badgeG = 99; badgeB = 235;
        }
        
        doc.setFillColor(badgeR, badgeG, badgeB);
        doc.rect(margin + 10, y + 8, 60, 14, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(severityStr, margin + 40, y + 17, { align: 'center' });
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        let displayTitle = titleStr;
        if (displayTitle.length > 55) {
          displayTitle = displayTitle.slice(0, 52) + "...";
        }
        doc.text(displayTitle, margin + 90, y + 18);
        
        let statusColor = [220, 38, 38];
        if (statusStr.toLowerCase() !== 'open') {
          statusColor = [22, 163, 74];
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(statusStr, margin + 370, y + 18);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(timeStr, margin + 430, y + 18);
        
        y += 30;
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, 800, 595.28 - margin, 800);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Sentinel Security Discovery Platform", margin, 815);
        doc.text(`Page ${i} of ${pageCount}`, 595.28 - margin, 815, { align: 'right' });
      }

      doc.save(`Sentinel_Security_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      setActivities(prev => [`Comprehensive security report generated in PDF format and downloaded`, ...prev]);
      if (!isAutoDownload) {
        setShowReportModal(false);
      }
    } catch (pdfErr) {
      console.error("Error generating PDF:", pdfErr);
      alert("Error generating PDF: " + pdfErr.message);
    }
  };

  // Quick Action 3: Global System Security Check
  return (
    <div className="d-flex" style={{ minHeight: 'calc(100vh - 70px)' }}>
      <Sidebar />
      <div style={{ marginLeft: '280px', width: 'calc(100% - 280px)', padding: '24px 32px' }}>
        <h3 className="mb-4 fw-bold" style={{ color: 'var(--text-color)' }}>Dashboard Overview</h3>

        {/* Metric Cards */}
        <Row className="mb-4 g-3">
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Subdomains</span>
              <h2 className="mb-0 fw-bold mt-2 text-primary">{subdomains.length}</h2>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Domains</span>
              <h2 className="mb-0 fw-bold mt-2 text-info">{uniqueDomains.length}</h2>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Web Entities</span>
              <h2 className="mb-0 fw-bold mt-2 text-success">{webEntities.length}</h2>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Certificates</span>
              <h2 className="mb-0 fw-bold mt-2 text-danger">{certificates.length}</h2>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Vulnerabilities</span>
              <h2 className="mb-0 fw-bold mt-2 text-warning">{vulns.length}</h2>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Open Ports</span>
              <h2 className="mb-0 fw-bold mt-2 text-secondary">{portCount}</h2>
            </Card>
          </Col>
        </Row>

        {/* Vulnerability Severity Overview Cards */}
        <Row className="mb-4 g-3">
          <Col md={3} sm={6}>
            <Card className="border-0 p-3 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderLeft: '5px solid #EF4444', borderRadius: '12px', transition: 'all 0.2s ease-in-out' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">Critical Vulnerabilities</span>
                  <h2 className="mb-0 fw-bold mt-2 text-danger">{vulnerabilityCounts.critical}</h2>
                </div>
                <div className="p-2.5 rounded bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                  <FiAlertOctagon size={22} className="cyber-glow-red" />
                </div>
              </div>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className="border-0 p-3 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderLeft: '5px solid #F59E0B', borderRadius: '12px', transition: 'all 0.2s ease-in-out' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">High Vulnerabilities</span>
                  <h2 className="mb-0 fw-bold mt-2 text-warning">{vulnerabilityCounts.high}</h2>
                </div>
                <div className="p-2.5 rounded bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                  <FiAlertTriangle size={22} className="cyber-glow-warning" />
                </div>
              </div>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className="border-0 p-3 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderLeft: '5px solid #3B82F6', borderRadius: '12px', transition: 'all 0.2s ease-in-out' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">Medium Vulnerabilities</span>
                  <h2 className="mb-0 fw-bold mt-2 text-primary">{vulnerabilityCounts.medium}</h2>
                </div>
                <div className="p-2.5 rounded bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                  <FiAlertCircle size={22} className="cyber-glow-info" />
                </div>
              </div>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className="border-0 p-3 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderLeft: '5px solid #6B7280', borderRadius: '12px', transition: 'all 0.2s ease-in-out' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">Low Vulnerabilities</span>
                  <h2 className="mb-0 fw-bold mt-2 text-secondary">{vulnerabilityCounts.low}</h2>
                </div>
                <div className="p-2.5 rounded bg-secondary bg-opacity-10 text-secondary d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                  <FiShield size={22} className="cyber-glow-success" />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

<Card className="border-0 mb-4" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '16px' }}>
          <Card.Header className="bg-transparent pt-4 pb-2 border-bottom-0">
            <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>Domain Scan Control</h5>
            <span className="text-muted small">Add a domain to auto-scan immediately, schedule morning/night scans, or run a quick scan anytime.</span>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleAddDomain}>
              <Row className="g-3 align-items-end">
                <Col md={5}>
                  <Form.Label className="small text-muted fw-semibold">Enter URL or Domain to Analyze</Form.Label>
                  <Form.Control
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="e.g. example.com or https://example.com"
                    style={{ borderRadius: '10px' }}
                  />
                </Col>
                <Col md={2}>
                  <Form.Label className="small text-muted fw-semibold">Morning Scan</Form.Label>
                  <Form.Control type="time" value={morningTime} onChange={(e) => setMorningTime(e.target.value)} style={{ borderRadius: '10px' }} />
                </Col>
                <Col md={2}>
                  <Form.Label className="small text-muted fw-semibold">Night Scan</Form.Label>
                  <Form.Control type="time" value={nightTime} onChange={(e) => setNightTime(e.target.value)} style={{ borderRadius: '10px' }} />
                </Col>
                <Col md={3} className="d-flex gap-2">
                  <Button type="submit" variant="primary" disabled={domainSaving} className="flex-fill" style={{ borderRadius: '10px' }}>
                    {domainSaving ? <Spinner animation="border" size="sm" /> : 'Add & Auto Scan'}
                  </Button>
                  <Button type="button" variant="outline-success" disabled={domainSaving} onClick={handleQuickScan} style={{ borderRadius: '10px' }}>
                    Quick Scan
                  </Button>
                </Col>
              </Row>
            </Form>

            <div className="mt-4 table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border)', background: 'var(--bg-color)' }}>
              <Table hover className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th className="py-3 px-4 border-0">Domain</th>
                    <th className="py-3 px-4 border-0">Morning Scan</th>
                    <th className="py-3 px-4 border-0">Night Scan</th>
                    <th className="py-3 px-4 border-0">Last Morning</th>
                    <th className="py-3 px-4 border-0">Last Night</th>
                    <th className="py-3 px-4 border-0 text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoredDomains.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 fw-semibold" style={{ color: 'var(--text-color)' }}>{item.domain}</td>
                      <td className="px-4 py-3">
                        <Badge bg={item.morning_enabled ? 'success' : 'secondary'}>{item.morning_time?.slice(0, 5) || '-'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge bg={item.night_enabled ? 'primary' : 'secondary'}>{item.night_time?.slice(0, 5) || '-'}</Badge>
                      </td>
                      <td className="px-4 py-3">{renderExactTimestamp(item.last_morning_scan_at)}</td>
                      <td className="px-4 py-3">{renderExactTimestamp(item.last_night_scan_at)}</td>
                      <td className="px-4 py-3 text-end">
                        <Button
                          size="sm"
                          variant="outline-success"
                          disabled={domainSaving || scanState.isScanning}
                          onClick={() => {
                            setDomainInput(item.domain);
                            contextStartScan(item.domain);
                            setActivities(prev => [`Quick scan started for ${item.domain}`, ...prev.slice(0, 9)]);
                          }}
                        >
                          Quick Scan
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {monitoredDomains.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4">No domains added yet. Add a domain above to schedule and scan it.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        {/* Horizontal Scrollable Asset & Environment Explorer (9 Tabs) */}
        <Card className="border-0 mb-4" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '16px' }}>
          <Card.Header className="bg-transparent pt-4 pb-2 border-bottom-0">
            <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-color, #000000)' }}>Asset &amp; Environment Explorer</h5>
            <span className="text-muted small">Explore your discovered cloud assets, software inventories, SSL profiles, and risk trends.</span>
          </Card.Header>
          <Card.Body className="pt-2">
            {/* Horizontally scrolling tab navigation */}
            <div className="d-flex border-bottom mb-4 pb-2 scrollbar-none" style={{ overflowX: "auto", gap: "10px", whiteSpace: "nowrap", borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
              {[
                { id: "web_entities", label: "Web Entities", icon: "bi-link-45deg" },
                { id: "buckets", label: "Storage Buckets", icon: "bi-bucket" },
                { id: "certificates", label: "Certificates", icon: "bi-shield-check" },
                { id: "software", label: "Software", icon: "bi-cpu" }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={explorerTab === tab.id ? "primary" : "none"}
                  onClick={() => setExplorerTab(tab.id)}
                  className="d-inline-flex align-items-center gap-2"
                  style={{
                    borderRadius: "20px",
                    padding: "8px 16px",
                    fontSize: "0.82rem",
                    fontWeight: "500",
                    whiteSpace: "nowrap",
                    border: explorerTab === tab.id ? "none" : "1.5px solid var(--border-color, rgba(0,0,0,0.08))",
                    color: explorerTab === tab.id ? "#ffffff" : "var(--text-secondary, #4a5568)",
                    background: explorerTab === tab.id ? "var(--gradient-accent, #3b82f6)" : "var(--bg-color, #ffffff)",
                    boxShadow: explorerTab === tab.id ? "0 4px 12px rgba(59, 130, 246, 0.35)" : "none"
                  }}
                >
                  <i className={`bi ${tab.icon}`}></i>
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Tab Contents */}
            {explorerTab === "hosts" && (
              <div className="table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))', background: 'var(--bg-color, #ffffff)' }}>
                <Table hover className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.02)', color: 'var(--text-color, #000000)' }}>
                      <th className="py-3 px-4 border-0">Domain / Asset</th>
                      <th className="py-3 px-4 border-0">Scan Status</th>
                      <th className="py-3 px-4 border-0">Hosted</th>
                      <th className="py-3 px-4 border-0">IP Addresses</th>
                      <th className="py-3 px-4 border-0">Ports</th>
                      <th className="py-3 px-4 border-0">Vulnerabilities</th>
                      <th className="py-3 px-4 border-0">Last Scanned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSubdomains.map(sub => {
                      const isHosted = sub.ip && sub.ip.length > 0;
                      return (
                        <tr key={sub.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                          <td className="px-4 py-3 fw-semibold">
                            {(() => {
                              const isRoot = getRootDomain(sub.domain).toLowerCase() === sub.domain.toLowerCase();
                              if (isRoot) {
                                return (
                                  <div className="d-flex align-items-center flex-wrap gap-2">
                                    <i className="bi bi-globe text-primary" style={{ fontSize: '1rem' }} title="Apex Domain"></i>
                                    <span style={{ color: 'var(--text-color, #000000)', fontWeight: 600 }}>{sub.domain}</span>
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
                                    <span style={{ color: 'var(--text-secondary, #4a5568)', fontWeight: 500, opacity: 0.9 }}>{sub.domain}</span>
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
                            <Badge bg={sub.status === 'Active' ? 'success' : 'warning'}>{sub.status}</Badge>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{isHosted ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-3 text-muted">{sub.ip?.join(', ') || '-'}</td>
                          <td className="px-4 py-3 text-muted">{sub.ports?.join(', ') || '-'}</td>
                          <td className="px-4 py-3">
                            {sub.vulnerabilities_count > 0 ? (
                              <Badge bg="danger"><i className="bi bi-bug"></i> {sub.vulnerabilities_count}</Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{renderExactTimestamp(sub.updated_at)}</td>
                        </tr>
                      );
                    })}
                    {subdomains.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">No subdomains found. Start a scan to add.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}

            {explorerTab === "domains" && (
              <div className="d-flex flex-column gap-2">
                {[...uniqueDomains].sort((a,b) => a.localeCompare(b)).map(rootDom => {
                  const associated = subdomains.filter(s => getRootDomain(s.domain) === rootDom);
                  const isExpanded = expandedDomain === rootDom;
                  
                  // Calculate actual subdomains count (excluding the root domain itself)
                  const actualSubdomains = associated.filter(s => getRootDomain(s.domain).toLowerCase() !== s.domain.toLowerCase());
                  const actualSubdomainsCount = actualSubdomains.length;
                  
                  const domainVulns = vulns.filter(v => {
                    const vulnDom = v.domain || "";
                    const vulnSub = v.subdomain || "";
                    return getRootDomain(vulnDom) === rootDom || getRootDomain(vulnSub) === rootDom;
                  });
                  const criticalCount = domainVulns.filter(v => v.severity?.toUpperCase() === "CRITICAL").length;
                  const highCount = domainVulns.filter(v => v.severity?.toUpperCase() === "HIGH").length;
                  const mediumCount = domainVulns.filter(v => v.severity?.toUpperCase() === "MEDIUM").length;
                  const lowCount = domainVulns.filter(v => v.severity?.toUpperCase() === "LOW").length;

                  return (
                    <div key={rootDom} className="border rounded-3 overflow-hidden" style={{ background: 'var(--bg-color, #ffffff)', borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                      <div 
                        className="p-3 d-flex justify-content-between align-items-center cursor-pointer hover-card" 
                        onClick={() => setExpandedDomain(isExpanded ? null : rootDom)}
                        style={{ background: isExpanded ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}
                      >
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <i className="bi bi-globe2 text-primary fs-5"></i>
                          <span className="fw-bold" style={{ color: 'var(--text-color, #000000)' }}>{rootDom}</span>
                          <Badge bg="secondary" pill className="ms-1">
                            {actualSubdomainsCount} {actualSubdomainsCount === 1 ? 'subdomain' : 'subdomains'}
                          </Badge>
                          
                          {/* Severity Breakdown Badges */}
                          <div className="d-flex align-items-center gap-1 ms-3">
                            <Badge bg="danger" style={{ fontSize: '0.72rem', fontWeight: 600, opacity: criticalCount > 0 ? 1 : 0.35 }}>{criticalCount} Critical</Badge>
                            <Badge bg="warning" text="dark" style={{ fontSize: '0.72rem', fontWeight: 600, opacity: highCount > 0 ? 1 : 0.35 }}>{highCount} High</Badge>
                            <Badge bg="primary" style={{ fontSize: '0.72rem', fontWeight: 600, opacity: mediumCount > 0 ? 1 : 0.35 }}>{mediumCount} Medium</Badge>
                            <Badge bg="secondary" style={{ fontSize: '0.72rem', fontWeight: 600, opacity: lowCount > 0 ? 1 : 0.35 }}>{lowCount} Low</Badge>
                          </div>
                        </div>
                        <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} text-muted`}></i>
                      </div>

                      {isExpanded && (
                        <div className="p-3 border-top" style={{ background: 'rgba(0,0,0,0.01)', borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                          <Table hover responsive className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                            <thead>
                              <tr className="text-muted small" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                                <th className="border-0">Domain / Asset</th>
                                <th className="border-0">Status</th>
                                <th className="border-0">Hosted</th>
                                <th className="border-0">IP Addresses</th>
                                <th className="border-0">Ports</th>
                                <th className="border-0">Vulnerabilities</th>
                                <th className="border-0">Last Scanned</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...associated].sort((a, b) => {
                                const isRootA = getRootDomain(a.domain).toLowerCase() === a.domain.toLowerCase();
                                const isRootB = getRootDomain(b.domain).toLowerCase() === b.domain.toLowerCase();
                                if (isRootA) return -1;
                                if (isRootB) return 1;
                                return a.domain.localeCompare(b.domain);
                              }).map(sub => {
                                const isHosted = sub.ip && sub.ip.length > 0;
                                
                                // Calculate severity breakdown for specific subdomain
                                const subVulns = domainVulns.filter(v => v.subdomain === sub.domain || v.domain === sub.domain);
                                const subCritical = subVulns.filter(v => v.severity?.toUpperCase() === "CRITICAL").length;
                                const subHigh = subVulns.filter(v => v.severity?.toUpperCase() === "HIGH").length;
                                const subMedium = subVulns.filter(v => v.severity?.toUpperCase() === "MEDIUM").length;
                                const subLow = subVulns.filter(v => v.severity?.toUpperCase() === "LOW").length;

                                return (
                                  <tr key={sub.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                                    <td>
                                      {(() => {
                                        const isRoot = getRootDomain(sub.domain).toLowerCase() === sub.domain.toLowerCase();
                                        if (isRoot) {
                                          return (
                                            <div className="d-flex align-items-center flex-wrap gap-2">
                                              <i className="bi bi-globe text-primary" style={{ fontSize: '1rem' }} title="Apex Domain"></i>
                                              <span style={{ color: 'var(--text-color, #000000)', fontWeight: 600 }}>{sub.domain}</span>
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
                                              <span style={{ color: 'var(--text-secondary, #4a5568)', fontWeight: 500, opacity: 0.9 }}>{sub.domain}</span>
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
                                    <td>
                                      <Badge bg={sub.status === 'Active' ? 'success' : 'warning'}>{sub.status}</Badge>
                                    </td>
                                    <td style={{ color: 'var(--text-color, #000000)' }}>{isHosted ? 'Yes' : 'No'}</td>
                                    <td className="text-muted">{sub.ip?.join(', ') || '-'}</td>
                                    <td className="text-muted">{sub.ports?.join(', ') || '-'}</td>
                                    <td>
                                      <div className="d-flex align-items-center gap-1">
                                        <Badge bg="danger" style={{ fontSize: '0.7rem', opacity: subCritical > 0 ? 1 : 0.35 }}>{subCritical} C</Badge>
                                        <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem', opacity: subHigh > 0 ? 1 : 0.35 }}>{subHigh} H</Badge>
                                        <Badge bg="primary" style={{ fontSize: '0.7rem', opacity: subMedium > 0 ? 1 : 0.35 }}>{subMedium} M</Badge>
                                        <Badge bg="secondary" style={{ fontSize: '0.7rem', opacity: subLow > 0 ? 1 : 0.35 }}>{subLow} L</Badge>
                                      </div>
                                    </td>
                                    <td>{renderExactTimestamp(sub.updated_at)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
                {uniqueDomains.length === 0 && (
                  <div className="text-center text-muted small py-3">No domains available. Scan an asset to see results.</div>
                )}
              </div>
            )}

            {explorerTab === "web_entities" && (
              <div className="table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))', background: 'var(--bg-color, #ffffff)' }}>
                <Table hover className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.02)', color: 'var(--text-color, #000000)' }}>
                      <th className="py-3 px-4 border-0">HTTP URL</th>
                      <th className="py-3 px-4 border-0">Subdomain</th>
                      <th className="py-3 px-4 border-0">HTTP Status</th>
                      <th className="py-3 px-4 border-0">Content Type</th>
                      <th className="py-3 px-4 border-0">Title</th>
                      <th className="py-3 px-4 border-0">Technologies</th>
                      <th className="py-3 px-4 border-0">Last Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webEntities.map(ent => {
                      let statusBadge = "secondary";
                      if (ent.http_status === 200) statusBadge = "success";
                      else if (ent.http_status === 403 || ent.http_status === 401) statusBadge = "warning";
                      else if (ent.http_status === 404 || ent.http_status >= 500) statusBadge = "danger";

                      return (
                        <tr key={ent.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                          <td className="px-4 py-3 fw-medium text-info" style={{ wordBreak: 'break-all' }}>{ent.http_url}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{ent.subdomain_name}</td>
                          <td className="px-4 py-3">
                            <Badge bg={statusBadge}>{ent.http_status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted small">{ent.content_type || '-'}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{ent.title || '-'}</td>
                          <td className="px-4 py-3">
                            {ent.technologies?.map(t => (
                              <Badge key={t} bg="secondary" className="me-1 border border-secondary text-light">{t}</Badge>
                            )) || '-'}
                          </td>
                          <td className="px-4 py-3">{renderExactTimestamp(ent.last_scan || ent.discovered_at)}</td>
                        </tr>
                      );
                    })}
                    {webEntities.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">No web entities found. Start a scan to add.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}

            {explorerTab === "buckets" && (
              <div className="table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))', background: 'var(--bg-color, #ffffff)' }}>
                <Table hover className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.02)', color: 'var(--text-color, #000000)' }}>
                      <th className="py-3 px-4 border-0">Bucket Name</th>
                      <th className="py-3 px-4 border-0">Provider</th>
                      <th className="py-3 px-4 border-0">Access Level</th>
                      <th className="py-3 px-4 border-0">Status</th>
                      <th className="py-3 px-4 border-0">Region</th>
                      <th className="py-3 px-4 border-0">Last Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.map(b => (
                      <tr key={b.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                        <td className="px-4 py-3 fw-semibold" style={{ color: '#d97706' }}>{b.bucket_name}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{b.provider}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${b.access_level.includes("Public") ? "bg-danger text-white" : "bg-success text-white"}`}>
                            {b.access_level}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge bg={b.status === 'Secure' ? 'success' : 'danger'}>{b.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted">{b.region || '-'}</td>
                        <td className="px-4 py-3">{renderExactTimestamp(b.updated_at)}</td>
                      </tr>
                    ))}
                    {buckets.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">No storage buckets detected.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}

            {explorerTab === "certificates" && (
              <div className="table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))', background: 'var(--bg-color, #ffffff)' }}>
                <Table hover className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.02)', color: 'var(--text-color, #000000)' }}>
                      <th className="py-3 px-4 border-0">Domain</th>
                      <th className="py-3 px-4 border-0">Issuer</th>
                      <th className="py-3 px-4 border-0">Expiry Date</th>
                      <th className="py-3 px-4 border-0">Status</th>
                      <th className="py-3 px-4 border-0">Last Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map(c => (
                      <tr key={c.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                        <td className="px-4 py-3 fw-medium" style={{ color: 'var(--text-color, #000000)' }}>{c.domain}</td>
                        <td className="px-4 py-3 text-muted">{c.issuer}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{new Date(c.expiry_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <Badge bg={c.status === 'Valid' ? 'success' : 'danger'}>{c.status}</Badge>
                        </td>
                        <td className="px-4 py-3">{renderExactTimestamp(c.updated_at)}</td>
                      </tr>
                    ))}
                    {certificates.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">No SSL certificates found.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}

            {explorerTab === "software" && (
              <div className="table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))', background: 'var(--bg-color, #ffffff)' }}>
                <Table hover className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.02)', color: 'var(--text-color, #000000)' }}>
                      <th className="py-3 px-4 border-0">Name</th>
                      <th className="py-3 px-4 border-0">Version</th>
                      <th className="py-3 px-4 border-0">Hosts Count</th>
                      <th className="py-3 px-4 border-0">Risk Level</th>
                      <th className="py-3 px-4 border-0">CVEs</th>
                      <th className="py-3 px-4 border-0">Last Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {software.map(s => {
                      let riskBadge = "success";
                      if (s.risk_level === "Critical") riskBadge = "danger";
                      else if (s.risk_level === "High") riskBadge = "warning";
                      else if (s.risk_level === "Medium") riskBadge = "info";

                      return (
                        <tr key={s.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                          <td className="px-4 py-3 fw-medium" style={{ color: 'var(--text-color, #000000)' }}>{s.name}</td>
                          <td className="px-4 py-3 text-muted">{s.version}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{s.hosts_count}</td>
                          <td className="px-4 py-3">
                            <Badge bg={riskBadge}>{s.risk_level}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {s.cves && s.cves.length > 0 ? (
                              s.cves.map(cve => (
                                <Badge key={cve} bg="danger" className="me-1">{cve}</Badge>
                              ))
                            ) : (
                              <span className="text-muted">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{renderExactTimestamp(s.updated_at)}</td>
                        </tr>
                      );
                    })}
                    {software.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">No software detected.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}

          </Card.Body>
        </Card>

        {/* Quick Actions & Recent Activity */}
        <Row className="g-3">
          <Col md={6}>
            <Card 
              className="border-0 h-100"
              style={{
                background: 'var(--header-bg)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                borderRadius: '16px',
                border: '1px solid var(--header-border)'
              }}
            >
              <Card.Header className="bg-transparent border-bottom-0 pt-4 pb-2">
                <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>Quick Actions</h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex flex-column gap-3">
                  <button onClick={() => { setWizardStep("input_subdomain"); setInputSubdomainName(""); setSpecificPrefix(""); setSelectedExistingDomain(""); setNewRootDomain(""); setShowScanModal(true); }} className="btn btn-outline-primary text-start p-3 rounded-3 d-flex align-items-center" style={{ fontWeight: 500 }}>
                    <FiPlusCircle className="me-3 fs-5" /> Start New Scan
                  </button>
                  <button onClick={() => setShowReportModal(true)} className="btn btn-outline-info text-start p-3 rounded-3 d-flex align-items-center" style={{ fontWeight: 500 }}>
                    <FiTrendingUp className="me-3 fs-5" /> Generate Report
                  </button>
                  <button onClick={() => setShowCheckModal(true)} className="btn btn-outline-success text-start p-3 rounded-3 d-flex align-items-center" style={{ fontWeight: 500 }}>
                    <FiShield className="me-3 fs-5" /> Run Security Check
                  </button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card 
              className="border-0 h-100"
              style={{
                background: 'var(--header-bg)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                borderRadius: '16px',
                border: '1px solid var(--header-border)'
              }}
            >
              <Card.Header className="bg-transparent border-bottom-0 pt-4 pb-2">
                <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>Recent Activity</h5>
              </Card.Header>
              <Card.Body>
                <div className="activity-feed">
                  {activities.slice(0, 3).map((item, i) => (
                    <div key={i} className="d-flex mb-4 align-items-center">
                      <div className="me-3">
                        <div className="p-3 rounded-circle d-flex align-items-center justify-content-center" style={{ background: 'rgba(65, 105, 225, 0.1)', width: '45px', height: '45px' }}>
                          <FiBell style={{ color: '#4169E1' }} />
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 fw-medium" style={{ color: 'var(--text-color)' }}>{item}</p>
                        <small style={{ color: 'var(--text-color)', opacity: 0.6 }}>Just now</small>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* START SANITIZED SCANNING WIZARD MODAL */}
      {/* ADD SURFACE ASSET MODAL */}
      <Modal show={showScanModal} onHide={() => setShowScanModal(false)} centered className="cyber-modal">
        <style>{`
          .radar-pulse-ring {
            position: absolute; width: 100%; height: 100%; border-radius: 50%;
            border: 2px solid #3b82f6;
            animation: scanPing 2s cubic-bezier(0.21, 0.53, 0.56, 0.8) infinite;
          }
          .radar-pulse-ring-delayed {
            position: absolute; width: 100%; height: 100%; border-radius: 50%;
            border: 2px solid #a855f7;
            animation: scanPing 2s cubic-bezier(0.21, 0.53, 0.56, 0.8) infinite;
            animation-delay: 1s;
          }
          @keyframes scanPing {
            0% { transform: scale(0.9); opacity: 1; }
            100% { transform: scale(2.4); opacity: 0; }
          }
        `}</style>

        <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))' }}>
          <Modal.Title className="fw-bold font-monospace text-uppercase" style={{ fontSize: '1.05rem', letterSpacing: '0.5px' }}>
            <span>Scan New Target</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ backgroundColor: 'var(--body-bg, #fcfcfc)' }}>          
          {/* Wizard Step 1: Input subdomain / name check */}
          {wizardStep === "input_subdomain" && (
            <Form onSubmit={handleWizardSubmit}>
              <div className="text-center mb-4 position-relative py-3">
                <div className="mx-auto position-relative mb-2" style={{ width: '80px', height: '80px' }}>
                  <div className="radar-pulse-ring"></div>
                  <div className="radar-pulse-ring-delayed"></div>
                  <div className="position-absolute top-50 start-50 translate-middle bg-primary rounded-circle d-flex align-items-center justify-content-center text-white shadow-lg" style={{ width: '48px', height: '48px', zIndex: 3 }}>
                    <i className="bi bi-globe fs-4"></i>
                  </div>
                </div>
                <h5 className="fw-bold mt-3 mb-1" style={{ color: 'var(--text-color, #1a1a1a)' }}>Target Asset Entry</h5>
                <p className="text-muted small px-3 mb-0">Enter a domain or URL to run a full attack surface scan with all available cyber tools.</p>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="small text-muted fw-semibold font-monospace">ENTER DOMAIN / URL TO SCAN</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="e.g. example.com or https://example.com" 
                  value={inputSubdomainName}
                  onChange={(e) => setInputSubdomainName(e.target.value)}
                  required
                  className="fs-6"
                  style={{ height: '48px', borderRadius: '12px', border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))' }}
                />
                <Form.Text className="text-muted small mt-2 d-block">
                  The scan will perform subdomain discovery, live host probing, technology detection, port scanning, vulnerability scanning, SSL checks, and email security analysis.
                </Form.Text>
              </Form.Group>
              
              <Button 
                type="submit" 
                variant="primary" 
                className="w-100 py-2.5 mt-2 fw-semibold d-flex align-items-center justify-content-center gap-2" 
                style={{ borderRadius: '12px', height: '48px' }}
                disabled={!inputSubdomainName.trim()}
              >
                <span>Start Scan</span>
                <i className="bi bi-arrow-right-short fs-4"></i>
              </Button>
            </Form>
          )}

          {/* Wizard Step 2: Choose existing vs new domain */}
          {wizardStep === "ask_domain_type" && (
            <div>
              <div className="text-center mb-4">
                <h5 className="fw-bold mb-1" style={{ color: 'var(--text-color, #1a1a1a)' }}>Parent Domain Selection</h5>
                <p className="text-muted small mb-0">Construct target asset node tree for: <code className="text-primary font-monospace">{inputSubdomainName}</code></p>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-6">
                  <div 
                    className="cyber-option-card cyber-option-card-cyan p-4 h-100 text-center d-flex flex-column justify-content-between" 
                    onClick={() => setWizardStep("select_existing")}
                  >
                    <div>
                      <div className="text-info mb-3 mx-auto bg-info-subtle rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                        <i className="bi bi-folder-check fs-4"></i>
                      </div>
                      <h6 className="fw-bold mb-2" style={{ color: 'var(--text-color, #1a1a1a)' }}>Existing Root</h6>
                      <p className="text-muted mb-0" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>
                        Map this subdomain prefix to one of your currently registered parent domains.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="col-6">
                      <div 
                        className="cyber-option-card p-4 h-100 text-center d-flex flex-column justify-content-between" 
                        onClick={() => setWizardStep("enter_new")}
                      >
                        <div>
                          <div className="text-primary mb-3 mx-auto bg-primary-subtle rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                            <i className="bi bi-folder-plus fs-4"></i>
                          </div>
                          <h6 className="fw-bold mb-2" style={{ color: 'var(--text-color, #1a1a1a)' }}>New Parent</h6>
                          <p className="text-muted mb-0" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>
                            Define a completely new root domain node and index this subdomain under it.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button variant="link" className="w-100 text-muted small mt-2 font-monospace d-flex align-items-center justify-content-center gap-1 text-decoration-none" onClick={() => setWizardStep("input_subdomain")}>
                    <i className="bi bi-arrow-left-short fs-5"></i>
                    <span>Back to Entry</span>
                  </Button>
                </div>
              )}

              {/* Wizard Step 3: Selected Existing Domain Path */}
              {wizardStep === "select_existing" && (
                <Form onSubmit={handleExistingDomainSubmit}>
                  <div className="text-center mb-4">
                    <h5 className="fw-bold mb-1" style={{ color: 'var(--text-color, #1a1a1a)' }}>Attach to Registered Root</h5>
                    <p className="text-muted small mb-0">Construct subdomain map within your existing perimeter.</p>
                  </div>

                  {/* Real-time constructed path preview banner */}
                  <div className="p-3 mb-3 border rounded-3 text-center" style={{ background: 'var(--input-bg, #f8f9fa)', borderColor: 'var(--border-color, rgba(0, 0, 0, 0.08))' }}>
                    <span className="small text-muted d-block mb-1">CONSTRUCTED TARGET PATH PREVIEW</span>
                    <code className="text-primary fw-bold fs-6 font-monospace" style={{ wordBreak: 'break-all' }}>
                      {(() => {
                        let prefix = specificPrefix.trim().toLowerCase();
                        if (selectedExistingDomain) {
                          if (prefix.endsWith("." + selectedExistingDomain)) {
                            prefix = prefix.slice(0, -(selectedExistingDomain.length + 1));
                          } else if (prefix === selectedExistingDomain) {
                            prefix = "";
                          }
                        }
                        return sanitizeSubdomainStr(prefix ? `${prefix}.${selectedExistingDomain || 'root-domain'}` : (selectedExistingDomain || 'root-domain'));
                      })()}
                    </code>
                  </div>
                  
                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted fw-semibold font-monospace">SELECT REGISTERED DOMAIN</Form.Label>
                    <Form.Select 
                      value={selectedExistingDomain}
                      onChange={(e) => setSelectedExistingDomain(e.target.value)}
                      required
                      className="fs-6"
                      style={{ height: '46px', borderRadius: '10px', border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))' }}
                    >
                      <option value="">-- Choose registered parent --</option>
                      {uniqueDomains.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="small text-muted fw-semibold font-monospace">SUBDOMAIN PREFIX</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="e.g. portal" 
                      value={specificPrefix}
                      onChange={(e) => setSpecificPrefix(e.target.value)}
                      className="fs-6"
                      style={{ height: '46px', borderRadius: '10px', border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))' }}
                    />
                    <Form.Text className="text-muted small mt-2 d-block">
                      Leave blank to scan the root domain itself.
                    </Form.Text>
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button variant="outline-secondary" className="w-50 py-2 fw-semibold" onClick={() => setWizardStep("ask_domain_type")} style={{ borderRadius: '12px' }}>
                      Back
                    </Button>
                    <Button type="submit" variant="primary" className="w-50 py-2 fw-semibold d-flex align-items-center justify-content-center gap-1" disabled={!selectedExistingDomain} style={{ borderRadius: '12px' }}>
                      <i className="bi bi-activity"></i>
                      <span>Trigger Scan</span>
                    </Button>
                  </div>
                </Form>
              )}

              {/* Wizard Step 4: Choose New Domain Path */}
              {wizardStep === "enter_new" && (
                <Form onSubmit={handleNewDomainSubmit}>
                  <div className="text-center mb-4">
                    <h5 className="fw-bold mb-1" style={{ color: 'var(--text-color, #1a1a1a)' }}>Index New Parent Node</h5>
                    <p className="text-muted small mb-0">Register a new root asset node in your cyber map ledger.</p>
                  </div>

                  {/* Real-time constructed path preview banner */}
                  <div className="p-3 mb-3 border rounded-3 text-center" style={{ background: 'var(--input-bg, #f8f9fa)', borderColor: 'var(--border-color, rgba(0, 0, 0, 0.08))' }}>
                    <span className="small text-muted d-block mb-1">CONSTRUCTED TARGET PATH PREVIEW</span>
                    <code className="text-primary fw-bold fs-6 font-monospace" style={{ wordBreak: 'break-all' }}>
                      {(() => {
                        let prefix = specificPrefix.trim().toLowerCase();
                        let root = newRootDomain.trim().toLowerCase();
                        root = root.replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
                        if (root) {
                          if (prefix.endsWith("." + root)) {
                            prefix = prefix.slice(0, -(root.length + 1));
                          } else if (prefix === root) {
                            prefix = "";
                          }
                        }
                        return sanitizeSubdomainStr(prefix ? `${prefix}.${root || 'new-root-domain'}` : (root || 'new-root-domain'));
                      })()}
                    </code>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted fw-semibold font-monospace">NEW ROOT DOMAIN NAME</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="e.g. example.com" 
                      value={newRootDomain}
                      onChange={(e) => setNewRootDomain(e.target.value)}
                      required
                      className="fs-6"
                      style={{ height: '46px', borderRadius: '10px', border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))' }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="small text-muted fw-semibold font-monospace">SUBDOMAIN PREFIX</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="e.g. portal" 
                      value={specificPrefix}
                      onChange={(e) => setSpecificPrefix(e.target.value)}
                      className="fs-6"
                      style={{ height: '46px', borderRadius: '10px', border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))' }}
                    />
                    <Form.Text className="text-muted small mt-2 d-block">
                      Leave blank to scan the root domain itself.
                    </Form.Text>
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button variant="outline-secondary" className="w-50 py-2 fw-semibold" onClick={() => setWizardStep("ask_domain_type")} style={{ borderRadius: '12px' }}>
                      Back
                    </Button>
                    <Button type="submit" variant="primary" className="w-50 py-2 fw-semibold d-flex align-items-center justify-content-center gap-1" disabled={!newRootDomain.trim()} style={{ borderRadius: '12px' }}>
                      <i className="bi bi-activity"></i>
                      <span>Trigger Scan</span>
                    </Button>
                  </div>
                </Form>
              )}
        </Modal.Body>
      </Modal>

      {/* GENERATE REPORT MODAL */}
      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} centered className="cyber-modal">
        <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))' }}>
          <Modal.Title className="fw-bold font-monospace text-uppercase" style={{ fontSize: '1.05rem', letterSpacing: '0.5px' }}>
            <span>Executive Security Report</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center" style={{ backgroundColor: 'var(--body-bg, #fcfcfc)' }}>
          <div>
            <FiDownload size={45} className="text-info mb-3" />
            <h5 className="fw-bold" style={{ color: 'var(--text-color, #1a1a1a)' }}>Download Comprehensive Audit Report</h5>
            <p className="text-muted small mb-4">
              Generate and download a PDF report listing all discovered vulnerabilities, open ports, subdomains, and certificates from your scans.
            </p>
            <Button 
              variant="info" 
              className="text-white w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2" 
              onClick={() => { handleDownloadPDF(true); setShowReportModal(false); }}
              style={{ 
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
              }}
            >
              <FiDownload size={16} />
              <span>Download PDF Now</span>
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* RUN SECURITY CHECK MODAL */}
      <Modal show={showCheckModal} onHide={() => setShowCheckModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-semibold">Run Scan to Check</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center">
          <FiShield size={45} className="text-success mb-3" />
          <h5>Perform a Security Scan</h5>
          <p className="text-muted small">Enter a domain in the Domain Scan Control section above and click Quick Scan to run a full security assessment with all available tools.</p>
          <Button variant="success" className="w-100 mt-2" onClick={() => { setShowCheckModal(false); }} style={{ borderRadius: '10px' }}>
            Got it
          </Button>
        </Modal.Body>
      </Modal>

      {/* SUBSCRIPTION PLANS MODAL */}
      <Modal show={showSubscriptionModal} onHide={() => setShowSubscriptionModal(false)} size="lg" centered className="cyber-modal">
        <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))' }}>
          <Modal.Title className="fw-bold font-monospace text-uppercase" style={{ fontSize: '1.05rem', letterSpacing: '0.5px' }}>
            <span>Sentinel Subscription Plans</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ backgroundColor: 'var(--body-bg, #fcfcfc)' }}>
          <div className="text-center mb-4">
            <h4 className="fw-bold mb-1" style={{ color: 'var(--text-color, #1a1a1a)' }}>Unlock Unlimited Scanning Capabilities</h4>
            <p className="text-muted small">You have reached the maximum limit of **1 domain** on the Free Tier. Choose a premium plan to monitor more assets.</p>
          </div>
          
          <Row className="g-4 justify-content-center">
            {/* Free Plan Card */}
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm" style={{
                borderRadius: '16px',
                background: 'var(--header-bg)',
                border: userPlan === 'Free' ? '2px solid #64748b' : '1px solid var(--header-border)',
                transition: 'all 0.3s ease'
              }}>
                <Card.Body className="d-flex flex-column p-4">
                  <div className="mb-3">
                    <Badge bg="secondary" className="mb-2">Free Tier</Badge>
                    <h3 className="fw-bold mb-0 text-dark">$0<span className="fs-6 text-muted font-normal" style={{ fontWeight: 'normal', fontSize: '0.85rem' }}>/mo</span></h3>
                    <p className="small text-muted mt-1">Basic passive security mapping</p>
                  </div>
                  <hr style={{ opacity: 0.1 }} />
                  <ul className="list-unstyled flex-grow-1 mb-4" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2"></i>Monitor 1 Domain</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2"></i>Passive Subdomains</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2"></i>Weekly Updates</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2"></i>Standard Alerts</li>
                  </ul>
                  <Button
                    variant="outline-secondary"
                    className="w-100 py-2.5 fw-semibold"
                    disabled={userPlan === 'Free'}
                    onClick={() => {
                      setUserPlan('Free');
                      localStorage.setItem('userPlan', 'Free');
                      window.dispatchEvent(new Event('userLogin')); // Refresh header plan badge
                      setShowSubscriptionModal(false);
                      setActivities(prev => ['Downgraded to Free Tier plan', ...prev]);
                    }}
                    style={{ borderRadius: '12px' }}
                  >
                    {userPlan === 'Free' ? 'Current Plan' : 'Select Free'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Pro Plan Card */}
            <Col md={4}>
              <Card className="h-100 border-0 shadow-lg position-relative" style={{
                borderRadius: '16px',
                background: 'var(--header-bg)',
                border: userPlan === 'Pro' ? '2px solid var(--accent-blue)' : '2px solid rgba(59, 130, 246, 0.4)',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
                transition: 'all 0.3s ease'
              }}>
                <div className="position-absolute px-3 py-1 bg-primary text-white rounded-pill small fw-semibold" style={{
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '0.72rem',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  zIndex: 10
                }}>
                  Best Value
                </div>
                <Card.Body className="d-flex flex-column p-4">
                  <div className="mb-3">
                    <Badge bg="primary" className="mb-2">Pro Tier</Badge>
                    <h3 className="fw-bold mb-0 text-primary">$49<span className="fs-6 text-muted font-normal" style={{ fontWeight: 'normal', fontSize: '0.85rem' }}>/mo</span></h3>
                    <p className="small text-muted mt-1">Advanced scan control & reports</p>
                  </div>
                  <hr style={{ opacity: 0.1 }} />
                  <ul className="list-unstyled flex-grow-1 mb-4" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <li className="mb-2"><i className="bi bi-check2 text-primary me-2"></i>Monitor 10 Domains</li>
                    <li className="mb-2"><i className="bi bi-check2 text-primary me-2"></i>Active Port Scans</li>
                    <li className="mb-2"><i className="bi bi-check2 text-primary me-2"></i>Daily Scans</li>
                    <li className="mb-2"><i className="bi bi-check2 text-primary me-2"></i>PDF Intel Reports</li>
                    <li className="mb-2"><i className="bi bi-check2 text-primary me-2"></i>Slack / Alert Sync</li>
                  </ul>
                  <Button
                    variant="primary"
                    className="w-100 py-2.5 fw-semibold text-white shadow-sm"
                    disabled={userPlan === 'Pro'}
                    onClick={() => {
                      setUserPlan('Pro');
                      localStorage.setItem('userPlan', 'Pro');
                      window.dispatchEvent(new Event('userLogin')); // Refresh header plan badge
                      setShowSubscriptionModal(false);
                      setActivities(prev => ['Successfully upgraded to Pro Plan!', ...prev]);
                      alert('Upgrade successful! You are now subscribed to the Pro Plan. You can now monitor up to 10 domains.');
                    }}
                    style={{
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    }}
                  >
                    {userPlan === 'Pro' ? 'Current Plan' : 'Upgrade to Pro'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Enterprise Plan Card */}
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm" style={{
                borderRadius: '16px',
                background: 'var(--header-bg)',
                border: userPlan === 'Enterprise' ? '2px solid #8b5cf6' : '1px solid var(--header-border)',
                transition: 'all 0.3s ease'
              }}>
                <Card.Body className="d-flex flex-column p-4">
                  <div className="mb-3">
                    <Badge bg="info" className="mb-2" style={{ backgroundColor: '#8b5cf6' }}>Enterprise</Badge>
                    <h3 className="fw-bold mb-0 text-dark" style={{ color: '#8b5cf6' }}>$199<span className="fs-6 text-muted font-normal" style={{ fontWeight: 'normal', fontSize: '0.85rem' }}>/mo</span></h3>
                    <p className="small text-muted mt-1">Continuous security coverage</p>
                  </div>
                  <hr style={{ opacity: 0.1 }} />
                  <ul className="list-unstyled flex-grow-1 mb-4" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2" style={{ color: '#8b5cf6' }}></i>Unlimited Domains</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2" style={{ color: '#8b5cf6' }}></i>24/7 Continuous Scanning</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2" style={{ color: '#8b5cf6' }}></i>Shodan & Censys Sync</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2" style={{ color: '#8b5cf6' }}></i>Nuclei Custom templates</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2" style={{ color: '#8b5cf6' }}></i>Dedicated Support</li>
                  </ul>
                  <Button
                    variant="outline-secondary"
                    className="w-100 py-2.5 fw-semibold"
                    disabled={userPlan === 'Enterprise'}
                    onClick={() => {
                      setUserPlan('Enterprise');
                      localStorage.setItem('userPlan', 'Enterprise');
                      window.dispatchEvent(new Event('userLogin')); // Refresh header plan badge
                      setShowSubscriptionModal(false);
                      setActivities(prev => ['Successfully upgraded to Enterprise Plan!', ...prev]);
                      alert('Upgrade successful! You are now subscribed to the Enterprise Plan. You can now monitor unlimited domains.');
                    }}
                    style={{
                      borderRadius: '12px',
                      borderColor: '#8b5cf6',
                      color: '#8b5cf6'
                    }}
                  >
                    {userPlan === 'Enterprise' ? 'Current Plan' : 'Go Enterprise'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>

      {/* Reusable Small Notification Modal */}
      <Modal show={notification.show} onHide={() => setNotification({ ...notification, show: false })} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-semibold">{notification.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3 text-center">
          <p className="mb-0 text-muted small">{notification.message}</p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 d-flex justify-content-center">
          <Button variant="primary" size="sm" onClick={() => setNotification({ ...notification, show: false })} className="px-4" style={{ borderRadius: '8px' }}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DashboardPage;
=======
import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Table, Badge, Modal, Button, Form, Spinner } from "react-bootstrap";
import { FiShield, FiBell, FiDownload, FiAlertOctagon, FiAlertTriangle, FiAlertCircle, FiMonitor, FiLock } from "react-icons/fi";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import * as jsPDFModule from "jspdf";
import { sanitizeSubdomainStr, getRootDomain, combineSubdomainAndRoot } from "../utils/domainSanitizer";
import { addMonitoredDomain, fetchAllPages, fetchMonitoredDomains } from "../utils/api";
import { useScan } from "../context/ScanContext";

const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default?.jsPDF || jsPDFModule.default || jsPDFModule;

const DashboardPage = () => {
  // Helper to get the current user's org_id from localStorage
  const getOrgId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user?.organization_id || "1";
    } catch {
      return "1";
    }
  };

  const navigate = useNavigate();
  const { startScan: contextStartScan, scanState, refreshKey } = useScan();

  // Modal states
  const [showScanModal, setShowScanModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [userPlan, setUserPlan] = useState(localStorage.getItem("userPlan") || "Free");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Smart scan wizard states
  const [wizardStep, setWizardStep] = useState("input_subdomain");
  const [inputSubdomainName, setInputSubdomainName] = useState("");
  const [selectedExistingDomain, setSelectedExistingDomain] = useState("");
  const [newRootDomain, setNewRootDomain] = useState("");
  const [specificPrefix, setSpecificPrefix] = useState("");

  // Render exact timestamp as a two-line block to avoid horizontal collision
  const renderExactTimestamp = (dateString) => {
    if (!dateString) return <span className="text-muted">-</span>;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return <span className="text-muted">-</span>;
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      return (
        <div className="d-flex flex-column align-items-start" style={{ lineHeight: '1.2' }}>
          <span style={{ color: 'var(--text-primary, #1a1a1a)', fontWeight: 500, fontSize: '0.82rem' }}>{dateStr}</span>
          <span style={{ color: 'var(--text-secondary, #4a5568)', opacity: 0.8, fontSize: '0.72rem' }}>{timeStr}</span>
        </div>
      );
    } catch (error) {
      return <span className="text-muted">-</span>;
    }
  };

  const [reportReady, setReportReady] = useState(false);
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'info', onConfirm: null });

  // Dashboard stats and listings
  const [subdomains, setSubdomains] = useState([]);
  const [uniqueDomains, setUniqueDomains] = useState([]);
  const [expandedDomain, setExpandedDomain] = useState(null);

  const sortedSubdomains = React.useMemo(() => {
    // Group and sort subdomains alphabetically right after their root (Apex) domains
    const groups = {};
    subdomains.forEach(item => {
      const root = getRootDomain(item.domain).toLowerCase() || "unknown";
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
      const apexItems = items.filter(item => getRootDomain(item.domain).toLowerCase() === item.domain.toLowerCase());
      const subItems = items.filter(item => getRootDomain(item.domain).toLowerCase() !== item.domain.toLowerCase());

      // Sort subdomains alphabetically by domain name
      subItems.sort((a, b) => a.domain.localeCompare(b.domain));

      // Add apex items first, then subdomains
      result.push(...apexItems);
      result.push(...subItems);
    });

    return result;
  }, [subdomains]);
  const [stats, setStats] = useState([]);
  const [vulns, setVulns] = useState([]);
  const [activities, setActivities] = useState([]);

  // Tab State for Asset & Environment Explorer
  const [explorerTab, setExplorerTab] = useState("web_entities");

  
  // Per-domain schedule state: { domain: { morning_time, night_time, saving } }
  const [domainSchedules, setDomainSchedules] = useState({});
  const [domainSavingMap, setDomainSavingMap] = useState({});
  const [monitoredDomains, setMonitoredDomains] = useState([]);

  // States for extra explorer tabs
  const [buckets, setBuckets] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [software, setSoftware] = useState([]);
  const [hostsByCountry, setHostsByCountry] = useState([]);
  const [discoverySources, setDiscoverySources] = useState([]);
  const [trends, setTrends] = useState([]);
  const [webEntities, setWebEntities] = useState([]);

  const [assignedDomains, setAssignedDomains] = useState([]);
  const [accessibleFeatures, setAccessibleFeatures] = useState([]);

  const [portCount, setPortCount] = useState(0);

  // Dashboard severity counts
  const [vulnerabilityCounts, setVulnerabilityCounts] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  });

  // Pending module states
  const [emailSecurityResults, setEmailSecurityResults] = useState([]);

  // Track the domain the user most recently scanned (loaded from localStorage on mount)
  const [scannedDomain, setScannedDomain] = useState(() => {
    try { return localStorage.getItem("lastScannedDomain") || ""; } catch { return ""; }
  });

  const loadData = useCallback(async (scanId = null, domain = null) => {
    try {
      if (domain) {
        setScannedDomain(domain);
        try { localStorage.setItem("lastScannedDomain", domain); } catch {}
      }
      const [subList, vulnList, endpointsList, portList, techList, sslList, domainList, emailList] = await Promise.all([
        fetchAllPages('subdomains', scanId).catch(() => []),
        fetchAllPages('vulnerabilities', scanId).catch(() => []),
        fetchAllPages('endpoints', scanId).catch(() => []),
        fetchAllPages('open-ports', scanId).catch(() => []),
        fetchAllPages('technologies', scanId).catch(() => []),
        fetchAllPages('ssl-certificates', scanId).catch(() => []),
        fetchMonitoredDomains().catch(() => []),
        fetchAllPages('email-security', scanId).catch(() => []),
      ]);

      // Deduplicate subdomains by domain name
      const seenSub = new Set();
      const uniqueSubsList = [];
      subList.forEach(item => {
        const key = (item.domain || '').toLowerCase().trim();
        if (key && !seenSub.has(key)) {
          seenSub.add(key);
          uniqueSubsList.push(item);
        }
      });

      const safeSubs = uniqueSubsList.map(s => ({
        ...s,
        dns_records: s.dns_records || [],
        vulnerabilities_count: s.vulnerabilities_count || 0,
        technologies: s.technologies || [],
        ip: s.ip || [],
        ports: s.ports || [],
      }));
      setSubdomains(safeSubs);

      const domainsSet = new Set();
      safeSubs.forEach(s => {
        const root = getRootDomain(s.domain);
        if (root) domainsSet.add(root);
      });
      setUniqueDomains(Array.from(domainsSet));

      // Deduplicate vulnerabilities by title + severity
      const seenVuln = new Set();
      const uniqueVulnList = [];
      vulnList.forEach(item => {
        const key = `${item.finding || item.title || ''}|${item.severity || ''}`;
        if (!seenVuln.has(key)) {
          seenVuln.add(key);
          uniqueVulnList.push(item);
        }
      });

      const displayVulns = uniqueVulnList.map(v => ({
        id: v.id,
        title: v.finding || v.title || "Vulnerability",
        severity: (v.severity || "Low").charAt(0).toUpperCase() + (v.severity || "low").slice(1).toLowerCase(),
        status: "Open",
        time: v.discovered_at ? new Date(v.discovered_at).toLocaleString() : new Date().toLocaleString()
      }));
      setVulns(displayVulns);

      const crit = uniqueVulnList.filter(v => v.severity?.toUpperCase() === "CRITICAL").length;
      const high = uniqueVulnList.filter(v => v.severity?.toUpperCase() === "HIGH").length;
      const med = uniqueVulnList.filter(v => v.severity?.toUpperCase() === "MEDIUM").length;
      const low = uniqueVulnList.filter(v => v.severity?.toUpperCase() === "LOW").length;

      setStats([
        { title: "Critical Issues", count: crit || 0, color: "danger" },
        { title: "High Severity", count: high || 0, color: "warning" },
        { title: "Medium Severity", count: med || 0, color: "info" },
        { title: "Subdomains Scanned", count: safeSubs.length, color: "primary" },
      ]);

      setVulnerabilityCounts({ critical: crit, high, medium: med, low });

      // Deduplicate endpoints by http_url
      const seenEndpoint = new Set();
      const uniqueEndpointsList = [];
      endpointsList.forEach(item => {
        const key = (item.http_url || '').toLowerCase().trim();
        if (key && !seenEndpoint.has(key)) {
          seenEndpoint.add(key);
          uniqueEndpointsList.push(item);
        }
      });
      setWebEntities(uniqueEndpointsList);

      // Deduplicate certificates by domain + subdomain + ip + ssl_grade + issuer_name
      const seenCert = new Set();
      const uniqueCertList = [];
      sslList.forEach(item => {
        const key = `${item.domain || ''}|${item.subdomain || ''}|${item.ip || ''}|${item.ssl_grade || ''}|${item.issuer_name || ''}`;
        if (!seenCert.has(key)) {
          seenCert.add(key);
          uniqueCertList.push(item);
        }
      });
      setCertificates(uniqueCertList);

      // Deduplicate ports by domain
      const seenPort = new Set();
      const uniquePortList = [];
      portList.forEach(item => {
        const key = (item.domain || '').toLowerCase().trim();
        if (key && !seenPort.has(key)) {
          seenPort.add(key);
          uniquePortList.push(item);
        }
      });
      setPortCount(uniquePortList.length);
      
      setEmailSecurityResults(emailList);
      if (domainList && domainList.length > 0) {
        setMonitoredDomains(domainList);
      } else {
        setMonitoredDomains([]);
      }

      setActivities(prev => ["Dashboard loaded with live scan data.", ...prev.slice(0, 4)]);
    } catch (err) {
      setActivities(prev => ["Dashboard loaded (some data may be unavailable).", ...prev.slice(0, 4)]);
    }
  }, []);

  // Load assigned domains and features from localStorage user data
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.assigned_domains && user.assigned_domains.length > 0) {
        setAssignedDomains(user.assigned_domains);
      }
      if (user.features && user.features.length > 0) {
        setAccessibleFeatures(user.features);
      }
    } catch {}

    const handleLogin = () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setAssignedDomains(user.assigned_domains || []);
        setAccessibleFeatures(user.features || []);
      } catch {}
    };
    window.addEventListener('userLogin', handleLogin);
    return () => window.removeEventListener('userLogin', handleLogin);
  }, []);

  useEffect(() => {
    const handleShowSub = () => setShowSubscriptionModal(true);
    window.addEventListener('showSubscription', handleShowSub);

    return () => window.removeEventListener('showSubscription', handleShowSub);
  }, []);

  useEffect(() => {
    if (scanState.isScanning && scanState.progress === 0) {
      setSubdomains([]);
      setUniqueDomains([]);
      setVulns([]);
      setWebEntities([]);
      setCertificates([]);
      setPortCount(0);
      setVulnerabilityCounts({ critical: 0, high: 0, medium: 0, low: 0 });
      setStats([]);
    }
  }, [scanState.isScanning, scanState.progress]);

  const prevPhasesRef = React.useRef({});
  useEffect(() => {
    const phases = scanState.phasesDone || {};
    const changed = Object.keys(phases).some(k => phases[k] && !prevPhasesRef.current[k]);
    if (changed) {
      prevPhasesRef.current = { ...phases };
      loadData(scanState.scanId, scanState.target);
    }
  }, [scanState.phasesDone, loadData, scanState.scanId]);

  useEffect(() => {
    // Only load dashboard data if there's an existing scan in this active session (keeps values when navigating)
    const storedScanId = localStorage.getItem("activeScanId");
    const storedDomain = localStorage.getItem("lastScannedDomain");
    if (storedScanId) {
      if (storedDomain) setScannedDomain(storedDomain);
      loadData(storedScanId, storedDomain);
    }

    const loadMonitored = async () => {
      try {
        const domainList = await fetchMonitoredDomains();
        if (domainList && domainList.length > 0) {
          setMonitoredDomains(domainList);
          
          const currentScanId = localStorage.getItem("activeScanId");
          const currentDomain = localStorage.getItem("lastScannedDomain");
          
          // Verify if currentScanId belongs to the current user's organization domains
          const matchedDomainObj = domainList.find(d => d.latest_scan_id && String(d.latest_scan_id) === String(currentScanId));
          
          if (!currentScanId || !matchedDomainObj) {
            // Mismatch or empty! Let's choose the latest scan for the last scanned domain, or first domain with a scan.
            let activeObj = domainList.find(d => d.domain === currentDomain && d.latest_scan_id);
            if (!activeObj) {
              activeObj = domainList.find(d => d.latest_scan_id);
            }
            
            if (activeObj) {
              try {
                localStorage.setItem("activeScanId", String(activeObj.latest_scan_id));
                localStorage.setItem("lastScannedDomain", activeObj.domain);
              } catch {}
              setScannedDomain(activeObj.domain);
              loadData(activeObj.latest_scan_id, activeObj.domain);
            }
          }
        } else {
          setMonitoredDomains([]);
        }
      } catch {
        setMonitoredDomains([]);
      }
    };
    loadMonitored();
  }, [loadData, refreshKey]);

  // Reset report generator states when modal opens/closes
  useEffect(() => {
    if (!showReportModal) {
      setReportReady(false);
    }
  }, [showReportModal]);

  const badgeVariant = (sev) => {
    switch (sev) {
      case "Critical": return "danger";
      case "High": return "warning";
      case "Medium": return "info";
      default: return "secondary";
    }
  };


  // Smart Subdomain wizard submit handler
  const handleWizardSubmit = (e) => {
    e.preventDefault();

    if (wizardStep === "input_subdomain") {
      let rawVal = inputSubdomainName.trim().toLowerCase();
      rawVal = rawVal.replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
      rawVal = sanitizeSubdomainStr(rawVal);
      
      if (!rawVal) return;

      setInputSubdomainName(rawVal);
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
  };

  const handleExistingDomainSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExistingDomain) return;
    const targetSub = sanitizeSubdomainStr(combineSubdomainAndRoot(specificPrefix, selectedExistingDomain));
    setShowScanModal(false);
    try {
      await contextStartScan(targetSub);
    } catch {
      setActivities(prev => [`Scan failed for ${targetSub}.`, ...prev.slice(0, 9)]);
    }
  };

  const handleNewDomainSubmit = async (e) => {
    e.preventDefault();
    let root = newRootDomain.trim().toLowerCase();
    root = root.replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
    if (!root) return;
    const targetSub = sanitizeSubdomainStr(combineSubdomainAndRoot(specificPrefix, root));
    // Check plan restriction: Free tier is limited to 1 monitored domain
    if (userPlan === "Free" && monitoredDomains.length >= 1) {
      setShowSubscriptionModal(true);
      setShowScanModal(false);
      return;
    }
    setShowScanModal(false);
    try {
      await contextStartScan(targetSub);
    } catch {
      setActivities(prev => [`Scan failed for ${targetSub}.`, ...prev.slice(0, 9)]);
    }
  };

  // Synchronous PDF Compilation and Instant Save on direct user trigger
  const handleDownloadPDF = (isAutoDownload = false) => {
    try {
      // Initialize jsPDF document (A4 portrait)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      const margin = 40;
      let y = 120;

      // 1. Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 595.28, 90, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("SENTINEL SECURITY", margin, 45);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("EXECUTIVE AUDIT & VULNERABILITY REPORT", margin, 65);
      
      // Date/Info on Right
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 595.28 - margin - 180, 45);
      doc.text("Format: Comprehensive Executive PDF", 595.28 - margin - 180, 60);

      // Section 1: Executive Summary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("1. Executive Summary", margin, y);
      y += 15;
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(1);
      doc.line(margin, y, 595.28 - margin, y);
      y += 20;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("This report compiles a comprehensive snapshot of security vulnerabilities discovered during automated passive and active discovery scans. It outlines exposed endpoints, technologies, and system vulnerability logs ranked by standard CVSS severity levels.", margin, y, { maxWidth: 515 });
      y += 45;

      // Render Executive Stats Cards
      const boxWidth = 117;
      const boxHeight = 50;
      const boxGap = 15;
      let boxX = margin;
      
      stats.forEach((stat) => {
        let r = 241, g = 245, b = 249; // default slate-100
        let textR = 71, textG = 85, textB = 105;
        
        if (stat.color === 'danger') {
          r = 254; g = 242; b = 242; // red-50
          textR = 220; textG = 38; textB = 38; // red-600
        } else if (stat.color === 'warning') {
          r = 255; g = 251; b = 235; // amber-50
          textR = 217; textG = 119; textB = 6; // amber-600
        } else if (stat.color === 'info') {
          r = 240; g = 253; b = 250; // teal-50
          textR = 13; textG = 148; textB = 136; // teal-600
        } else if (stat.color === 'primary') {
          r = 239; g = 246; b = 255; // blue-50
          textR = 37; textG = 99; textB = 235; // blue-600
        }
        
        doc.setFillColor(r, g, b);
        doc.rect(boxX, y, boxWidth, boxHeight, 'F');
        
        doc.setFillColor(textR, textG, textB);
        doc.rect(boxX, y, 4, boxHeight, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(stat.title.toUpperCase(), boxX + 10, y + 18);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(textR, textG, textB);
        doc.text(String(stat.count), boxX + 10, y + 38);
        
        boxX += boxWidth + boxGap;
      });
      
      y += boxHeight + 35;

      // Section 2: Logged Vulnerabilities
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("2. Logged Vulnerabilities", margin, y);
      y += 15;
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(1);
      doc.line(margin, y, 595.28 - margin, y);
      y += 20;

      // Table Header
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(margin, y, 515, 25, 'F');
      
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, 595.28 - margin, y);
      doc.line(margin, y + 25, 595.28 - margin, y + 25);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // slate-600
      
      doc.text("SEVERITY", margin + 10, y + 16);
      doc.text("FINDING / VULNERABILITY TITLE", margin + 90, y + 16);
      doc.text("STATUS", margin + 370, y + 16);
      doc.text("DISCOVERED", margin + 430, y + 16);
      
      y += 25;

      // Table Rows
      vulns.forEach((v) => {
        if (!v) return;
        const severityStr = String(v.severity || 'LOW').toUpperCase();
        const statusStr = String(v.status || 'Open');
        const titleStr = String(v.title || v.finding || '');
        const timeStr = String(v.time || v.discovered_at || '');

        if (y > 740) {
          doc.addPage();
          y = 50;
          
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, 515, 25, 'F');
          
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y, 595.28 - margin, y);
          doc.line(margin, y + 25, 595.28 - margin, y + 25);
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          
          doc.text("SEVERITY", margin + 10, y + 16);
          doc.text("FINDING / VULNERABILITY TITLE", margin + 90, y + 16);
          doc.text("STATUS", margin + 370, y + 16);
          doc.text("DISCOVERED", margin + 430, y + 16);
          
          y += 25;
        }

        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y, 515, 30, 'F');
        
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 30, 595.28 - margin, y + 30);
        
        let badgeR = 100, badgeG = 116, badgeB = 139;
        if (severityStr === 'CRITICAL') {
          badgeR = 220; badgeG = 38; badgeB = 38;
        } else if (severityStr === 'HIGH') {
          badgeR = 217; badgeG = 119; badgeB = 6;
        } else if (severityStr === 'MEDIUM') {
          badgeR = 13; badgeG = 148; badgeB = 136;
        } else if (severityStr === 'LOW') {
          badgeR = 37; badgeG = 99; badgeB = 235;
        }
        
        doc.setFillColor(badgeR, badgeG, badgeB);
        doc.rect(margin + 10, y + 8, 60, 14, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(severityStr, margin + 40, y + 17, { align: 'center' });
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        let displayTitle = titleStr;
        if (displayTitle.length > 55) {
          displayTitle = displayTitle.slice(0, 52) + "...";
        }
        doc.text(displayTitle, margin + 90, y + 18);
        
        let statusColor = [220, 38, 38];
        if (statusStr.toLowerCase() !== 'open') {
          statusColor = [22, 163, 74];
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(statusStr, margin + 370, y + 18);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(timeStr, margin + 430, y + 18);
        
        y += 30;
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, 800, 595.28 - margin, 800);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Sentinel Security Discovery Platform", margin, 815);
        doc.text(`Page ${i} of ${pageCount}`, 595.28 - margin, 815, { align: 'right' });
      }

      doc.save(`Sentinel_Security_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      setActivities(prev => [`Comprehensive security report generated in PDF format and downloaded`, ...prev]);
      if (!isAutoDownload) {
        setShowReportModal(false);
      }
    } catch (pdfErr) {
      console.error("Error generating PDF:", pdfErr);
      alert("Error generating PDF: " + pdfErr.message);
    }
  };

  // Quick Action 3: Global System Security Check
  return (
    <div className="d-flex" style={{ minHeight: 'calc(100vh - 70px)' }}>
      <Sidebar />
      <div style={{ marginLeft: '280px', width: 'calc(100% - 280px)', padding: '24px 32px' }}>
        <h3 className="mb-4 fw-bold" style={{ color: 'var(--text-color)' }}>Dashboard Overview</h3>

        {/* Assigned Domains & Features Banner */}
        {(assignedDomains.length > 0 || accessibleFeatures.length > 0) && (
          <Card className="border-0 mb-4" style={{
            background: 'var(--header-bg)',
            border: '1px solid var(--header-border)',
            borderRadius: '12px',
          }}>
            <Card.Body className="py-3 px-4">
              <div className="d-flex flex-wrap align-items-center gap-4">
                {assignedDomains.length > 0 && (
                  <div className="d-flex align-items-center gap-2">
                    <FiMonitor size={16} className="text-primary" />
                    <span className="small text-muted fw-semibold me-1">Your Domains:</span>
                    {assignedDomains.map(d => (
                      <Badge key={d} bg="primary" pill className="px-3 py-1.5" style={{ fontSize: '0.78rem' }}>
                        {d}
                      </Badge>
                    ))}
                  </div>
                )}
                {accessibleFeatures.length > 0 && (
                  <div className="d-flex align-items-center gap-2">
                    <FiShield size={16} className="text-success" />
                    <span className="small text-muted fw-semibold me-1">Features:</span>
                    {accessibleFeatures.map(f => {
                      const labels = {'1':'Subdomains','2':'Endpoints','3':'Ports','4':'Dirs','5':'Tech','6':'Vulns','7':'SSL','8':'Email','9':'Scans'};
                      return (
                        <Badge key={f} bg="success" pill className="px-2" style={{ fontSize: '0.72rem' }}>
                          {labels[f] || f}
                        </Badge>
                      );
                    })}
                    {(() => {
                      const allIds = ['1','2','3','4','5','6','7','8','9'];
                      const locked = allIds.filter(k => !accessibleFeatures.includes(k));
                      if (locked.length > 0) return (
                        <span className="small text-muted" style={{ opacity: 0.6 }}>
                          <FiLock size={12} className="me-1" />
                          {locked.length} locked
                        </span>
                      );
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Metric Cards */}
        <Row className="mb-4 g-3">
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Subdomains</span>
              <h2 className="mb-0 fw-bold mt-2 text-primary">{subdomains.length}</h2>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Domains</span>
              <h2 className="mb-0 fw-bold mt-2 text-info">{uniqueDomains.length}</h2>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Web Entities</span>
              <h2 className="mb-0 fw-bold mt-2 text-success">{webEntities.length}</h2>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Certificates</span>
              <h2 className="mb-0 fw-bold mt-2 text-danger">{certificates.length}</h2>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Vulnerabilities</span>
              <h2 className="mb-0 fw-bold mt-2 text-warning">{vulns.length}</h2>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="border-0 text-center py-3" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '12px' }}>
              <span className="text-muted small fw-semibold text-uppercase">Open Ports</span>
              <h2 className="mb-0 fw-bold mt-2 text-secondary">{portCount}</h2>
            </Card>
          </Col>
        </Row>

        {/* Live Scan Progress Card */}
        {scanState.isScanning && (
          <Card className="border-0 mb-4 overflow-hidden" style={{
            background: 'var(--header-bg)',
            border: '1px solid var(--header-border)',
            borderRadius: '16px',
          }}>
            <Card.Body className="p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#4ade80', display: 'inline-block',
                    animation: 'pulse 1.5s infinite'
                  }} />
                  <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>
                    Live Scan: {scanState.target}
                  </h5>
                  <Badge bg="primary" pill className="ms-2">
                    {scanState.scanId && `#${scanState.scanId}`}
                  </Badge>
                </div>
                <span className="fw-bold font-monospace" style={{ color: '#3b82f6', fontSize: '1.1rem' }}>
                  {scanState.progress}%
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: 6, borderRadius: 3, background: '#1e293b',
                marginBottom: '16px', overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%', width: `${scanState.progress}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #4ade80)',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }} />
              </div>

              {/* Phase badges */}
              <div className="d-flex gap-2 flex-wrap mb-3">
                {[
                  { field: 'subdomains_done', label: 'Subdomains', color: '#4ade80' },
                  { field: 'endpoints_done', label: 'Endpoints', color: '#38bdf8' },
                  { field: 'ports_done', label: 'Ports', color: '#facc15' },
                  { field: 'technologies_done', label: 'Tech', color: '#a78bfa' },
                  { field: 'vulnerabilities_done', label: 'Vulns', color: '#f87171' },
                  { field: 'ssl_done', label: 'SSL', color: '#34d399' },
                  { field: 'email_done', label: 'Email', color: '#fb923c' },
                ].map(p => (
                  <span
                    key={p.field}
                    style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 11,
                      fontWeight: 600, fontFamily: 'monospace',
                      background: scanState.phasesDone[p.field] ? p.color : '#1e293b',
                      color: scanState.phasesDone[p.field] ? '#0f172a' : '#64748b',
                      transition: 'all 0.3s',
                    }}
                  >
                    {scanState.phasesDone[p.field] ? '✓ ' : '○ '}{p.label}
                  </span>
                ))}
              </div>

              {/* Recent logs */}
              <div style={{
                background: '#0f172a', borderRadius: 8,
                padding: '8px 12px', maxHeight: 100, overflowY: 'auto',
                fontFamily: "'Courier New', Courier, monospace", fontSize: 11,
              }}>
                {scanState.logs.slice(-3).map((log, i) => {
                  const colorMap = { sys: '#94a3b8', success: '#4ade80', warn: '#facc15', crit: '#f87171', info: '#38bdf8' };
                  return (
                    <div key={i} style={{ color: colorMap[log.type] || '#38bdf8', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      <span style={{ color: '#64748b' }}>[{log.time}]</span> {log.text}
                    </div>
                  );
                })}
                {scanState.logs.length === 0 && (
                  <div style={{ color: '#64748b' }}>Waiting for scan logs...</div>
                )}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Vulnerability Severity Overview Cards */}
        <Row className="mb-4 g-3">
          <Col md={3} sm={6}>
            <Card className="border-0 p-3 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderLeft: '5px solid #EF4444', borderRadius: '12px', transition: 'all 0.2s ease-in-out' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">Critical Vulnerabilities</span>
                  <h2 className="mb-0 fw-bold mt-2 text-danger">{vulnerabilityCounts.critical}</h2>
                </div>
                <div className="p-2.5 rounded bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                  <FiAlertOctagon size={22} className="cyber-glow-red" />
                </div>
              </div>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className="border-0 p-3 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderLeft: '5px solid #F59E0B', borderRadius: '12px', transition: 'all 0.2s ease-in-out' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">High Vulnerabilities</span>
                  <h2 className="mb-0 fw-bold mt-2 text-warning">{vulnerabilityCounts.high}</h2>
                </div>
                <div className="p-2.5 rounded bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                  <FiAlertTriangle size={22} className="cyber-glow-warning" />
                </div>
              </div>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className="border-0 p-3 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderLeft: '5px solid #3B82F6', borderRadius: '12px', transition: 'all 0.2s ease-in-out' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">Medium Vulnerabilities</span>
                  <h2 className="mb-0 fw-bold mt-2 text-primary">{vulnerabilityCounts.medium}</h2>
                </div>
                <div className="p-2.5 rounded bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                  <FiAlertCircle size={22} className="cyber-glow-info" />
                </div>
              </div>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className="border-0 p-3 hover-card" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderLeft: '5px solid #6B7280', borderRadius: '12px', transition: 'all 0.2s ease-in-out' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">Low Vulnerabilities</span>
                  <h2 className="mb-0 fw-bold mt-2 text-secondary">{vulnerabilityCounts.low}</h2>
                </div>
                <div className="p-2.5 rounded bg-secondary bg-opacity-10 text-secondary d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                  <FiShield size={22} className="cyber-glow-success" />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

<Card className="border-0 mb-4" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '16px' }}>
          <Card.Header className="bg-transparent pt-4 pb-2 border-bottom-0 d-flex align-items-center justify-content-between">
            <div>
              <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>Domain Scan Control</h5>
              {scannedDomain && (
                <span className="text-muted small">Showing results for: <strong className="text-primary">{scannedDomain}</strong></span>
              )}
            </div>
            <span className="text-muted small">Manage scan schedules and run quick scans on your admin-assigned domains.</span>
          </Card.Header>
          <Card.Body>
            {/* Assigned Domain Cards - Replace the free-form input */}
            {assignedDomains.length > 0 && (
              <div className="mb-4">
                <div className="text-muted small fw-semibold mb-3">YOUR ASSIGNED DOMAINS — Schedule scans or run a quick scan</div>
                <Row className="g-3">
                  {assignedDomains.map(dom => {
                    const existingMon = monitoredDomains.find(m => m.domain === dom);
                    const sched = domainSchedules[dom] || {};
                    const morningVal = existingMon?.morning_time?.slice(0, 5) || sched.morning_time || "09:00";
                    const nightVal = existingMon?.night_time?.slice(0, 5) || sched.night_time || "21:00";
                    const saving = domainSavingMap[dom] || false;
                    
                    const handleSchedule = async () => {
                      setDomainSavingMap(prev => ({ ...prev, [dom]: true }));
                      try {
                        await addMonitoredDomain({
                          domain: dom,
                          morning_time: morningVal,
                          night_time: nightVal,
                          morning_enabled: true,
                          night_enabled: true,
                          auto_scan_on_add: false,
                          scan_now: false,
                        });
                        setActivities(prev => [`Scheduled scans for ${dom}`, ...prev.slice(0, 9)]);
                        // Refresh monitored domains to see updated schedule
                        const updatedList = await fetchMonitoredDomains().catch(() => []);
                        if (updatedList.length > 0) setMonitoredDomains(updatedList);
                      } catch {
                        setActivities(prev => [`Failed to schedule ${dom}`, ...prev.slice(0, 9)]);
                      } finally {
                        setDomainSavingMap(prev => ({ ...prev, [dom]: false }));
                      }
                    };
                    
                    const handleQuickScanForDomain = async () => {
                      setDomainSavingMap(prev => ({ ...prev, [dom]: true }));
                      try {
                        await contextStartScan(dom);
                        setActivities(prev => [`Quick scan started for ${dom}`, ...prev.slice(0, 9)]);
                      } catch {
                        setActivities(prev => [`Quick scan failed for ${dom}`, ...prev.slice(0, 9)]);
                      } finally {
                        setDomainSavingMap(prev => ({ ...prev, [dom]: false }));
                      }
                    };
                    
                    return (
                      <Col md={6} lg={4} key={dom}>
                        <Card className="border-0 h-100" style={{
                          background: 'var(--header-bg)',
                          border: '1px solid var(--header-border)',
                          borderRadius: '14px',
                          transition: 'all 0.2s',
                        }}>
                          <Card.Body>
                            <div className="d-flex align-items-center gap-2 mb-3">
                              <FiMonitor size={18} className="text-primary" />
                              <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>{dom}</h6>
                              {existingMon && <Badge bg="success" pill style={{ fontSize: '0.65rem' }}>Scheduled</Badge>}
                            </div>
                            <div className="d-flex gap-2 mb-1">
                              <div className="flex-fill">
                                <Form.Label className="small text-muted fw-semibold" style={{ fontSize: '0.7rem' }}>Morning</Form.Label>
                                <Form.Control 
                                  type="time" 
                                  value={morningVal}
                                  onChange={(e) => {
                                    setDomainSchedules(prev => ({
                                      ...prev,
                                      [dom]: { ...(prev[dom] || {}), morning_time: e.target.value }
                                    }));
                                  }}
                                  style={{ borderRadius: '8px', height: '36px', fontSize: '0.82rem' }}
                                />
                              </div>
                              <div className="flex-fill">
                                <Form.Label className="small text-muted fw-semibold" style={{ fontSize: '0.7rem' }}>Night</Form.Label>
                                <Form.Control 
                                  type="time" 
                                  value={nightVal}
                                  onChange={(e) => {
                                    setDomainSchedules(prev => ({
                                      ...prev,
                                      [dom]: { ...(prev[dom] || {}), night_time: e.target.value }
                                    }));
                                  }}
                                  style={{ borderRadius: '8px', height: '36px', fontSize: '0.82rem' }}
                                />
                              </div>
                            </div>
                            <div className="d-flex gap-2 mt-3">
                              <Button 
                                size="sm" 
                                variant={existingMon ? 'outline-secondary' : 'outline-primary'}
                                className="flex-fill"
                                disabled={saving || scanState.isScanning}
                                onClick={handleSchedule}
                                style={{ borderRadius: '8px', fontSize: '0.78rem' }}
                              >
                                {saving ? <Spinner animation="border" size="sm" /> : (existingMon ? 'Update Schedule' : 'Set Schedule')}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="success"
                                className="flex-fill"
                                disabled={saving || scanState.isScanning}
                                onClick={handleQuickScanForDomain}
                                style={{ borderRadius: '8px', fontSize: '0.78rem' }}
                              >
                                Quick Scan
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            )}
            {assignedDomains.length === 0 && (
              <div className="mb-4 p-4 text-center text-muted" style={{ background: 'var(--bg-color)', borderRadius: '12px', border: '1px dashed var(--header-border)' }}>
                <FiMonitor size={24} className="mb-2 opacity-50" />
                <p className="small mb-0">No domains assigned yet. Contact your admin to get domains assigned to your account.</p>
              </div>
            )}

            {/* Monitored Domains Table */}
            <h6 className="fw-bold mb-3" style={{ color: 'var(--text-color)' }}>Monitored Domains</h6>
            <div className="table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border)', background: 'var(--bg-color)' }}>
              <Table hover className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th className="py-3 px-4 border-0">Domain</th>
                    <th className="py-3 px-4 border-0">Morning Scan</th>
                    <th className="py-3 px-4 border-0">Night Scan</th>
                    <th className="py-3 px-4 border-0">Last Morning</th>
                    <th className="py-3 px-4 border-0">Last Night</th>
                    <th className="py-3 px-4 border-0 text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoredDomains.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 fw-semibold" style={{ color: 'var(--text-color)' }}>{item.domain}</td>
                      <td className="px-4 py-3">
                        <Badge bg={item.morning_enabled ? 'success' : 'secondary'}>{item.morning_time?.slice(0, 5) || '-'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge bg={item.night_enabled ? 'primary' : 'secondary'}>{item.night_time?.slice(0, 5) || '-'}</Badge>
                      </td>
                      <td className="px-4 py-3">{renderExactTimestamp(item.last_morning_scan_at)}</td>
                      <td className="px-4 py-3">{renderExactTimestamp(item.last_night_scan_at)}</td>
                      <td className="px-4 py-3 text-end">
                        <Button
                          size="sm"
                          variant="outline-success"
                          disabled={domainSaving || scanState.isScanning}
                          onClick={async () => {
                            await contextStartScan(item.domain);
                            setActivities(prev => [`Quick scan started for ${item.domain}`, ...prev.slice(0, 9)]);
                          }}
                        >
                          Quick Scan
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {monitoredDomains.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4">No domains added yet. Add a domain above to schedule and scan it.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        {/* Horizontal Scrollable Asset & Environment Explorer (9 Tabs) */}
          {/* Email Security Results Widget */}
        {emailSecurityResults.length > 0 && (
          <Card className="border-0 mb-4" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '16px' }}>
            <Card.Header className="bg-transparent pt-4 pb-2 border-bottom-0">
              <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>
                <FiShield className="me-2" style={{ color: '#f97316' }} /> Email Security
              </h5>
              <span className="text-muted small">SPF, DMARC, DKIM & SMTP security posture for scanned domains.</span>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead>
                    <tr>
                      <th className="border-0">Domain</th>
                      <th className="border-0">SPF</th>
                      <th className="border-0">DMARC</th>
                      <th className="border-0">DKIM</th>
                      <th className="border-0">MX</th>
                      <th className="border-0">SMTP StartTLS</th>
                      <th className="border-0">Open Relay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailSecurityResults.map(es => (
                      <tr key={es.id}>
                        <td className="fw-semibold" style={{ color: 'var(--text-color)' }}>{es.domain}</td>
                        <td>
                          {es.spf?.length > 0
                            ? <Badge bg="success">Configured</Badge>
                            : <Badge bg="danger">Missing</Badge>
                          }
                        </td>
                        <td>
                          {es.dmarc?.length > 0
                            ? <Badge bg="success">Configured</Badge>
                            : <Badge bg="danger">Missing</Badge>
                          }
                        </td>
                        <td>
                          {es.dkim_selector1?.length > 0 || es.dkim_default?.length > 0
                            ? <Badge bg="success">Found</Badge>
                            : <Badge bg="secondary">Not Found</Badge>
                          }
                        </td>
                        <td className="text-muted">{es.mx?.length || 0} records</td>
                        <td>
                          {es.smtp_starttls?.starttls_supported
                            ? <Badge bg="success">Supported</Badge>
                            : <Badge bg="secondary">N/A</Badge>
                          }
                        </td>
                        <td>
                          {es.smtp_open_relay?.is_open_relay
                            ? <Badge bg="danger">Vulnerable</Badge>
                            : <Badge bg="success">Secure</Badge>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        )}

      <Card className="border-0 mb-4" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '16px' }}>
          <Card.Header className="bg-transparent pt-4 pb-2 border-bottom-0">
            <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-color, #000000)' }}>Asset &amp; Environment Explorer</h5>
            <span className="text-muted small">Explore your discovered cloud assets, software inventories, SSL profiles, and risk trends.</span>
          </Card.Header>
          <Card.Body className="pt-2">
            {/* Horizontally scrolling tab navigation */}
            <div className="d-flex border-bottom mb-4 pb-2 scrollbar-none" style={{ overflowX: "auto", gap: "10px", whiteSpace: "nowrap", borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
              {[
                { id: "web_entities", label: "Web Entities", icon: "bi-link-45deg" },
                { id: "buckets", label: "Storage Buckets", icon: "bi-bucket" },
                { id: "certificates", label: "Certificates", icon: "bi-shield-check" },
                { id: "software", label: "Software", icon: "bi-cpu" }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={explorerTab === tab.id ? "primary" : "none"}
                  onClick={() => setExplorerTab(tab.id)}
                  className="d-inline-flex align-items-center gap-2"
                  style={{
                    borderRadius: "20px",
                    padding: "8px 16px",
                    fontSize: "0.82rem",
                    fontWeight: "500",
                    whiteSpace: "nowrap",
                    border: explorerTab === tab.id ? "none" : "1.5px solid var(--border-color, rgba(0,0,0,0.08))",
                    color: explorerTab === tab.id ? "#ffffff" : "var(--text-secondary, #4a5568)",
                    background: explorerTab === tab.id ? "var(--gradient-accent, #3b82f6)" : "var(--bg-color, #ffffff)",
                    boxShadow: explorerTab === tab.id ? "0 4px 12px rgba(59, 130, 246, 0.35)" : "none"
                  }}
                >
                  <i className={`bi ${tab.icon}`}></i>
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Tab Contents */}
            {explorerTab === "hosts" && (
              <div className="table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))', background: 'var(--bg-color, #ffffff)' }}>
                <Table hover className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.02)', color: 'var(--text-color, #000000)' }}>
                      <th className="py-3 px-4 border-0">Domain / Asset</th>
                      <th className="py-3 px-4 border-0">Scan Status</th>
                      <th className="py-3 px-4 border-0">Hosted</th>
                      <th className="py-3 px-4 border-0">IP Addresses</th>
                      <th className="py-3 px-4 border-0">Ports</th>
                      <th className="py-3 px-4 border-0">Vulnerabilities</th>
                      <th className="py-3 px-4 border-0">Last Scanned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSubdomains.map(sub => {
                      const isHosted = sub.ip && sub.ip.length > 0;
                      return (
                        <tr key={sub.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                          <td className="px-4 py-3 fw-semibold">
                            {(() => {
                              const isRoot = getRootDomain(sub.domain).toLowerCase() === sub.domain.toLowerCase();
                              if (isRoot) {
                                return (
                                  <div className="d-flex align-items-center flex-wrap gap-2">
                                    <i className="bi bi-globe text-primary" style={{ fontSize: '1rem' }} title="Apex Domain"></i>
                                    <span style={{ color: 'var(--text-color, #000000)', fontWeight: 600 }}>{sub.domain}</span>
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
                                    <span style={{ color: 'var(--text-secondary, #4a5568)', fontWeight: 500, opacity: 0.9 }}>{sub.domain}</span>
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
                            <Badge bg={sub.status === 'Active' ? 'success' : 'warning'}>{sub.status}</Badge>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{isHosted ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-3 text-muted">{sub.ip?.join(', ') || '-'}</td>
                          <td className="px-4 py-3 text-muted">{sub.ports?.join(', ') || '-'}</td>
                          <td className="px-4 py-3">
                            {sub.vulnerabilities_count > 0 ? (
                              <Badge bg="danger"><i className="bi bi-bug"></i> {sub.vulnerabilities_count}</Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{renderExactTimestamp(sub.updated_at)}</td>
                        </tr>
                      );
                    })}
                    {subdomains.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">No subdomains found. Start a scan to add.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}

            {explorerTab === "domains" && (
              <div className="d-flex flex-column gap-2">
                {[...uniqueDomains].sort((a,b) => a.localeCompare(b)).map(rootDom => {
                  const associated = subdomains.filter(s => getRootDomain(s.domain) === rootDom);
                  const isExpanded = expandedDomain === rootDom;
                  
                  // Calculate actual subdomains count (excluding the root domain itself)
                  const actualSubdomains = associated.filter(s => getRootDomain(s.domain).toLowerCase() !== s.domain.toLowerCase());
                  const actualSubdomainsCount = actualSubdomains.length;
                  
                  const domainVulns = vulns.filter(v => {
                    const vulnDom = v.domain || "";
                    const vulnSub = v.subdomain || "";
                    return getRootDomain(vulnDom) === rootDom || getRootDomain(vulnSub) === rootDom;
                  });
                  const criticalCount = domainVulns.filter(v => v.severity?.toUpperCase() === "CRITICAL").length;
                  const highCount = domainVulns.filter(v => v.severity?.toUpperCase() === "HIGH").length;
                  const mediumCount = domainVulns.filter(v => v.severity?.toUpperCase() === "MEDIUM").length;
                  const lowCount = domainVulns.filter(v => v.severity?.toUpperCase() === "LOW").length;

                  return (
                    <div key={rootDom} className="border rounded-3 overflow-hidden" style={{ background: 'var(--bg-color, #ffffff)', borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                      <div 
                        className="p-3 d-flex justify-content-between align-items-center cursor-pointer hover-card" 
                        onClick={() => setExpandedDomain(isExpanded ? null : rootDom)}
                        style={{ background: isExpanded ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}
                      >
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <i className="bi bi-globe2 text-primary fs-5"></i>
                          <span className="fw-bold" style={{ color: 'var(--text-color, #000000)' }}>{rootDom}</span>
                          <Badge bg="secondary" pill className="ms-1">
                            {actualSubdomainsCount} {actualSubdomainsCount === 1 ? 'subdomain' : 'subdomains'}
                          </Badge>
                          
                          {/* Severity Breakdown Badges */}
                          <div className="d-flex align-items-center gap-1 ms-3">
                            <Badge bg="danger" style={{ fontSize: '0.72rem', fontWeight: 600, opacity: criticalCount > 0 ? 1 : 0.35 }}>{criticalCount} Critical</Badge>
                            <Badge bg="warning" text="dark" style={{ fontSize: '0.72rem', fontWeight: 600, opacity: highCount > 0 ? 1 : 0.35 }}>{highCount} High</Badge>
                            <Badge bg="primary" style={{ fontSize: '0.72rem', fontWeight: 600, opacity: mediumCount > 0 ? 1 : 0.35 }}>{mediumCount} Medium</Badge>
                            <Badge bg="secondary" style={{ fontSize: '0.72rem', fontWeight: 600, opacity: lowCount > 0 ? 1 : 0.35 }}>{lowCount} Low</Badge>
                          </div>
                        </div>
                        <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} text-muted`}></i>
                      </div>

                      {isExpanded && (
                        <div className="p-3 border-top" style={{ background: 'rgba(0,0,0,0.01)', borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                          <Table hover responsive className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                            <thead>
                              <tr className="text-muted small" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                                <th className="border-0">Domain / Asset</th>
                                <th className="border-0">Status</th>
                                <th className="border-0">Hosted</th>
                                <th className="border-0">IP Addresses</th>
                                <th className="border-0">Ports</th>
                                <th className="border-0">Vulnerabilities</th>
                                <th className="border-0">Last Scanned</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...associated].sort((a, b) => {
                                const isRootA = getRootDomain(a.domain).toLowerCase() === a.domain.toLowerCase();
                                const isRootB = getRootDomain(b.domain).toLowerCase() === b.domain.toLowerCase();
                                if (isRootA) return -1;
                                if (isRootB) return 1;
                                return a.domain.localeCompare(b.domain);
                              }).map(sub => {
                                const isHosted = sub.ip && sub.ip.length > 0;
                                
                                // Calculate severity breakdown for specific subdomain
                                const subVulns = domainVulns.filter(v => v.subdomain === sub.domain || v.domain === sub.domain);
                                const subCritical = subVulns.filter(v => v.severity?.toUpperCase() === "CRITICAL").length;
                                const subHigh = subVulns.filter(v => v.severity?.toUpperCase() === "HIGH").length;
                                const subMedium = subVulns.filter(v => v.severity?.toUpperCase() === "MEDIUM").length;
                                const subLow = subVulns.filter(v => v.severity?.toUpperCase() === "LOW").length;

                                return (
                                  <tr key={sub.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                                    <td>
                                      {(() => {
                                        const isRoot = getRootDomain(sub.domain).toLowerCase() === sub.domain.toLowerCase();
                                        if (isRoot) {
                                          return (
                                            <div className="d-flex align-items-center flex-wrap gap-2">
                                              <i className="bi bi-globe text-primary" style={{ fontSize: '1rem' }} title="Apex Domain"></i>
                                              <span style={{ color: 'var(--text-color, #000000)', fontWeight: 600 }}>{sub.domain}</span>
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
                                              <span style={{ color: 'var(--text-secondary, #4a5568)', fontWeight: 500, opacity: 0.9 }}>{sub.domain}</span>
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
                                    <td>
                                      <Badge bg={sub.status === 'Active' ? 'success' : 'warning'}>{sub.status}</Badge>
                                    </td>
                                    <td style={{ color: 'var(--text-color, #000000)' }}>{isHosted ? 'Yes' : 'No'}</td>
                                    <td className="text-muted">{sub.ip?.join(', ') || '-'}</td>
                                    <td className="text-muted">{sub.ports?.join(', ') || '-'}</td>
                                    <td>
                                      <div className="d-flex align-items-center gap-1">
                                        <Badge bg="danger" style={{ fontSize: '0.7rem', opacity: subCritical > 0 ? 1 : 0.35 }}>{subCritical} C</Badge>
                                        <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem', opacity: subHigh > 0 ? 1 : 0.35 }}>{subHigh} H</Badge>
                                        <Badge bg="primary" style={{ fontSize: '0.7rem', opacity: subMedium > 0 ? 1 : 0.35 }}>{subMedium} M</Badge>
                                        <Badge bg="secondary" style={{ fontSize: '0.7rem', opacity: subLow > 0 ? 1 : 0.35 }}>{subLow} L</Badge>
                                      </div>
                                    </td>
                                    <td>{renderExactTimestamp(sub.updated_at)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
                {uniqueDomains.length === 0 && (
                  <div className="text-center text-muted small py-3">No domains available. Scan an asset to see results.</div>
                )}
              </div>
            )}

            {explorerTab === "web_entities" && (
              <div className="table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))', background: 'var(--bg-color, #ffffff)' }}>
                <Table hover className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.02)', color: 'var(--text-color, #000000)' }}>
                      <th className="py-3 px-4 border-0">HTTP URL</th>
                      <th className="py-3 px-4 border-0">Subdomain</th>
                      <th className="py-3 px-4 border-0">HTTP Status</th>
                      <th className="py-3 px-4 border-0">Content Type</th>
                      <th className="py-3 px-4 border-0">Title</th>
                      <th className="py-3 px-4 border-0">Technologies</th>
                      <th className="py-3 px-4 border-0">Last Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webEntities.map(ent => {
                      let statusBadge = "secondary";
                      if (ent.http_status === 200) statusBadge = "success";
                      else if (ent.http_status === 403 || ent.http_status === 401) statusBadge = "warning";
                      else if (ent.http_status === 404 || ent.http_status >= 500) statusBadge = "danger";

                      return (
                        <tr key={ent.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                          <td className="px-4 py-3 fw-medium text-info" style={{ wordBreak: 'break-all' }}>{ent.http_url}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{ent.subdomain_name}</td>
                          <td className="px-4 py-3">
                            <Badge bg={statusBadge}>{ent.http_status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted small">{ent.content_type || '-'}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{ent.title || '-'}</td>
                          <td className="px-4 py-3">
                            {ent.technologies?.map(t => (
                              <Badge key={t} bg="secondary" className="me-1 border border-secondary text-light">{t}</Badge>
                            )) || '-'}
                          </td>
                          <td className="px-4 py-3">{renderExactTimestamp(ent.last_scan || ent.discovered_at)}</td>
                        </tr>
                      );
                    })}
                    {webEntities.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">No web entities found. Start a scan to add.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}

            {explorerTab === "buckets" && (
              <div className="table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))', background: 'var(--bg-color, #ffffff)' }}>
                <Table hover className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.02)', color: 'var(--text-color, #000000)' }}>
                      <th className="py-3 px-4 border-0">Bucket Name</th>
                      <th className="py-3 px-4 border-0">Provider</th>
                      <th className="py-3 px-4 border-0">Access Level</th>
                      <th className="py-3 px-4 border-0">Status</th>
                      <th className="py-3 px-4 border-0">Region</th>
                      <th className="py-3 px-4 border-0">Last Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.map(b => (
                      <tr key={b.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                        <td className="px-4 py-3 fw-semibold" style={{ color: '#d97706' }}>{b.bucket_name}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{b.provider}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${b.access_level.includes("Public") ? "bg-danger text-white" : "bg-success text-white"}`}>
                            {b.access_level}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge bg={b.status === 'Secure' ? 'success' : 'danger'}>{b.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted">{b.region || '-'}</td>
                        <td className="px-4 py-3">{renderExactTimestamp(b.updated_at)}</td>
                      </tr>
                    ))}
                    {buckets.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">No storage buckets detected.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}

            {explorerTab === "certificates" && (
              <div className="table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))', background: 'var(--bg-color, #ffffff)' }}>
                <Table hover className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.02)', color: 'var(--text-color, #000000)' }}>
                      <th className="py-3 px-4 border-0">Domain</th>
                      <th className="py-3 px-4 border-0">Issuer</th>
                      <th className="py-3 px-4 border-0">Expiry Date</th>
                      <th className="py-3 px-4 border-0">Status</th>
                      <th className="py-3 px-4 border-0">Last Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map(c => (
                      <tr key={c.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                        <td className="px-4 py-3 fw-medium" style={{ color: 'var(--text-color, #000000)' }}>{c.domain}</td>
                        <td className="px-4 py-3 text-muted">{c.issuer}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{new Date(c.expiry_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <Badge bg={c.status === 'Valid' ? 'success' : 'danger'}>{c.status}</Badge>
                        </td>
                        <td className="px-4 py-3">{renderExactTimestamp(c.updated_at)}</td>
                      </tr>
                    ))}
                    {certificates.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">No SSL certificates found.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}

            {explorerTab === "software" && (
              <div className="table-responsive rounded-3 border" style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))', background: 'var(--bg-color, #ffffff)' }}>
                <Table hover className="mb-0 align-middle bg-transparent" style={{ color: 'var(--text-color, #000000)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.02)', color: 'var(--text-color, #000000)' }}>
                      <th className="py-3 px-4 border-0">Name</th>
                      <th className="py-3 px-4 border-0">Version</th>
                      <th className="py-3 px-4 border-0">Hosts Count</th>
                      <th className="py-3 px-4 border-0">Risk Level</th>
                      <th className="py-3 px-4 border-0">CVEs</th>
                      <th className="py-3 px-4 border-0">Last Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {software.map(s => {
                      let riskBadge = "success";
                      if (s.risk_level === "Critical") riskBadge = "danger";
                      else if (s.risk_level === "High") riskBadge = "warning";
                      else if (s.risk_level === "Medium") riskBadge = "info";

                      return (
                        <tr key={s.id} style={{ borderColor: 'var(--header-border, rgba(0, 0, 0, 0.08))' }}>
                          <td className="px-4 py-3 fw-medium" style={{ color: 'var(--text-color, #000000)' }}>{s.name}</td>
                          <td className="px-4 py-3 text-muted">{s.version}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-color, #000000)' }}>{s.hosts_count}</td>
                          <td className="px-4 py-3">
                            <Badge bg={riskBadge}>{s.risk_level}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {s.cves && s.cves.length > 0 ? (
                              s.cves.map(cve => (
                                <Badge key={cve} bg="danger" className="me-1">{cve}</Badge>
                              ))
                            ) : (
                              <span className="text-muted">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{renderExactTimestamp(s.updated_at)}</td>
                        </tr>
                      );
                    })}
                    {software.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">No software detected.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}

          </Card.Body>
        </Card>

        {/* Recent Activity Only */}
        <Row className="g-3">
          <Col md={12}>
            <Card 
              className="border-0 h-100"
              style={{
                background: 'var(--header-bg)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                borderRadius: '16px',
                border: '1px solid var(--header-border)'
              }}
            >
              <Card.Header className="bg-transparent border-bottom-0 pt-4 pb-2">
                <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>Recent Activity</h5>
              </Card.Header>
              <Card.Body>
                <div className="activity-feed">
                  {activities.slice(0, 5).map((item, i) => (
                    <div key={i} className="d-flex mb-4 align-items-center">
                      <div className="me-3">
                        <div className="p-3 rounded-circle d-flex align-items-center justify-content-center" style={{ background: 'rgba(65, 105, 225, 0.1)', width: '45px', height: '45px' }}>
                          <FiBell style={{ color: '#4169E1' }} />
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 fw-medium" style={{ color: 'var(--text-color)' }}>{item}</p>
                        <small style={{ color: 'var(--text-color)', opacity: 0.6 }}>Just now</small>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* START SANITIZED SCANNING WIZARD MODAL */}
      {/* ADD SURFACE ASSET MODAL */}
      <Modal show={showScanModal} onHide={() => setShowScanModal(false)} centered className="cyber-modal">
        <style>{`
          .radar-pulse-ring {
            position: absolute; width: 100%; height: 100%; border-radius: 50%;
            border: 2px solid #3b82f6;
            animation: scanPing 2s cubic-bezier(0.21, 0.53, 0.56, 0.8) infinite;
          }
          .radar-pulse-ring-delayed {
            position: absolute; width: 100%; height: 100%; border-radius: 50%;
            border: 2px solid #a855f7;
            animation: scanPing 2s cubic-bezier(0.21, 0.53, 0.56, 0.8) infinite;
            animation-delay: 1s;
          }
          @keyframes scanPing {
            0% { transform: scale(0.9); opacity: 1; }
            100% { transform: scale(2.4); opacity: 0; }
          }
        `}</style>

        <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))' }}>
          <Modal.Title className="fw-bold font-monospace text-uppercase" style={{ fontSize: '1.05rem', letterSpacing: '0.5px' }}>
            <span>Scan New Target</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ backgroundColor: 'var(--body-bg, #fcfcfc)' }}>          
          {/* Wizard Step 1: Input subdomain / name check */}
          {wizardStep === "input_subdomain" && (
            <Form onSubmit={handleWizardSubmit}>
              <div className="text-center mb-4 position-relative py-3">
                <div className="mx-auto position-relative mb-2" style={{ width: '80px', height: '80px' }}>
                  <div className="radar-pulse-ring"></div>
                  <div className="radar-pulse-ring-delayed"></div>
                  <div className="position-absolute top-50 start-50 translate-middle bg-primary rounded-circle d-flex align-items-center justify-content-center text-white shadow-lg" style={{ width: '48px', height: '48px', zIndex: 3 }}>
                    <i className="bi bi-globe fs-4"></i>
                  </div>
                </div>
                <h5 className="fw-bold mt-3 mb-1" style={{ color: 'var(--text-color, #1a1a1a)' }}>Target Asset Entry</h5>
                <p className="text-muted small px-3 mb-0">Enter a domain or URL to run a full attack surface scan with all available cyber tools.</p>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="small text-muted fw-semibold font-monospace">ENTER DOMAIN / URL TO SCAN</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="e.g. example.com or https://example.com" 
                  value={inputSubdomainName}
                  onChange={(e) => setInputSubdomainName(e.target.value)}
                  required
                  className="fs-6"
                  style={{ height: '48px', borderRadius: '12px', border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))' }}
                />
                <Form.Text className="text-muted small mt-2 d-block">
                  The scan will perform subdomain discovery, live host probing, technology detection, port scanning, vulnerability scanning, SSL checks, and email security analysis.
                </Form.Text>
              </Form.Group>
              
              <Button 
                type="submit" 
                variant="primary" 
                className="w-100 py-2.5 mt-2 fw-semibold d-flex align-items-center justify-content-center gap-2" 
                style={{ borderRadius: '12px', height: '48px' }}
                disabled={!inputSubdomainName.trim()}
              >
                <span>Start Scan</span>
                <i className="bi bi-arrow-right-short fs-4"></i>
              </Button>
            </Form>
          )}

          {/* Wizard Step 2: Choose existing vs new domain */}
          {wizardStep === "ask_domain_type" && (
            <div>
              <div className="text-center mb-4">
                <h5 className="fw-bold mb-1" style={{ color: 'var(--text-color, #1a1a1a)' }}>Parent Domain Selection</h5>
                <p className="text-muted small mb-0">Construct target asset node tree for: <code className="text-primary font-monospace">{inputSubdomainName}</code></p>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-6">
                  <div 
                    className="cyber-option-card cyber-option-card-cyan p-4 h-100 text-center d-flex flex-column justify-content-between" 
                    onClick={() => setWizardStep("select_existing")}
                  >
                    <div>
                      <div className="text-info mb-3 mx-auto bg-info-subtle rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                        <i className="bi bi-folder-check fs-4"></i>
                      </div>
                      <h6 className="fw-bold mb-2" style={{ color: 'var(--text-color, #1a1a1a)' }}>Existing Root</h6>
                      <p className="text-muted mb-0" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>
                        Map this subdomain prefix to one of your currently registered parent domains.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="col-6">
                      <div 
                        className="cyber-option-card p-4 h-100 text-center d-flex flex-column justify-content-between" 
                        onClick={() => setWizardStep("enter_new")}
                      >
                        <div>
                          <div className="text-primary mb-3 mx-auto bg-primary-subtle rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                            <i className="bi bi-folder-plus fs-4"></i>
                          </div>
                          <h6 className="fw-bold mb-2" style={{ color: 'var(--text-color, #1a1a1a)' }}>New Parent</h6>
                          <p className="text-muted mb-0" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>
                            Define a completely new root domain node and index this subdomain under it.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button variant="link" className="w-100 text-muted small mt-2 font-monospace d-flex align-items-center justify-content-center gap-1 text-decoration-none" onClick={() => setWizardStep("input_subdomain")}>
                    <i className="bi bi-arrow-left-short fs-5"></i>
                    <span>Back to Entry</span>
                  </Button>
                </div>
              )}

              {/* Wizard Step 3: Selected Existing Domain Path */}
              {wizardStep === "select_existing" && (
                <Form onSubmit={handleExistingDomainSubmit}>
                  <div className="text-center mb-4">
                    <h5 className="fw-bold mb-1" style={{ color: 'var(--text-color, #1a1a1a)' }}>Attach to Registered Root</h5>
                    <p className="text-muted small mb-0">Construct subdomain map within your existing perimeter.</p>
                  </div>

                  {/* Real-time constructed path preview banner */}
                  <div className="p-3 mb-3 border rounded-3 text-center" style={{ background: 'var(--input-bg, #f8f9fa)', borderColor: 'var(--border-color, rgba(0, 0, 0, 0.08))' }}>
                    <span className="small text-muted d-block mb-1">CONSTRUCTED TARGET PATH PREVIEW</span>
                    <code className="text-primary fw-bold fs-6 font-monospace" style={{ wordBreak: 'break-all' }}>
                      {(() => {
                        let prefix = specificPrefix.trim().toLowerCase();
                        if (selectedExistingDomain) {
                          if (prefix.endsWith("." + selectedExistingDomain)) {
                            prefix = prefix.slice(0, -(selectedExistingDomain.length + 1));
                          } else if (prefix === selectedExistingDomain) {
                            prefix = "";
                          }
                        }
                        return sanitizeSubdomainStr(prefix ? `${prefix}.${selectedExistingDomain || 'root-domain'}` : (selectedExistingDomain || 'root-domain'));
                      })()}
                    </code>
                  </div>
                  
                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted fw-semibold font-monospace">SELECT REGISTERED DOMAIN</Form.Label>
                    <Form.Select 
                      value={selectedExistingDomain}
                      onChange={(e) => setSelectedExistingDomain(e.target.value)}
                      required
                      className="fs-6"
                      style={{ height: '46px', borderRadius: '10px', border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))' }}
                    >
                      <option value="">-- Choose registered parent --</option>
                      {uniqueDomains.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="small text-muted fw-semibold font-monospace">SUBDOMAIN PREFIX</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="e.g. portal" 
                      value={specificPrefix}
                      onChange={(e) => setSpecificPrefix(e.target.value)}
                      className="fs-6"
                      style={{ height: '46px', borderRadius: '10px', border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))' }}
                    />
                    <Form.Text className="text-muted small mt-2 d-block">
                      Leave blank to scan the root domain itself.
                    </Form.Text>
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button variant="outline-secondary" className="w-50 py-2 fw-semibold" onClick={() => setWizardStep("ask_domain_type")} style={{ borderRadius: '12px' }}>
                      Back
                    </Button>
                    <Button type="submit" variant="primary" className="w-50 py-2 fw-semibold d-flex align-items-center justify-content-center gap-1" disabled={!selectedExistingDomain} style={{ borderRadius: '12px' }}>
                      <i className="bi bi-activity"></i>
                      <span>Trigger Scan</span>
                    </Button>
                  </div>
                </Form>
              )}

              {/* Wizard Step 4: Choose New Domain Path */}
              {wizardStep === "enter_new" && (
                <Form onSubmit={handleNewDomainSubmit}>
                  <div className="text-center mb-4">
                    <h5 className="fw-bold mb-1" style={{ color: 'var(--text-color, #1a1a1a)' }}>Index New Parent Node</h5>
                    <p className="text-muted small mb-0">Register a new root asset node in your cyber map ledger.</p>
                  </div>

                  {/* Real-time constructed path preview banner */}
                  <div className="p-3 mb-3 border rounded-3 text-center" style={{ background: 'var(--input-bg, #f8f9fa)', borderColor: 'var(--border-color, rgba(0, 0, 0, 0.08))' }}>
                    <span className="small text-muted d-block mb-1">CONSTRUCTED TARGET PATH PREVIEW</span>
                    <code className="text-primary fw-bold fs-6 font-monospace" style={{ wordBreak: 'break-all' }}>
                      {(() => {
                        let prefix = specificPrefix.trim().toLowerCase();
                        let root = newRootDomain.trim().toLowerCase();
                        root = root.replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
                        if (root) {
                          if (prefix.endsWith("." + root)) {
                            prefix = prefix.slice(0, -(root.length + 1));
                          } else if (prefix === root) {
                            prefix = "";
                          }
                        }
                        return sanitizeSubdomainStr(prefix ? `${prefix}.${root || 'new-root-domain'}` : (root || 'new-root-domain'));
                      })()}
                    </code>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted fw-semibold font-monospace">NEW ROOT DOMAIN NAME</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="e.g. example.com" 
                      value={newRootDomain}
                      onChange={(e) => setNewRootDomain(e.target.value)}
                      required
                      className="fs-6"
                      style={{ height: '46px', borderRadius: '10px', border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))' }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="small text-muted fw-semibold font-monospace">SUBDOMAIN PREFIX</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="e.g. portal" 
                      value={specificPrefix}
                      onChange={(e) => setSpecificPrefix(e.target.value)}
                      className="fs-6"
                      style={{ height: '46px', borderRadius: '10px', border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))' }}
                    />
                    <Form.Text className="text-muted small mt-2 d-block">
                      Leave blank to scan the root domain itself.
                    </Form.Text>
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button variant="outline-secondary" className="w-50 py-2 fw-semibold" onClick={() => setWizardStep("ask_domain_type")} style={{ borderRadius: '12px' }}>
                      Back
                    </Button>
                    <Button type="submit" variant="primary" className="w-50 py-2 fw-semibold d-flex align-items-center justify-content-center gap-1" disabled={!newRootDomain.trim()} style={{ borderRadius: '12px' }}>
                      <i className="bi bi-activity"></i>
                      <span>Trigger Scan</span>
                    </Button>
                  </div>
                </Form>
              )}
        </Modal.Body>
      </Modal>

      {/* GENERATE REPORT MODAL */}
      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} centered className="cyber-modal">
        <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))' }}>
          <Modal.Title className="fw-bold font-monospace text-uppercase" style={{ fontSize: '1.05rem', letterSpacing: '0.5px' }}>
            <span>Executive Security Report</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center" style={{ backgroundColor: 'var(--body-bg, #fcfcfc)' }}>
          <div>
            <FiDownload size={45} className="text-info mb-3" />
            <h5 className="fw-bold" style={{ color: 'var(--text-color, #1a1a1a)' }}>Download Comprehensive Audit Report</h5>
            <p className="text-muted small mb-4">
              Generate and download a PDF report listing all discovered vulnerabilities, open ports, subdomains, and certificates from your scans.
            </p>
            <Button 
              variant="info" 
              className="text-white w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2" 
              onClick={() => { handleDownloadPDF(true); setShowReportModal(false); }}
              style={{ 
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
              }}
            >
              <FiDownload size={16} />
              <span>Download PDF Now</span>
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* RUN SECURITY CHECK MODAL */}
      <Modal show={showCheckModal} onHide={() => setShowCheckModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-semibold">Run Scan to Check</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center">
          <FiShield size={45} className="text-success mb-3" />
          <h5>Perform a Security Scan</h5>
          <p className="text-muted small">Enter a domain in the Domain Scan Control section above and click Quick Scan to run a full security assessment with all available tools.</p>
          <Button variant="success" className="w-100 mt-2" onClick={() => { setShowCheckModal(false); }} style={{ borderRadius: '10px' }}>
            Got it
          </Button>
        </Modal.Body>
      </Modal>

      {/* SUBSCRIPTION PLANS MODAL */}
      <Modal show={showSubscriptionModal} onHide={() => setShowSubscriptionModal(false)} size="lg" centered className="cyber-modal">
        <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))' }}>
          <Modal.Title className="fw-bold font-monospace text-uppercase" style={{ fontSize: '1.05rem', letterSpacing: '0.5px' }}>
            <span>Sentinel Subscription Plans</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ backgroundColor: 'var(--body-bg, #fcfcfc)' }}>
          <div className="text-center mb-4">
            <h4 className="fw-bold mb-1" style={{ color: 'var(--text-color, #1a1a1a)' }}>Unlock Unlimited Scanning Capabilities</h4>
            <p className="text-muted small">You have reached the maximum limit of **1 domain** on the Free Tier. Choose a premium plan to monitor more assets.</p>
          </div>
          
          <Row className="g-4 justify-content-center">
            {/* Free Plan Card */}
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm" style={{
                borderRadius: '16px',
                background: 'var(--header-bg)',
                border: userPlan === 'Free' ? '2px solid #64748b' : '1px solid var(--header-border)',
                transition: 'all 0.3s ease'
              }}>
                <Card.Body className="d-flex flex-column p-4">
                  <div className="mb-3">
                    <Badge bg="secondary" className="mb-2">Free Tier</Badge>
                    <h3 className="fw-bold mb-0 text-dark">$0<span className="fs-6 text-muted font-normal" style={{ fontWeight: 'normal', fontSize: '0.85rem' }}>/mo</span></h3>
                    <p className="small text-muted mt-1">Basic passive security mapping</p>
                  </div>
                  <hr style={{ opacity: 0.1 }} />
                  <ul className="list-unstyled flex-grow-1 mb-4" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2"></i>Monitor 1 Domain</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2"></i>Passive Subdomains</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2"></i>Weekly Updates</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2"></i>Standard Alerts</li>
                  </ul>
                  <Button
                    variant="outline-secondary"
                    className="w-100 py-2.5 fw-semibold"
                    disabled={userPlan === 'Free'}
                    onClick={() => {
                      setUserPlan('Free');
                      localStorage.setItem('userPlan', 'Free');
                      window.dispatchEvent(new Event('userLogin')); // Refresh header plan badge
                      setShowSubscriptionModal(false);
                      setActivities(prev => ['Downgraded to Free Tier plan', ...prev]);
                    }}
                    style={{ borderRadius: '12px' }}
                  >
                    {userPlan === 'Free' ? 'Current Plan' : 'Select Free'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Pro Plan Card */}
            <Col md={4}>
              <Card className="h-100 border-0 shadow-lg position-relative" style={{
                borderRadius: '16px',
                background: 'var(--header-bg)',
                border: userPlan === 'Pro' ? '2px solid var(--accent-blue)' : '2px solid rgba(59, 130, 246, 0.4)',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
                transition: 'all 0.3s ease'
              }}>
                <div className="position-absolute px-3 py-1 bg-primary text-white rounded-pill small fw-semibold" style={{
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '0.72rem',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  zIndex: 10
                }}>
                  Best Value
                </div>
                <Card.Body className="d-flex flex-column p-4">
                  <div className="mb-3">
                    <Badge bg="primary" className="mb-2">Pro Tier</Badge>
                    <h3 className="fw-bold mb-0 text-primary">$49<span className="fs-6 text-muted font-normal" style={{ fontWeight: 'normal', fontSize: '0.85rem' }}>/mo</span></h3>
                    <p className="small text-muted mt-1">Advanced scan control & reports</p>
                  </div>
                  <hr style={{ opacity: 0.1 }} />
                  <ul className="list-unstyled flex-grow-1 mb-4" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <li className="mb-2"><i className="bi bi-check2 text-primary me-2"></i>Monitor 10 Domains</li>
                    <li className="mb-2"><i className="bi bi-check2 text-primary me-2"></i>Active Port Scans</li>
                    <li className="mb-2"><i className="bi bi-check2 text-primary me-2"></i>Daily Scans</li>
                    <li className="mb-2"><i className="bi bi-check2 text-primary me-2"></i>PDF Intel Reports</li>
                    <li className="mb-2"><i className="bi bi-check2 text-primary me-2"></i>Slack / Alert Sync</li>
                  </ul>
                  <Button
                    variant="primary"
                    className="w-100 py-2.5 fw-semibold text-white shadow-sm"
                    disabled={userPlan === 'Pro'}
                    onClick={() => {
                      setUserPlan('Pro');
                      localStorage.setItem('userPlan', 'Pro');
                      window.dispatchEvent(new Event('userLogin')); // Refresh header plan badge
                      setShowSubscriptionModal(false);
                      setActivities(prev => ['Successfully upgraded to Pro Plan!', ...prev]);
                      alert('Upgrade successful! You are now subscribed to the Pro Plan. You can now monitor up to 10 domains.');
                    }}
                    style={{
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    }}
                  >
                    {userPlan === 'Pro' ? 'Current Plan' : 'Upgrade to Pro'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Enterprise Plan Card */}
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm" style={{
                borderRadius: '16px',
                background: 'var(--header-bg)',
                border: userPlan === 'Enterprise' ? '2px solid #8b5cf6' : '1px solid var(--header-border)',
                transition: 'all 0.3s ease'
              }}>
                <Card.Body className="d-flex flex-column p-4">
                  <div className="mb-3">
                    <Badge bg="info" className="mb-2" style={{ backgroundColor: '#8b5cf6' }}>Enterprise</Badge>
                    <h3 className="fw-bold mb-0 text-dark" style={{ color: '#8b5cf6' }}>$199<span className="fs-6 text-muted font-normal" style={{ fontWeight: 'normal', fontSize: '0.85rem' }}>/mo</span></h3>
                    <p className="small text-muted mt-1">Continuous security coverage</p>
                  </div>
                  <hr style={{ opacity: 0.1 }} />
                  <ul className="list-unstyled flex-grow-1 mb-4" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2" style={{ color: '#8b5cf6' }}></i>Unlimited Domains</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2" style={{ color: '#8b5cf6' }}></i>24/7 Continuous Scanning</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2" style={{ color: '#8b5cf6' }}></i>Shodan & Censys Sync</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2" style={{ color: '#8b5cf6' }}></i>Nuclei Custom templates</li>
                    <li className="mb-2"><i className="bi bi-check2 text-success me-2" style={{ color: '#8b5cf6' }}></i>Dedicated Support</li>
                  </ul>
                  <Button
                    variant="outline-secondary"
                    className="w-100 py-2.5 fw-semibold"
                    disabled={userPlan === 'Enterprise'}
                    onClick={() => {
                      setUserPlan('Enterprise');
                      localStorage.setItem('userPlan', 'Enterprise');
                      window.dispatchEvent(new Event('userLogin')); // Refresh header plan badge
                      setShowSubscriptionModal(false);
                      setActivities(prev => ['Successfully upgraded to Enterprise Plan!', ...prev]);
                      alert('Upgrade successful! You are now subscribed to the Enterprise Plan. You can now monitor unlimited domains.');
                    }}
                    style={{
                      borderRadius: '12px',
                      borderColor: '#8b5cf6',
                      color: '#8b5cf6'
                    }}
                  >
                    {userPlan === 'Enterprise' ? 'Current Plan' : 'Go Enterprise'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>

      {/* Reusable Small Notification Modal */}
      <Modal show={notification.show} onHide={() => setNotification({ ...notification, show: false })} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-semibold">{notification.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3 text-center">
          <p className="mb-0 text-muted small">{notification.message}</p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 d-flex justify-content-center">
          <Button variant="primary" size="sm" onClick={() => setNotification({ ...notification, show: false })} className="px-4" style={{ borderRadius: '8px' }}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DashboardPage;
>>>>>>> latest
