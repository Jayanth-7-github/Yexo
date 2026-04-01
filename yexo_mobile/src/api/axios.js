import axios from "axios";
import { API_URL } from "@env";
import storageService from "../services/storage.service";

// Create axios instance with cookie support
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable sending cookies with requests
});

// Request interceptor - add token from storage as fallback
axiosInstance.interceptors.request.use(
  async (config) => {
    // Try to get token from storage and add to headers as fallback
    try {
      const token = await storageService.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log("Could not get token from storage:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    // Log response headers for debugging (especially for logout)
    if (response.config.url?.includes("logout")) {
      console.log("Logout response headers:", response.headers);
      console.log("Set-Cookie header:", response.headers["set-cookie"]);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      console.log("Unauthorized request, cookies may have expired");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
