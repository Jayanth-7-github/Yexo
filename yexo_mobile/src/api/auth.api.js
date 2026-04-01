import axios from "./axios";
import { ENDPOINTS } from "../constants/endpoints";

export const authAPI = {
  // Login
  login: async (credentials) => {
    const response = await axios.post(ENDPOINTS.LOGIN, credentials);
    return response.data;
  },

  // Register
  register: async (userData) => {
    const response = await axios.post(ENDPOINTS.REGISTER, userData);
    return response.data;
  },

  // Get current user
  me: async () => {
    const response = await axios.get(ENDPOINTS.ME);
    return response.data;
  },

  // Refresh token
  refresh: async (refreshToken) => {
    const response = await axios.post(ENDPOINTS.REFRESH, { refreshToken });
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await axios.post(ENDPOINTS.LOGOUT);
    return response.data;
  },
};
