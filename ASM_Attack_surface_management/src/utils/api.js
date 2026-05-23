import axios from "axios";
import { API_BASE, AUTH_URL, ATTACK_SURFACE_URL, SCANS_URL } from "./apiConfig";

const API_BASE_URL = `${AUTH_URL}/`;

const api = axios.create({
  baseURL: API_BASE_URL,
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
    const response = await api.post("register/", {
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
    const response = await api.post('login/', { email, password });

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

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

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
          `${API_BASE_URL}token/refresh/`,
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
        `${API_BASE_URL}logout/`,
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
    const response = await api.get("profile/");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch user profile" };
  }
};

export const checkAuth = async () => {
  try {
    const response = await api.get("check-auth/");
    return response.data;
  } catch (error) {
    return { authenticated: false };
  }
};

export const fetchAttackSurface = async (endpoint, orgId, pageUrl = null) => {
  const token = localStorage.getItem("accessToken");
  const url = pageUrl || `${ATTACK_SURFACE_URL}/${endpoint}/?org_id=${orgId}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchAllPages = async (endpoint, orgId) => {
  const baseUrl = `${ATTACK_SURFACE_URL}/${endpoint}/?org_id=${orgId}`;

  try {
    const first = await fetchAttackSurface(endpoint, orgId, baseUrl);
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
          fetchAttackSurface(endpoint, orgId, `${baseUrl}&page=${p}`).catch(() => null)
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

export const triggerScan = async (target, orgId = "1") => {
  const token = localStorage.getItem("accessToken");
  try {
    const response = await axios.post(
      `${ATTACK_SURFACE_URL}/scan/`,
      { target, org_id: orgId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    const data = error.response?.data || {};
    throw { message: data.detail || data.error || data.message || "Failed to trigger scan" };
  }
};

export const getScanStatus = async (scanId) => {
  const token = localStorage.getItem("accessToken");
  try {
    const response = await axios.get(
      `${ATTACK_SURFACE_URL}/scan/${scanId}/`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to get scan status" };
  }
};

export default api;
