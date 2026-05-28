import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { triggerScan, getScanStatus, fetchAllPages } from "../utils/api";

const ScanContext = createContext(null);

export const ScanProvider = ({ children }) => {
  const [scanState, setScanState] = useState({
    isScanning: false,
    target: "",
    progress: 0,
    phase: "",
    scanId: null,
    phasesDone: {},
    logs: [],
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const pollRef = useRef(null);
  const prevPhasesRef = useRef({});

  const addLog = useCallback((text, type = "info") => {
    setScanState(prev => ({
      ...prev,
      logs: [...prev.logs, { text, type, time: new Date().toLocaleTimeString() }],
    }));
  }, []);

  const startScan = useCallback(async (target) => {
    setScanState(prev => ({
      ...prev,
      isScanning: true,
      target,
      progress: 0,
      phase: "Initiating scan via backend...",
      scanId: null,
      phasesDone: {},
      logs: [{ text: `[+] Scan initiated for ${target}`, type: "sys", time: new Date().toLocaleTimeString() }],
    }));
    prevPhasesRef.current = {};

    try {
      const result = await triggerScan(target);
      const scanId = result.scan_id;
      try {
        localStorage.setItem("activeScanId", String(scanId));
      } catch {
        // ignore storage failures
      }

      addLog(`[+] Scan submitted (ID: ${scanId})`, "success");

      setScanState(prev => ({ ...prev, scanId }));

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const status = await getScanStatus(scanId);
          const progress = status.progress || 0;
          const phases = [
            { field: "subdomains_done", label: "Subdomain Discovery", log: "[+] Subdomain enumeration complete" },
            { field: "endpoints_done", label: "Live Host Probing", log: "[+] Endpoint probing complete" },
            { field: "ports_done", label: "Port Scanning", log: "[+] Port scanning complete" },
            { field: "technologies_done", label: "Technology Detection", log: "[+] Technology detection complete" },
            { field: "vulnerabilities_done", label: "Vulnerability Scanning", log: "[+] Vulnerability scanning complete" },
            { field: "ssl_done", label: "SSL Certificate Check", log: "[+] SSL check complete" },
            { field: "email_done", label: "Email Security Check", log: "[+] Email security check complete" },
            { field: "directories_done", label: "Directory Scanning", log: "[+] Directory scanning complete" },
          ];

          const phasesDone = {};
          for (const p of phases) {
            if (status[p.field]) {
              phasesDone[p.field] = true;
              if (!prevPhasesRef.current[p.field]) {
                addLog(p.log, "success");
                prevPhasesRef.current[p.field] = true;
              }
            }
          }

          setScanState(prev => ({
            ...prev,
            progress,
            phasesDone,
            phase: status.status === "completed" ? "Scan completed!" : `Progress: ${progress}%`,
          }));

          if (status.status === "completed" || progress >= 100 || attempts > 400) {
            clearInterval(interval);
            pollRef.current = null;
            addLog("[+] Scan completed successfully!", "success");
            setScanState(prev => ({ ...prev, progress: 100, phase: "Scan completed!" }));
            setRefreshKey(k => k + 1);
            return true;
          }
        } catch {
          if (attempts > 400) {
            clearInterval(interval);
            pollRef.current = null;
            addLog("[!] Scan polling timed out", "crit");
          }
        }
      }, 3000);
      pollRef.current = interval;
    } catch (err) {
      const msg = err?.message || "Backend scan failed. Ensure the server is running.";
      addLog(`[!] ${msg}`, "crit");
      setScanState(prev => ({
        ...prev,
        isScanning: false,
        phase: "Scan failed - server unavailable",
      }));
    }
  }, [addLog]);

  const stopScan = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setScanState({
      isScanning: false,
      target: "",
      progress: 0,
      phase: "",
      scanId: null,
      phasesDone: {},
      logs: [],
    });
  }, []);

  const refreshPhaseData = useCallback(async (phasesDone) => {
    const activeScanId = scanState.scanId || localStorage.getItem("activeScanId");
    const fetches = [];
    if (phasesDone.subdomains_done) fetches.push(fetchAllPages("subdomains", activeScanId).catch(() => []));
    if (phasesDone.endpoints_done) fetches.push(fetchAllPages("endpoints", activeScanId).catch(() => []));
    if (phasesDone.ports_done) fetches.push(fetchAllPages("open-ports", activeScanId).catch(() => []));
    if (phasesDone.technologies_done) fetches.push(fetchAllPages("technologies", activeScanId).catch(() => []));
    if (phasesDone.vulnerabilities_done) fetches.push(fetchAllPages("vulnerabilities", activeScanId).catch(() => []));
    if (phasesDone.ssl_done) fetches.push(fetchAllPages("ssl-certificates", activeScanId).catch(() => []));
    if (phasesDone.email_done) fetches.push(fetchAllPages("email-security", activeScanId).catch(() => []));
    if (phasesDone.directories_done) fetches.push(fetchAllPages("directories", activeScanId).catch(() => []));
    if (fetches.length > 0) {
      await Promise.all(fetches);
    }
  }, [scanState.scanId]);

  return (
    <ScanContext.Provider value={{ scanState, startScan, stopScan, refreshPhaseData, addLog, refreshKey }}>
      {children}
    </ScanContext.Provider>
  );
};

export const useScan = () => {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScan must be used within ScanProvider");
  return ctx;
};

export default ScanContext;
