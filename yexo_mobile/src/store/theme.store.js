import { create } from "zustand";
import { Appearance } from "react-native";
import storageService from "../services/storage.service";
import { COLORS } from "../constants/colors";

export const useThemeStore = create((set, get) => ({
  theme: "light", // 'light' | 'dark' | 'auto'
  activeTheme: "light", // actual active theme
  colors: COLORS.light,

  // Initialize theme
  initTheme: async () => {
    const savedTheme = await storageService.getTheme();
    const systemTheme = Appearance.getColorScheme() || "light";

    const theme = savedTheme || "light";
    const activeTheme = theme === "auto" ? systemTheme : theme;

    set({
      theme,
      activeTheme,
      colors: COLORS[activeTheme] || COLORS.light,
    });
  },

  // Set theme
  setTheme: async (theme) => {
    const systemTheme = Appearance.getColorScheme() || "light";
    const activeTheme = theme === "auto" ? systemTheme : theme;

    await storageService.saveTheme(theme);

    set({
      theme,
      activeTheme,
      colors: COLORS[activeTheme] || COLORS.light,
    });
  },

  // Toggle theme (light <-> dark)
  toggleTheme: async () => {
    const currentTheme = get().activeTheme;
    const newTheme = currentTheme === "light" ? "dark" : "light";
    await get().setTheme(newTheme);
  },

  // Get color
  getColor: (colorName) => {
    return get().colors[colorName] || "#000000";
  },

  // Check if dark mode
  isDark: () => {
    return get().activeTheme === "dark";
  },
}));
