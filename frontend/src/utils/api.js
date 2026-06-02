import axios from "axios";
import { API_BASE, ATTACK_SURFACE_URL, SCANS_URL, TOOLS_HEALTH_URL, CLEAR_DB_URL, FARADAY_PIPELINE_URL } from "./apiConfig";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const register = async (formData) => {
  try {
    const response = await api.post("/api/auth/register/", {
      username: formData.name || formData.email?.split('@')[0],
      name: formData.name,
      email: formData.email,
      phone: formData.phone || "",
      organization: formData.organization || "",
      password: formData.password,
      confirm_password: formData.confirmPassword,
    });

    if (response.data.tokens) {
      localStorage.setItem("accessToken", response.data.tokens.access);
      localStorage.setItem("refreshToken", response.data.tokens.refresh);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('userLogin'));
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Registration failed" };
  }
};

export const login = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login/', { email, password });

    if (response.data.tokens) {
      localStorage.setItem('accessToken', response.data.tokens.access);
      localStorage.setItem('refreshToken', response.data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('userLogin'));
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Login failed' };
  }
};

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const accessToken = localStorage.getItem('accessToken');

        if (!refreshToken || !accessToken) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post(
          `${API_BASE}/api/auth/token/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const { access } = response.data;

        localStorage.setItem('accessToken', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      await axios.post(
        `${API_BASE}/api/auth/logout/`,
        { refresh: refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event('userLogout'));
  }
};

export const getProfile = async () => {
  try {
    const response = await api.get("/api/auth/profile/");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch user profile" };
  }
};

export const checkAuth = async () => {
  try {
    const response = await api.get("/api/auth/check-auth/");
    return response.data;
  } catch (error) {
    return { authenticated: false };
  }
};

export const fetchFaradayFindings = async () => {
  const response = await api.get(`${ATTACK_SURFACE_URL}/faraday-findings/`);
  return response.data;
};

export const fetchFaradaySummary = async () => {
  const response = await api.get(`${ATTACK_SURFACE_URL}/faraday-summary/`);
  return response.data;
};

export const sendVulnerabilitiesToFaraday = async (scanId) => {
  const response = await api.post(`${ATTACK_SURFACE_URL}/vulnerabilities/send-to-faraday/`, {
    scan_id: scanId,
  });
  return response.data;
};

const buildAttackSurfaceUrl = (endpoint, scanId = null) => {
  const params = new URLSearchParams();
  if (scanId) params.set("scan", String(scanId));
  const qs = params.toString();
  return `${ATTACK_SURFACE_URL}/${endpoint}/${qs ? `?${qs}` : ''}`;
};

export const fetchAttackSurface = async (endpoint, pageUrl = null, scanId = null) => {
  const url = pageUrl || buildAttackSurfaceUrl(endpoint, scanId);

  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchAllPages = async (endpoint, scanId = null) => {
  const baseUrl = buildAttackSurfaceUrl(endpoint, scanId);

  try {
    const first = await fetchAttackSurface(endpoint, baseUrl, scanId);
    if (!first.results || first.count === 0) return [];

    const pageSize = first.results.length;
    const totalPages = Math.ceil(first.count / pageSize);
    if (totalPages <= 1) return first.results;

    const results = [...first.results];
    const pageNumbers = [];
    for (let p = 2; p <= totalPages; p++) pageNumbers.push(p);

    const batchSize = 10;
    for (let i = 0; i < pageNumbers.length; i += batchSize) {
      const batch = pageNumbers.slice(i, i + batchSize);
      const pages = await Promise.all(
        batch.map(p =>
          fetchAttackSurface(endpoint, `${baseUrl}&page=${p}`).catch(() => null)
        )
      );
      for (const page of pages) {
        if (page?.results) results.push(...page.results);
      }
    }

    return results;
  } catch {
    return [];
  }
};

export const triggerScan = async (target) => {
  try {
    const response = await api.post(`${ATTACK_SURFACE_URL}/scan/`, { target });
    return response.data;
  } catch (error) {
    const data = error.response?.data || {};
    throw { message: data.detail || data.error || data.message || "Failed to trigger scan" };
  }
};

export const getScanStatus = async (scanId) => {
  try {
    const response = await api.get(`${ATTACK_SURFACE_URL}/scan/${scanId}/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to get scan status" };
  }
};

