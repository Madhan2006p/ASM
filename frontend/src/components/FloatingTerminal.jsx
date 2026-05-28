import React, { useState, useRef, useEffect } from "react";
import { useScan } from "../context/ScanContext";

const FloatingTerminal = () => {
  const { scanState, stopScan } = useScan();
  const [minimized, setMinimized] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scanState.logs.length]);

  if (!scanState.isScanning && scanState.logs.length === 0) return null;

  const phaseColors = {
    subdomains_done: "#4ade80",
    endpoints_done: "#38bdf8",
    ports_done: "#facc15",
    technologies_done: "#a78bfa",
    vulnerabilities_done: "#f87171",
    ssl_done: "#34d399",
    email_done: "#fb923c",
  };

  const phaseLabels = {
    subdomains_done: "Subdomains",
    endpoints_done: "Endpoints",
    ports_done: "Ports",
    technologies_done: "Tech",
    vulnerabilities_done: "Vulns",
    ssl_done: "SSL",
    email_done: "Email",
  };

  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 9999,
          background: "#0f172a",
          color: "#38bdf8",
          border: "1px solid #1e293b",
          borderRadius: 8,
          padding: "8px 16px",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse 1s infinite" }} />
        Scan: {scanState.target} ({scanState.progress}%)
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        width: 480,
        maxHeight: 360,
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 8,
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 12px",
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          cursor: "move",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: scanState.isScanning ? "#4ade80" : "#94a3b8", display: "inline-block" }} />
          <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>
            {scanState.isScanning ? "Scan Running" : "Scan Done"} — {scanState.target}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{scanState.progress}%</span>
          <button
            onClick={() => setMinimized(true)}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, padding: "0 4px" }}
          >_</button>
          <button
            onClick={stopScan}
            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14, padding: "0 4px" }}
          >x</button>
        </div>
      </div>

      {/* Phase badges */}
      <div style={{ display: "flex", gap: 4, padding: "6px 12px", borderBottom: "1px solid #1e293b", flexWrap: "wrap" }}>
        {Object.entries(phaseColors).map(([field, color]) => (
          <span
            key={field}
            style={{
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              background: scanState.phasesDone[field] ? color : "#1e293b",
              color: scanState.phasesDone[field] ? "#0f172a" : "#64748b",
              transition: "all 0.3s",
            }}
          >
            {scanState.phasesDone[field] ? "✓ " : "○ "}{phaseLabels[field]}
          </span>
        ))}
      </div>

      {/* Logs */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 12px",
          background: "#0f172a",
        }}
      >
        {scanState.logs.map((log, i) => {
          const colorMap = { sys: "#94a3b8", success: "#4ade80", warn: "#facc15", crit: "#f87171", info: "#38bdf8" };
          return (
            <div key={i} style={{ color: colorMap[log.type] || "#38bdf8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              <span style={{ color: "#64748b" }}>[{log.time}]</span> {log.text}
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#1e293b" }}>
        <div
          style={{
            height: "100%",
            width: `${scanState.progress}%`,
            background: "linear-gradient(90deg, #38bdf8, #4ade80)",
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
};

export default FloatingTerminal;
