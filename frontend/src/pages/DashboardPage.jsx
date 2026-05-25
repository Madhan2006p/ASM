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
  const { startScan: contextStartScan, scanState } = useScan();

  // Modal states
  const [showScanModal, setShowScanModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);

  // Smart scan wizard states
  const [wizardStep, setWizardStep] = useState("input_subdomain");
  const [inputSubdomainName, setInputSubdomainName] = useState("");
  const [selectedExistingDomain, setSelectedExistingDomain] = useState("");
  const [newRootDomain, setNewRootDomain] = useState("");
  const [specificPrefix, setSpecificPrefix] = useState("");

  // Scan simulation states
  const [scanTargetName, setScanTargetName] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanPhaseIndex, setScanPhaseIndex] = useState(0);

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

  // Security Check simulation states
  const [checkProgress, setCheckProgress] = useState(0);
  const [checkLogs, setCheckLogs] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  // Report simulation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
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



  const getSimulatedScanLogs = (target, phaseIndex) => {
    const logs = [];
    const timestamp = () => `[${new Date().toLocaleTimeString()}]`;
    logs.push({ text: `${timestamp()} [SYSTEM] Scan engine active for ${target}`, type: 'sys' });
    const phases = [
      "Subdomain Discovery",
      "Live Host Probing",
      "Port Scanning",
      "Technology Detection",
      "Vulnerability Scanning",
      "SSL/Email Security",
      "Finalizing"
    ];
    for (let i = 0; i <= Math.min(phaseIndex, phases.length - 1); i++) {
      logs.push({ text: `${timestamp()} [${phaseIndex >= i + 1 ? 'DONE' : '....'}] ${phases[i]}`, type: phaseIndex >= i + 1 ? 'success' : 'sys' });
    }
    return logs;
  };


  const loadData = useCallback(async () => {
    try {
      const orgId = "1";
      const [subList, vulnList, endpointsList, portList, techList, sslList, domainList] = await Promise.all([
        fetchAllPages('subdomains', orgId).catch(() => []),
        fetchAllPages('vulnerabilities', orgId).catch(() => []),
        fetchAllPages('endpoints', orgId).catch(() => []),
        fetchAllPages('open-ports', orgId).catch(() => []),
        fetchAllPages('technologies', orgId).catch(() => []),
        fetchAllPages('ssl-certificates', orgId).catch(() => []),
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
      setMonitoredDomains(domainList);

      setActivities(prev => ["Dashboard loaded with live scan data.", ...prev.slice(0, 4)]);
    } catch (err) {
      setActivities(prev => ["Dashboard loaded (some data may be unavailable).", ...prev.slice(0, 4)]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const prevPhasesRef = React.useRef({});
  useEffect(() => {
    const phases = scanState.phasesDone || {};
    const changed = Object.keys(phases).some(k => phases[k] && !prevPhasesRef.current[k]);
    if (changed) {
      prevPhasesRef.current = { ...phases };
      loadData();
    }
  }, [scanState.phasesDone, loadData]);

  // Reset report generator states when modal opens/closes
  useEffect(() => {
    if (!showReportModal) {
      setReportReady(false);
      setIsGenerating(false);
      setReportProgress(0);
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

  const runSimulatedScan = (target) => {
    setIsScanning(true);
    setScanTargetName(target);
    setScanPhase("Starting scan...");
    setScanProgress(0);
    setScanPhaseIndex(0);
    setShowScanModal(false);
    contextStartScan(target);

    setTimeout(() => {
      setActivities(prev => [`Scan started for ${target}`, ...prev.slice(0, 9)]);
    }, 500);
  };

  const normalizeDomainInput = (value) => {
    return value.trim().toLowerCase().replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    const domain = normalizeDomainInput(domainInput);
    if (!domain) return;
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
      setActivities(prev => [`Failed to add domain ${domain}`, ...prev.slice(0, 9)]);
    } finally {
      setDomainSaving(false);
    }
  };

  const handleQuickScan = async () => {
    const domain = normalizeDomainInput(domainInput || monitoredDomains[0]?.domain || "");
    if (!domain) return;
    setDomainSaving(true);
    try {
      contextStartScan(domain);
      setActivities(prev => [`Quick scan started for ${domain}`, ...prev.slice(0, 9)]);
    } catch {
      setActivities(prev => [`Failed to start quick scan for ${domain}`, ...prev.slice(0, 9)]);
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

      const existing = subdomains.find(s => s.domain === rawVal);
      if (existing) {
        setScanTargetName(rawVal);
        setWizardStep("confirm_rescan");
      } else {
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

  // Quick Action 2: Generate Report (PDF) - Phase 1: Compile Data
  const handleGenerateReport = () => {
    setIsGenerating(true);
    setReportProgress(0);
    setReportReady(false);

    const timer = setInterval(() => {
      setReportProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    setTimeout(() => {
      setIsGenerating(false);
      setReportReady(true);
      // Automatically trigger PDF generation & download
      handleDownloadPDF(true);
    }, 2000);
  };

  // Phase 2: Synchronous PDF Compilation and Instant Save on direct user trigger
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
  const handleRunSecurityCheck = () => {
    setIsChecking(true);
    setCheckProgress(0);
    setCheckLogs(["Initiating core integrity system check..."]);

    const logSteps = [
      { time: 400, progress: 15, log: "Parsing domain system files..." },
      { time: 800, progress: 35, log: "Analyzing SSL status configs..." },
      { time: 1200, progress: 55, log: "Probing endpoints security compliance..." },
      { time: 1600, progress: 75, log: "Testing open port permissions..." },
      { time: 2000, progress: 90, log: "Cross-referencing global CVE datasets..." },
      { time: 2400, progress: 100, log: "Scan complete. No active malware detected." }
    ];

    logSteps.forEach(step => {
      setTimeout(() => {
        setCheckProgress(step.progress);
        setCheckLogs(prev => [...prev, step.log]);
      }, step.time);
    });

    setTimeout(() => {
      setIsChecking(false);
      setShowCheckModal(false);
      setActivities(prev => [`System Security Check executed successfully`, ...prev]);
      setNotification({
        show: true,
        title: "Security Check Completed",
        message: "Security Check Completed! Your platform firewall and endpoints comply fully with standards.",
        type: "info"
      });
    }, 3200);
  };

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

        {/* Top Risks */}
        <Row className="mb-4 g-3">
          <Col md={12}>
            <Card className="border-0 h-100" style={{ background: 'var(--header-bg)', border: '1px solid var(--header-border)', borderRadius: '16px' }}>
              <Card.Header className="bg-transparent border-bottom-0 pt-4 pb-2">
                <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-color)' }}>Top Risks</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table className="mb-0 align-middle" hover style={{ color: 'var(--text-color)' }}>
                    <thead>
                      <tr className="text-muted small">
                        <th className="px-4">SEVERITY</th>
                        <th>RISK NAME</th>
                        <th className="px-4 text-end">COUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vulns.length === 0 && (
                        <tr><td colSpan={3} className="text-center text-muted py-4">No vulnerabilities found yet. Run a scan to see results.</td></tr>
                      )}
                      {vulns.slice(0, 10).map(v => {
                        const sev = (v.severity || 'low').toLowerCase();
                        const badgeColor = sev === 'critical' ? 'danger' : sev === 'high' ? 'warning' : sev === 'medium' ? 'primary' : 'secondary';
                        const barColor = sev === 'critical' ? '#EF4444' : sev === 'high' ? '#F59E0B' : sev === 'medium' ? '#3B82F6' : '#64748b';
                        const barWidth = Math.min(100, Math.max(5, (vulns.filter(x => x.severity?.toLowerCase() === sev).length) * 10));
                        return (
                          <tr key={v.id || v.vulnerability_id}>
                            <td className="px-4">
                              <span className={`badge bg-${badgeColor} text-uppercase px-2 py-1`}>{sev}</span>
                            </td>
                            <td className="small fw-semibold">{v.finding || v.title || v.vulnerability_id || v.cve || 'Unknown'}</td>
                            <td className="px-4">
                              <div className="d-flex align-items-center justify-content-end gap-2">
                                <div style={{ width: '80px', height: '8px', background: '#475569', borderRadius: '4px' }}>
                                  <div style={{ width: `${barWidth}%`, height: '100%', background: barColor, borderRadius: '4px' }}></div>
                                </div>
                                <span className="small fw-bold">{vulns.filter(x => x.severity?.toLowerCase() === sev).length}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
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
                  <Form.Label className="small text-muted fw-semibold">Domain</Form.Label>
                  <Form.Control
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="example.com"
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
      <Modal show={showScanModal} onHide={() => !isScanning && setShowScanModal(false)} centered className="cyber-modal">
        {/* Scoped cyberpunk styling injected directly */}
        <style>{`
          /* Pulsing radar scanner effect */
          @keyframes scanPing {
            0% {
              transform: scale(0.9);
              opacity: 1;
            }
            100% {
              transform: scale(2.4);
              opacity: 0;
            }
          }
          .radar-pulse-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid #3b82f6;
            animation: scanPing 2s cubic-bezier(0.21, 0.53, 0.56, 0.8) infinite;
          }
          .radar-pulse-ring-delayed {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid #a855f7;
            animation: scanPing 2s cubic-bezier(0.21, 0.53, 0.56, 0.8) infinite;
            animation-delay: 1s;
          }

          /* Cyber holographic progress bar sweep */
          @keyframes scannerSweep {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .cyber-progress-bar {
            background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4, #3b82f6) !important;
            background-size: 300% 300% !important;
            animation: scannerSweep 2s ease infinite !important;
            box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
          }

          /* Cyber option cards */
          .cyber-option-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
            background: var(--card-bg, #ffffff);
            cursor: pointer;
            border-radius: 12px;
          }
          .cyber-option-card:hover {
            transform: translateY(-4px);
            border-color: #3b82f6 !important;
            box-shadow: 0 10px 25px rgba(59, 130, 246, 0.12);
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.02), rgba(139, 92, 246, 0.02)) !important;
          }
          .cyber-option-card-cyan:hover {
            border-color: #06b6d4 !important;
            box-shadow: 0 10px 25px rgba(6, 182, 212, 0.12);
            background: linear-gradient(135deg, rgba(6, 182, 212, 0.02), rgba(59, 130, 246, 0.02)) !important;
          }

          /* Terminal log styling */
          .cyber-terminal {
            font-family: 'Courier New', Courier, monospace;
            background: #0f172a !important;
            color: #38bdf8 !important;
            border: 1px solid #1e293b;
            border-radius: 8px;
            height: 180px;
            overflow-y: auto;
            box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);
          }
          .cyber-terminal::-webkit-scrollbar {
            width: 6px;
          }
          .cyber-terminal::-webkit-scrollbar-track {
            background: #0f172a;
          }
          .cyber-terminal::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 3px;
          }
          .cyber-terminal::-webkit-scrollbar-thumb:hover {
            background: #475569;
          }
          .terminal-sys { color: #94a3b8; }
          .terminal-success { color: #4ade80; font-weight: bold; }
          .terminal-warn { color: #facc15; }
          .terminal-crit { color: #f87171; font-weight: bold; }
          .terminal-info { color: #38bdf8; }

          /* Pulse status indicators */
          @keyframes cyberBlink {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          .cyber-blink-node {
            animation: cyberBlink 1.5s infinite;
          }
        `}</style>

        <Modal.Header closeButton={!isScanning} style={{ borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))' }}>
          <Modal.Title className="fw-bold font-monospace text-uppercase" style={{ fontSize: '1.05rem', letterSpacing: '0.5px' }}>
            {isScanning ? (
              <span className="d-flex align-items-center gap-2">
                <Spinner animation="grow" size="sm" variant="danger" className="cyber-blink-node" style={{ width: '8px', height: '8px' }} />
                <span>Reconnaissance Sequence Active</span>
              </span>
            ) : (
              <span>Add &amp; Scan Surface Asset</span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ backgroundColor: 'var(--body-bg, #fcfcfc)' }}>
          
          {isScanning ? (
            <div className="text-center py-2">
              <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                <div className="bg-danger rounded-circle cyber-blink-node" style={{ width: '10px', height: '10px', boxShadow: '0 0 8px #ef4444' }}></div>
                <h5 className="fw-bold mb-0 text-uppercase font-monospace tracking-wider" style={{ color: 'var(--text-color, #1a1a1a)', fontSize: '1rem' }}>Active Recon Matrix</h5>
              </div>
              
              <p className="small text-muted mb-4">
                Probing host: <code className="text-primary font-monospace">{scanTargetName}</code>
              </p>

              {/* 3-card stats block */}
              <div className="row g-2 mb-4">
                <div className="col-4">
                  <div className="p-2.5 rounded-3 text-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.18)', backdropFilter: 'blur(4px)' }}>
                    <div className="text-muted fw-semibold font-monospace" style={{ fontSize: '0.68rem' }}>PIPELINE STEPS</div>
                    <div className="h4 mb-0 fw-bold text-primary font-monospace">6</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2.5 rounded-3 text-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.18)', backdropFilter: 'blur(4px)' }}>
                    <div className="text-muted fw-semibold font-monospace" style={{ fontSize: '0.68rem' }}>COMPLETED</div>
                    <div className="h4 mb-0 fw-bold text-success font-monospace">{scanPhaseIndex}</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2.5 rounded-3 text-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.18)', backdropFilter: 'blur(4px)' }}>
                    <div className="text-muted fw-semibold font-monospace" style={{ fontSize: '0.68rem' }}>PENDING</div>
                    <div className="h4 mb-0 fw-bold text-warning font-monospace">{6 - scanPhaseIndex}</div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1 small text-muted font-monospace">
                  <span>recon_engine.bin</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="progress" style={{ height: '10px', background: 'var(--input-border, rgba(0, 0, 0, 0.08))', borderRadius: '6px' }}>
                  <div className="progress-bar progress-bar-striped progress-bar-animated cyber-progress-bar" style={{ width: `${scanProgress}%`, borderRadius: '6px' }}></div>
                </div>
              </div>

              {/* Live Cyber Terminal Console */}
              <div className="mb-4">
                <div className="text-start mb-1 small text-muted font-monospace d-flex align-items-center gap-2">
                  <i className="bi bi-terminal text-primary"></i>
                  <span>Recon Live Terminal Logs</span>
                </div>
                <div className="cyber-terminal p-3 text-start" id="cyber-terminal-logs">
                  {getSimulatedScanLogs(scanTargetName, scanPhaseIndex).map((log, lidx) => (
                    <div key={lidx} className={`mb-1 small terminal-${log.type}`}>
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* System Stepper Timeline */}
              <div className="d-flex flex-column gap-2 text-start p-3 rounded-3 border" style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-color, rgba(0, 0, 0, 0.08))' }}>
                <span className="small text-muted fw-bold font-monospace mb-1 d-block">CONCURRENT RECON MODULES</span>
                {[
                  "Initializing Passive Discovery (Subfinder, Amass)",
                  "Resolving DNS & IP Records",
                  "Scanning Open Ports (80, 443, 8080)",
                  "Crawling Web Directories & Hidden Files",
                  "Checking Technology signatures & frameworks",
                  "Running Deep Vulnerability Scans (OWASP Top 10)"
                ].map((phaseName, idx) => {
                  let icon, color, weight, bg;
                  if (scanPhaseIndex > idx) {
                    icon = <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '0.9rem' }}></i>;
                    color = 'var(--text-color, #1a1a1a)';
                    weight = '500';
                    bg = 'rgba(16, 185, 129, 0.05)';
                  } else if (scanPhaseIndex === idx) {
                    icon = <Spinner animation="border" size="sm" variant="primary" style={{ width: '12px', height: '12px', borderWidth: '1.8px' }} />;
                    color = '#3b82f6';
                    weight = '600';
                    bg = 'rgba(59, 130, 246, 0.08)';
                  } else {
                    icon = <i className="bi bi-circle text-muted" style={{ fontSize: '0.9rem' }}></i>;
                    color = 'var(--text-secondary, #718096)';
                    weight = '400';
                    bg = 'transparent';
                  }
                  return (
                    <div key={idx} className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: bg, transition: 'all 0.2s ease', border: scanPhaseIndex === idx ? '1px dashed rgba(59, 130, 246, 0.3)' : '1px solid transparent' }}>
                      <div style={{ width: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{icon}</div>
                      <span style={{ color, fontWeight: weight, fontSize: '0.78rem' }} className="font-monospace">{phaseName}</span>
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
                  <div className="text-center mb-4 position-relative py-3">
                    {/* SVG Radar animation */}
                    <div className="mx-auto position-relative mb-2" style={{ width: '80px', height: '80px' }}>
                      <div className="radar-pulse-ring"></div>
                      <div className="radar-pulse-ring-delayed"></div>
                      <div className="position-absolute top-50 start-50 translate-middle bg-primary rounded-circle d-flex align-items-center justify-content-center text-white shadow-lg" style={{ width: '48px', height: '48px', zIndex: 3 }}>
                        <i className="bi bi-globe fs-4"></i>
                      </div>
                    </div>
                    <h5 className="fw-bold mt-3 mb-1" style={{ color: 'var(--text-color, #1a1a1a)' }}>Target Asset Entry</h5>
                    <p className="text-muted small px-3 mb-0">Scan new subdomains and run high-intelligence surface recon sweeps across target hosts.</p>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted fw-semibold font-monospace">ENTER DOMAIN / SUBDOMAIN TARGET</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="e.g. portal.example.com" 
                      value={inputSubdomainName}
                      onChange={(e) => setInputSubdomainName(e.target.value)}
                      required
                      className="fs-6"
                      style={{ height: '48px', borderRadius: '12px', border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))' }}
                    />
                    <Form.Text className="text-muted small mt-2 d-block">
                      We will check if this asset exists in our active footprint registry before initiating discovery scanning.
                    </Form.Text>
                  </Form.Group>
                  
                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="w-100 py-2.5 mt-2 fw-semibold d-flex align-items-center justify-content-center gap-2" 
                    style={{ borderRadius: '12px', height: '48px' }}
                    disabled={!inputSubdomainName.trim()}
                  >
                    <span>Check Footprint Status</span>
                    <i className="bi bi-arrow-right-short fs-4"></i>
                  </Button>
                </Form>
              )}

              {/* Wizard Step 1.5: Confirm Rescan */}
              {wizardStep === "confirm_rescan" && (
                <div className="text-center py-2">
                  <div className="mx-auto mb-3 bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '64px', height: '64px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <i className="bi bi-shield-exclamation fs-2 text-warning"></i>
                  </div>
                  
                  <h5 className="fw-bold" style={{ color: 'var(--text-color, #1a1a1a)' }}>Host Exists In Footprint</h5>
                  
                  <div className="p-3 my-4 border rounded-3 text-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
                    <span className="small text-muted d-block mb-1">DUPLICATE ASSET MATCH</span>
                    <code className="text-warning fw-bold fs-6 font-monospace" style={{ wordBreak: 'break-all' }}>{scanTargetName}</code>
                  </div>

                  <p className="text-muted small mb-4">
                    This subdomain is already indexed and cataloged in your active security ledger. Do you want to run a complete refresh scan on this host?
                  </p>

                  <div className="d-flex gap-2">
                    <Button variant="outline-secondary" className="w-50 py-2.5 fw-semibold" onClick={() => setWizardStep("input_subdomain")} style={{ borderRadius: '12px' }}>
                      Cancel
                    </Button>
                    <Button variant="primary" className="w-50 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-1" onClick={() => runSimulatedScan(scanTargetName)} style={{ borderRadius: '12px' }}>
                      <i className="bi bi-activity"></i>
                      <span>Yes, Rescan</span>
                    </Button>
                  </div>
                </div>
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
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* GENERATE REPORT MODAL */}
      <Modal show={showReportModal} onHide={() => !isGenerating && setShowReportModal(false)} centered className="cyber-modal">
        <Modal.Header closeButton={!isGenerating} style={{ borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))' }}>
          <Modal.Title className="fw-bold font-monospace text-uppercase" style={{ fontSize: '1.05rem', letterSpacing: '0.5px' }}>
            {isGenerating ? (
              <span className="d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" variant="info" style={{ width: '12px', height: '12px', borderWidth: '1.8px' }} />
                <span>Assembling Intel Report</span>
              </span>
            ) : reportReady ? (
              <span>Report Compiled Successfully</span>
            ) : (
              <span>Compile Executive Security Report</span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center" style={{ backgroundColor: 'var(--body-bg, #fcfcfc)' }}>
          {isGenerating ? (
            <div className="py-4">
              <Spinner animation="grow" variant="info" className="mb-3 cyber-blink-node" style={{ width: '40px', height: '40px' }} />
              <h5 className="fw-semibold mb-2">Assembling Assets &amp; Vulnerabilities Data</h5>
              <div className="mb-3 px-4">
                <div className="d-flex justify-content-between mb-1 small text-muted font-monospace">
                  <span>sentinel_compiler.bin</span>
                  <span>{reportProgress}%</span>
                </div>
                <div className="progress" style={{ height: '10px', background: 'var(--input-border, rgba(0, 0, 0, 0.08))', borderRadius: '6px' }}>
                  <div className="progress-bar progress-bar-striped progress-bar-animated cyber-progress-bar" style={{ width: `${reportProgress}%`, borderRadius: '6px' }}></div>
                </div>
              </div>
              <p className="text-muted small mb-0">Structuring report schema &amp; layout coordinates...</p>
            </div>
          ) : reportReady ? (
            <div>
              <div className="mx-auto mb-3 bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '64px', height: '64px', border: '1px solid rgba(22, 163, 74, 0.25)' }}>
                <FiCheckCircle size={32} className="text-success cyber-glow-success" />
              </div>
              <h5 className="fw-bold" style={{ color: 'var(--text-color, #1a1a1a)' }}>Executive PDF Report Ready</h5>
              <p className="text-muted small px-3 mb-4">
                Vulnerabilities and asset maps compiled successfully. Click the button below to download the encrypted PDF file instantly.
              </p>
              
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" className="w-50 py-2.5 fw-semibold" onClick={() => setShowReportModal(false)} style={{ borderRadius: '12px' }}>
                  Close
                </Button>
                <Button 
                  variant="success" 
                  className="w-50 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 text-white shadow-lg" 
                  onClick={handleDownloadPDF} 
                  style={{ 
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <FiDownload size={16} />
                  <span>Download PDF</span>
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <FiDownload size={45} className="text-info mb-3" />
              <h5 className="fw-bold" style={{ color: 'var(--text-color, #1a1a1a)' }}>Generate Comprehensive Audit Report</h5>
              <p className="text-muted small mb-4">
                Download a premium executive PDF report listing all discovered vulnerabilities, open ports, and certificates grouped by severity levels.
              </p>
              <Button 
                variant="info" 
                className="text-white w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2" 
                onClick={handleGenerateReport} 
                style={{ 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
                }}
              >
                <span>Compile Report</span>
                <i className="bi bi-cpu fs-5"></i>
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* RUN SECURITY CHECK MODAL */}
      <Modal show={showCheckModal} onHide={() => !isChecking && setShowCheckModal(false)} centered>
        <Modal.Header closeButton={!isChecking}>
          <Modal.Title className="fw-semibold">Integrity Compliance Scan</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {!isChecking ? (
            <div className="text-center">
              <FiShield size={45} className="text-success mb-3" />
              <h5>Perform System Audit Check</h5>
              <p className="text-muted small">Validates SSL settings, exposed ports, framework compliance, and CVE logs across scanned targets.</p>
              <Button variant="success" className="w-100 mt-2" onClick={handleRunSecurityCheck} style={{ borderRadius: '10px' }}>
                Execute System Check
              </Button>
            </div>
          ) : (
            <div>
              <h5 className="fw-semibold mb-2 text-center">Executing Compliance Audit</h5>
              <div className="progress mb-3" style={{ height: '8px' }}>
                <div className="progress-bar bg-success progress-bar-striped progress-bar-animated" style={{ width: `${checkProgress}%` }}></div>
              </div>
              <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                {checkLogs.map((log, index) => (
                  <div key={index} className="text-success small font-monospace mb-1">
                    &gt; {log}
                  </div>
                ))}
              </div>
            </div>
          )}
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
