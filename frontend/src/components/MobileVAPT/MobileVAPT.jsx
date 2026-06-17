import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, CloudUpload, ShieldCheck, Activity, Trash2, X, AlertCircle, FileText, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PageHeaderCard from '../common/PageHeaderCard';
import './MobileVAPT.css';
import { api } from '../../utils/api';

const MobileVAPT = () => {
  const [dashboard, setDashboard] = useState({
    total_scans: 0,
    completed_scans: 0,
    total_findings: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  });

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activePollScanId, setActivePollScanId] = useState(null);
  const [activeTrend, setActiveTrend] = useState('both');

  // Detail Modal State
  const [selectedScan, setSelectedScan] = useState(null);
  const [scanDetail, setScanDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fileInputRef = useRef(null);

  // Load dashboard & history
  const loadDashboardData = async () => {
    try {
      const data = await api.get('/api/mobile-vapt/dashboard/');
      setDashboard(data);
    } catch (e) {
      console.error("Failed to load VAPT dashboard", e);
    }
  };

  const loadHistoryData = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.get('/api/mobile-vapt/history/?page_size=50');
      setHistory(data.results || []);
    } catch (e) {
      console.error("Failed to load VAPT history", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadHistoryData();
  }, []);

  // Poll scan status if a scan is in progress
  useEffect(() => {
    if (!activePollScanId) return;

    let intervalId;
    const checkStatus = async () => {
      try {
        const data = await api.get(`/api/mobile-vapt/scan-status/${activePollScanId}/`);
        if (data.status === 'completed' || data.status === 'scan_failed' || data.status === 'report_failed') {
          setActivePollScanId(null);
          loadDashboardData();
          loadHistoryData();
        } else {
          // Keep polling, update status in the local history array
          setHistory(prev => prev.map(item => item.id === activePollScanId ? { ...item, status: data.status } : item));
        }
      } catch (err) {
        console.error("Failed to check status", err);
        setActivePollScanId(null);
      }
    };

    intervalId = setInterval(checkStatus, 3000);
    return () => clearInterval(intervalId);
  }, [activePollScanId]);

  // Check if any scan in history is still processing on initial load
  useEffect(() => {
    const activeScan = history.find(s => ['uploaded', 'uploaded_to_mobsf', 'scanning'].includes(s.status));
    if (activeScan) {
      setActivePollScanId(activeScan.id);
    }
  }, [history]);

  // Upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await api.post('/api/mobile-vapt/upload/', formData);
      setActivePollScanId(result.id);
      loadHistoryData();
    } catch (err) {
      console.error("Upload failed", err);
      setUploadError(err.message || "Failed to upload binary.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const takedownData = [
    { name: 'Jan', detected: 0, takedowns: 0 },
    { name: 'Feb', detected: 0, takedowns: 0 },
    { name: 'Mar', detected: 0, takedowns: 0 },
    { name: 'Apr', detected: 0, takedowns: 0 },
    { name: 'May', detected: 0, takedowns: 0 },
    { name: 'Jun', detected: 0, takedowns: 0 },
    { name: 'Jul', detected: 0, takedowns: 0 },
  ];

  const platformData = [
    { name: 'Google Play', value: 0, color: '#10B981' },
    { name: 'Apple App Store', value: 0, color: '#3B82F6' },
    { name: 'Third-Party Stores', value: 0, color: '#F59E0B' },
  ];

  const headerActions = (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".apk,.aab,.ipa" 
        onChange={handleFileUpload} 
      />
      <button 
        className="mv-scan-btn" 
        onClick={triggerFileSelect}
        disabled={uploading || !!activePollScanId}
      >
        <CloudUpload size={16} />
        {uploading ? (
          <>
            <RefreshCw size={14} className="spin" />
            Uploading Binary...
          </>
        ) : activePollScanId ? (
          <>
            <RefreshCw size={14} className="spin" />
            Scan Processing...
          </>
        ) : 'Scan Binary (APK / IPA / AAB)'}
      </button>
      {uploadError && (
        <div style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', position: 'absolute', top: '100%', right: 0, whiteSpace: 'nowrap' }}>
          <AlertCircle size={14} />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );

  // Delete handler
  const handleDeleteScan = async (scanId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this scan history?")) return;
    try {
      await api.delete(`/api/mobile-vapt/delete-scan/${scanId}/`);
      loadDashboardData();
      loadHistoryData();
      if (selectedScan && selectedScan.id === scanId) {
        setSelectedScan(null);
        setScanDetail(null);
      }
    } catch (err) {
      console.error("Failed to delete scan", err);
      alert("Failed to delete scan.");
    }
  };

  // Click row -> Open Detail
  const handleRowClick = async (scan) => {
    setSelectedScan(scan);
    setLoadingDetail(true);
    setScanDetail(null);
    try {
      const data = await api.get(`/api/mobile-vapt/scan-detail/${scan.id}/`);
      setScanDetail(data);
    } catch (err) {
      console.error("Failed to load scan details", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="mobile-vapt-container">
      
      <PageHeaderCard
        badgeText="MOBILE SECURITY"
        title="Mobile VAPT"
        subtitle="Automated Static and Dynamic security analysis of iOS and Android binaries."
        actions={headerActions}
        stats={[
          { label: 'Apps Scanned', value: dashboard.total_scans.toString(), subtext: 'Total binaries' },
          { label: 'Critical / High', value: ((dashboard.critical || 0) + (dashboard.high || 0)).toString(), subtext: 'Vulnerabilities' },
          { label: 'Medium / Low', value: ((dashboard.medium || 0) + (dashboard.low || 0)).toString(), subtext: 'Warnings' },
          { 
            label: 'Avg Score', 
            value: history.length > 0 ? (history.reduce((sum, h) => sum + parseInt(h.score || 50), 0) / history.length).toFixed(0) : '—', 
            subtext: '/ 100 overall score' 
          },
        ]}
      />

      {/* Top Split Layout */}
      <div className="mv-top-grid">
        
        {/* Left Card: Area Chart */}
        <div className="mv-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>Detection & Takedown Trends</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Fake apps discovered vs. successfully removed (2024)</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: activeTrend === 'both' || activeTrend === 'detected' ? 1 : 0.4, transition: 'opacity 0.2s' }}
                onClick={() => setActiveTrend(activeTrend === 'detected' ? 'both' : 'detected')}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }}></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fake Apps</span>
              </div>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: activeTrend === 'both' || activeTrend === 'takedowns' ? 1 : 0.4, transition: 'opacity 0.2s' }}
                onClick={() => setActiveTrend(activeTrend === 'takedowns' ? 'both' : 'takedowns')}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }}></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Removed Apps</span>
              </div>
            </div>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={takedownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDetected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTakedown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '0.85rem', fontWeight: '600' }}
                />
                {(activeTrend === 'both' || activeTrend === 'detected') && (
                  <Area type="monotone" dataKey="detected" name="Detected Fakes" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDetected)" />
                )}
                {(activeTrend === 'both' || activeTrend === 'takedowns') && (
                  <Area type="monotone" dataKey="takedowns" name="Total Takedowns" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorTakedown)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Card: Pie Chart */}
        <div className="mv-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>Platform Distribution</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Fake apps by app store origin</p>
          </div>
          <div style={{ flex: 1, position: 'relative', minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformData.every(d => d.value === 0) ? [{ value: 1, color: 'rgba(150,150,150,0.1)' }] : platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {(platformData.every(d => d.value === 0) ? [{ value: 1, color: 'rgba(150,150,150,0.1)' }] : platformData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '0.85rem', fontWeight: '600' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {platformData.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{item.name}</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
        
      </div>

      {/* Bottom Panel: Recent Audits */}
      <div className="mv-panel">
        <div className="mv-panel-header" style={{ borderBottom: '1px solid var(--border-color)', margin: 0 }}>
          <Activity size={18} className="text-orange" />
          <h2 className="mv-panel-title">Recent Mobile App Audits</h2>
        </div>
        <div className="mv-table-container">
          <table className="mv-table">
            <thead>
              <tr>
                <th>APP NAME</th>
                <th>PLATFORM</th>
                <th>VERSION</th>
                <th>SCORE</th>
                <th>VULNERABILITY STATUS</th>
                <th>LAST SCANNED</th>
                <th style={{ textAlign: 'right', paddingRight: '2rem' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {history.map((scan) => (
                <tr 
                  key={scan.id} 
                  onClick={() => handleRowClick(scan)} 
                  style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                >
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold' }}>
                    {scan.app_name || scan.file_name}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', height: '100%' }}>
                    {scan.source === 'android' ? (
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="#3DDC84">
                        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4483-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997zm-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997zm11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.022 3.503C15.5902 8.244 13.8533 7.8512 12 7.8512s-3.5902.3928-5.1371 1.0985l-2.022-3.503a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 384 512" width="20" height="22" fill="var(--text-primary)">
                        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                      </svg>
                    )}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace' }}>
                    {scan.version_name || '—'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span 
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        background: parseInt(scan.score) >= 80 ? 'rgba(34,197,94,0.1)' : parseInt(scan.score) >= 50 ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,110,0.1)',
                        color: parseInt(scan.score) >= 80 ? '#22C55E' : parseInt(scan.score) >= 50 ? '#F97316' : '#EF4444'
                      }}
                    >
                      {scan.score || '50'}/100
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        background: scan.status === 'completed' ? 'rgba(34,197,94,0.1)' : ['scan_failed', 'report_failed'].includes(scan.status) ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                        color: scan.status === 'completed' ? '#22C55E' : ['scan_failed', 'report_failed'].includes(scan.status) ? '#EF4444' : '#3B82F6'
                      }}
                    >
                      {scan.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {new Date(scan.updated_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', paddingRight: '2rem' }}>
                    <button 
                      onClick={(e) => handleDeleteScan(scan.id, e)} 
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '0.25rem'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && !loadingHistory && (
            <div className="mv-empty-state-container">
              <div className="mv-empty-state-content">
                <span>No scans found. Upload a binary to begin.</span>
              </div>
            </div>
          )}
          {loadingHistory && (
            <div className="mv-empty-state-container" style={{ padding: '3rem 0' }}>
              <div className="empty-state-content" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={18} className="animate-spin" />
                <span>Loading scans history...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedScan && (
        <div 
          className="mv-modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={() => setSelectedScan(null)}
        >
          <div 
            className="mv-modal-content"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '1000px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-main)'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {selectedScan.app_name || selectedScan.file_name}
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Package: {selectedScan.package_name || 'N/A'} • Version: {selectedScan.version_name || 'N/A'} • Platform: {selectedScan.source}
                </p>
              </div>
              <button 
                onClick={() => setSelectedScan(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {loadingDetail ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', gap: '1rem' }}>
                  <RefreshCw size={36} className="animate-spin text-blue" />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Parsing scan findings and reports...</span>
                </div>
              ) : scanDetail ? (
                <div>
                  {/* Summary row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'var(--bg-main)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Security Score</span>
                      <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: '800', color: '#22C55E' }}>{scanDetail.scan.score}/100</h4>
                    </div>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'var(--bg-main)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Total Vulnerabilities</span>
                      <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: '800', color: '#EF4444' }}>{scanDetail.total_findings}</h4>
                    </div>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'var(--bg-main)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Permissions Audited</span>
                      <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: '800', color: '#3B82F6' }}>{scanDetail.permissions.length}</h4>
                    </div>
                  </div>

                  {/* Findings Section */}
                  <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <Layers size={18} className="text-orange" />
                    Scan Findings
                  </h4>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', marginBottom: '2rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>SEVERITY</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>VULNERABILITY</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>CATEGORY</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>LOCATION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanDetail.findings.map((f) => (
                          <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span 
                                style={{
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: '700',
                                  background: f.severity === 'CRITICAL' ? 'rgba(239,68,110,0.1)' : f.severity === 'HIGH' ? 'rgba(249,115,22,0.1)' : f.severity === 'MEDIUM' ? 'rgba(234,179,8,0.1)' : 'rgba(59,130,246,0.1)',
                                  color: f.severity === 'CRITICAL' ? '#EF4444' : f.severity === 'HIGH' ? '#F97316' : f.severity === 'MEDIUM' ? '#EAB308' : '#3B82F6'
                                }}
                              >
                                {f.severity}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{f.vulnerability}</div>
                              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>{f.description}</div>
                              {f.recommendation && (
                                <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                  Fix: {f.recommendation}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                              {f.category}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                              {f.file_path || '—'}
                            </td>
                          </tr>
                        ))}
                        {scanDetail.findings.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              No findings recorded for this binary.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Permissions Section */}
                  <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <Smartphone size={18} className="text-blue" />
                    App Permissions Analysis
                  </h4>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>PERMISSION</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>STATUS</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>DESCRIPTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanDetail.permissions.map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '700', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                              {p.permission_name}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span 
                                style={{
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: '700',
                                  background: p.status === 'dangerous' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                  color: p.status === 'dangerous' ? '#EF4444' : '#10B981',
                                  textTransform: 'uppercase'
                                }}
                              >
                                {p.status || 'unknown'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                              {p.description || '—'}
                            </td>
                          </tr>
                        ))}
                        {scanDetail.permissions.length === 0 && (
                          <tr>
                            <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              No permission manifest data parsed.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Error loading details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spacer to guarantee bottom padding renders correctly */}
      <div style={{ height: '3rem', flexShrink: 0, width: '100%' }} />
    </div>
  );
};

export default MobileVAPT;
