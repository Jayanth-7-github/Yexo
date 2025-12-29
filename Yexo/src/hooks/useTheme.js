import { useEffect, useMemo, useState } from "react";
import { applyTheme, resolveTheme, THEME_STORAGE_KEY } from "../themes/theme";

/**
 * preference: 'light' | 'dark' | 'system'
 */
export function useTheme() {
  const [preference, setPreference] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || "system";
    } catch {
      return "system";
    }
  });

  const effectiveTheme = useMemo(() => resolveTheme(preference), [preference]);

  useEffect(() => {
    applyTheme(effectiveTheme);
  }, [effectiveTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // ignore
    }
  }, [preference]);

  useEffect(() => {
    if (preference !== "system") return;
    if (!window.matchMedia) return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(resolveTheme("system"));

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [preference]);

  return {
    preference,
    setPreference,
    effectiveTheme,
  };
}
