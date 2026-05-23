const API_HOST = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? ''  // Use Vite proxy in dev
  : 'http://127.0.0.1:8000';

export const API_BASE = API_HOST || 'http://127.0.0.1:8000';
export const AUTH_URL = `${API_HOST}/api/auth`;
export const ATTACK_SURFACE_URL = `${API_HOST}/api/attacksurface`;
export const TARGETS_URL = `${API_HOST}/api/targets`;
export const SCANS_URL = `${API_HOST}/api/scans`;
export const VULNERABILITIES_URL = `${API_HOST}/api/vulnerabilities`;
export const RECON_URL = `${API_HOST}/api/recon`;
export const TRIGGER_SCAN_URL = `${API_HOST}/api/attacksurface/scan`;
export const SCAN_STATUS_URL = `${API_HOST}/api/attacksurface/scan`;

export default API_BASE;
