import { create } from "zustand";
import { loginApi, logoutApi, meApi, registerApi } from "../api/auth";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../utils/authTokens";

function extractMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    "Something went wrong"
  );
}

export const useAuthStore = create((set, get) => ({
  user: null,
  isBootstrapping: true,
  isAuthenticated: false,
  error: null,

  bootstrap: async () => {
    set({ isBootstrapping: true, error: null });
    const token = getAccessToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isBootstrapping: false });
      return;
    }

    try {
      const res = await meApi();
      set({
        user: res?.data || null,
        isAuthenticated: true,
        isBootstrapping: false,
      });
    } catch (err) {
      clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isBootstrapping: false,
        error: extractMessage(err),
      });
    }
  },

  login: async ({ username, password }) => {
    set({ error: null });
    try {
      const res = await loginApi({ username, password });
      const data = res?.data;
      if (!data?.accessToken || !data?.refreshToken) {
        throw new Error("Invalid login response");
      }
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      set({ user: data.user || null, isAuthenticated: true });
      return true;
    } catch (err) {
      set({ error: extractMessage(err), isAuthenticated: false });
      return false;
    }
  },

  register: async ({ username, password, email, phoneNumber }) => {
    set({ error: null });
    try {
      const res = await registerApi({ username, password, email, phoneNumber });
      const data = res?.data;
      if (!data?.accessToken || !data?.refreshToken) {
        throw new Error("Invalid register response");
      }
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      set({ user: data.user || null, isAuthenticated: true });
      return true;
    } catch (err) {
      set({ error: extractMessage(err), isAuthenticated: false });
      return false;
    }
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await logoutApi(refreshToken);
    } catch {
      // ignore
    }
    clearTokens();
    set({ user: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