export const addMonitoredDomain = async (payload) => {
  // Remove org_id from payload — backend derives it from user membership
  const { org_id, ...cleanPayload } = payload;
  const response = await api.post(`${ATTACK_SURFACE_URL}/domains/`, cleanPayload);
  if (response.data?.scan_id) {
    localStorage.setItem("activeScanId", String(response.data.scan_id));
  }
  return response.data;
};

export const fetchMonitoredDomains = async () => {
  const response = await api.get(`${ATTACK_SURFACE_URL}/domains/`);
  return response.data;
};

export const quickScanDomain = async (domain) => {
  const response = await api.post(`${ATTACK_SURFACE_URL}/domains/quick-scan/`, { domain });
  if (response.data?.scan_id) {
    localStorage.setItem("activeScanId", String(response.data.scan_id));
  }
  return response.data;
};

export const fetchToolsHealth = async () => {
  try {
    const response = await api.get(`${TOOLS_HEALTH_URL}/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch tools health" };
  }
};

export const clearDatabase = async () => {
  try {
    const response = await api.delete(`${CLEAR_DB_URL}/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to clear database" };
  }
};


// ─── Surface Web Monitoring API ───────────────────────────────────────────────
import { SURFACE_MONITORING_URL } from "./apiConfig";

export const surfaceMonitoringApi = {
  // Configs
  getConfigs: async () => {
    const response = await api.get(`${SURFACE_MONITORING_URL}/configs/`);
    return response.data;
  },
  createConfig: async (data) => {
    const response = await api.post(`${SURFACE_MONITORING_URL}/configs/`, data);
    return response.data;
  },
  updateConfig: async (id, data) => {
    const response = await api.patch(`${SURFACE_MONITORING_URL}/configs/${id}/`, data);
    return response.data;
  },
  deleteConfig: async (id) => {
    const response = await api.delete(`${SURFACE_MONITORING_URL}/configs/${id}/`);
    return response.data;
  },
  discoverRepos: async (configId) => {
    const response = await api.post(`${SURFACE_MONITORING_URL}/configs/${configId}/discover/`);
    return response.data;
  },

  // Repos
  getRepos: async (configId = null) => {
    const params = configId ? { config: configId } : {};
    const response = await api.get(`${SURFACE_MONITORING_URL}/repos/`, { params });
    return response.data;
  },
  scanRepo: async (repoId) => {
    const response = await api.post(`${SURFACE_MONITORING_URL}/repos/${repoId}/scan/`);
    return response.data;
  },
  scanAllRepos: async () => {
    const response = await api.post(`${SURFACE_MONITORING_URL}/repos/scan_all/`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get(`${SURFACE_MONITORING_URL}/repos/stats/`);
    return response.data;
  },

  // Scans
  getScans: async (repoId = null) => {
    const params = repoId ? { repo: repoId } : {};
    const response = await api.get(`${SURFACE_MONITORING_URL}/scans/`, { params });
    return response.data;
  },
  addRepo: async (fullName) => {
    const response = await api.post(`${SURFACE_MONITORING_URL}/repos/add_repo/`, { full_name: fullName });
    return response.data;
  },
  pollEvents: async (repoId) => {
    const response = await api.post(`${SURFACE_MONITORING_URL}/repos/${repoId}/poll_events/`);
    return response.data;
  },

  // Events
  getEvents: async (repoId = null, type = null) => {
    const params = {};
    if (repoId) params.repo = repoId;
    if (type) params.type = type;
    const response = await api.get(`${SURFACE_MONITORING_URL}/events/`, { params });
    return response.data;
  },
};

export const featureApi = {
  // List all available features
  listFeatures: async () => {
    const response = await api.get(`${API_BASE}/api/auth/features/`);
    return response.data;
  },
  // Get a user's granted features
  getUserFeatures: async (userId) => {
    const response = await api.get(`${API_BASE}/api/auth/admin/users/${userId}/features/`);
    return response.data;
  },
  // Give a feature to a user
  giveFeature: async (userId, featureId) => {
    const response = await api.post(`${API_BASE}/api/auth/admin/users/${userId}/features/`, {
      action: "give",
      feature_id: featureId,
    });
    return response.data;
  },
  // Take back a feature from a user
  takeFeature: async (userId, featureId) => {
    const response = await api.post(`${API_BASE}/api/auth/admin/users/${userId}/features/`, {
      action: "take",
      feature_id: featureId,
    });
    return response.data;
  },
};



export default api;
