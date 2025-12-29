import axios from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../utils/authTokens";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://yexo-backend.onrender.com";

// Dedicated instance (so interceptors don't affect external calls).
export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach access token on every request.
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("Missing refresh token");

  // Use a separate request without interceptors to avoid recursion.
  const response = await axios.post(
    `${API_BASE_URL}/api/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" }, timeout: 30000 }
  );

  // Backend shape: { success: true, message, data: { accessToken, refreshToken } }
  const tokens = response?.data?.data;
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    throw new Error("Invalid refresh response");
  }

  setTokens(tokens);
  return tokens.accessToken;
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;

    if (!original || status !== 401 || original._retry) {
      throw error;
    }

    // Avoid refresh loop for auth endpoints.
    const url = String(original.url || "");
    if (
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/register") ||
      url.includes("/api/auth/refresh")
    ) {
      throw error;
    }

    original._retry = true;

    try {
      refreshPromise = refreshPromise || refreshAccessToken();
      const newAccessToken = await refreshPromise;
      refreshPromise = null;

      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newAccessToken}`;

      return http.request(original);
    } catch (refreshError) {
      refreshPromise = null;
      clearTokens();
      throw refreshError;
    }
  }
);

export function getApiBaseUrl() {
  return API_BASE_URL;
}
