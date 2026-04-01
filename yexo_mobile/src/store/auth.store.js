import { create } from "zustand";
import { authAPI } from "../api/auth.api";
import storageService from "../services/storage.service";
import socketService from "../services/socket.service";

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // Set user
  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  // Set token
  setToken: (token) => {
    set({ token });
  },

  // Login
  login: async (credentials) => {
    try {
      const response = await authAPI.login(credentials);

      // Handle different response structures
      const data = response.data || response;
      const accessToken =
        data.accessToken || data.token || data.data?.accessToken;
      const user = data.user || data.data?.user;

      if (!user) {
        console.error("Invalid login response:", data);
        return {
          success: false,
          error: "Invalid response from server",
        };
      }

      // Save token and user data
      if (accessToken) {
        await storageService.saveToken(accessToken);
      }
      await storageService.saveUser(user);

      set({
        user: user,
        token: accessToken || null,
        isAuthenticated: true,
      });

      console.log("Login successful, using cookie-based authentication");

      // Connect socket after login
      await socketService.connect();

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      console.error("Login error response:", error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  },

  // Register
  register: async (userData) => {
    try {
      const response = await authAPI.register(userData);

      // Handle different response structures
      const data = response.data || response;
      const accessToken =
        data.accessToken || data.token || data.data?.accessToken;
      const user = data.user || data.data?.user;

      if (!user) {
        console.error("Invalid register response:", data);
        return {
          success: false,
          error: "Invalid response from server",
        };
      }

      // Save token and user data
      if (accessToken) {
        await storageService.saveToken(accessToken);
      }
      await storageService.saveUser(user);

      set({
        user: user,
        token: accessToken || null,
        isAuthenticated: true,
      });

      console.log("Registration successful, using cookie-based authentication");

      // Connect socket after register
      await socketService.connect();

      return { success: true };
    } catch (error) {
      console.error("Register error:", error);
      console.error("Register error response:", error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || "Registration failed",
      };
    }
  },

  // Load user from storage
  loadUser: async () => {
    try {
      set({ isLoading: true });

      const token = await storageService.getToken();
      const user = await storageService.getUser();

      if (token && user) {
        // Set user as authenticated immediately from storage
        set({
          user: user,
          token: token,
          isAuthenticated: true,
          isLoading: false,
        });

        // Connect socket
        await socketService.connect();

        // Optionally verify session in background (non-blocking)
        try {
          const data = await authAPI.me();
          const currentUser = data.user || data.data?.user;
          const accessToken =
            data.accessToken || data.token || data.data?.accessToken;

          if (currentUser) {
            // Update with fresh user data from backend
            set({ user: currentUser });
            await storageService.saveUser(currentUser);
            if (accessToken) {
              await storageService.saveToken(accessToken);
            }
          }
        } catch (error) {
          // Backend validation failed, but keep user logged in
          console.log("Session validation failed, but keeping user logged in");
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("Load user error:", error);
      set({ isLoading: false });
    }
  },

  // Logout
  logout: async () => {
    console.log("=== LOGOUT STARTED ===");

    // Log cookies only on web
    if (typeof document !== "undefined") {
      console.log("Current cookies:", document.cookie);
    }

    try {
      // Call backend logout FIRST to clear HTTP-only cookies
      console.log("Calling backend logout API...");
      const response = await authAPI.logout();
      console.log("Backend logout response:", response);

      if (typeof document !== "undefined") {
        console.log("Cookies after backend logout:", document.cookie);
      }
    } catch (error) {
      console.error("Logout API error:", error);
      console.error("Error details:", error.response?.data);
      // Continue even if backend fails
    }

    try {
      // Disconnect socket
      socketService.disconnect();
      console.log("Socket disconnected");

      // Clear AsyncStorage
      await storageService.clearAll();
      console.log("AsyncStorage cleared");

      // Clear auth state
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
      console.log("Auth state cleared");
    } catch (error) {
      console.error("Logout cleanup error:", error);
      // Force state clear
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    }

    // Clear browser storage (web only)
    if (typeof window !== "undefined") {
      try {
        // Clear localStorage
        window.localStorage.clear();
        console.log("LocalStorage cleared");

        // Clear sessionStorage
        window.sessionStorage.clear();
        console.log("SessionStorage cleared");

        // Clear all non-HTTP-only cookies
        if (typeof document !== "undefined") {
          const cookies = document.cookie.split(";");
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name =
              eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            document.cookie =
              name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          }
          console.log("Browser cookies cleared");
          console.log("Final cookies before reload:", document.cookie);
        }

        // Wait a bit then force hard reload (web only)
        console.log("Reloading page in 500ms...");
        setTimeout(() => {
          window.location.href = "/";
          window.location.reload(true);
        }, 500);
      } catch (storageError) {
        console.error("Error clearing browser storage:", storageError);
        window.location.href = "/";
      }
    }

    console.log("=== LOGOUT COMPLETED ===");
  },

  // Update user profile
  updateUser: async (updates) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      set({ user: updatedUser });
      await storageService.saveUser(updatedUser);
    }
  },
}));
