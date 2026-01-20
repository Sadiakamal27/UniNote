"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  loadTheme,
  applyTheme,
  getStoredTheme,
  storeTheme,
  type Theme,
} from "@/lib/theme-utils";

export function useShadcnTheme() {
  const { theme: mode, setTheme: setMode } = useTheme();
  const [currentThemeName, setCurrentThemeName] = useState<string>("bubblegum");
  const [theme, setTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme on mount and when theme name changes
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const storedTheme = getStoredTheme() || "bubblegum";
      setCurrentThemeName(storedTheme);

      const loadedTheme = await loadTheme(storedTheme);
      if (loadedTheme) {
        setTheme(loadedTheme);
        // Wait for DOM to be ready and mode to be determined
        const timer = setTimeout(() => {
          const currentMode = (mode || "light") as "light" | "dark";
          applyTheme(loadedTheme, currentMode);
        }, 0);
        return () => clearTimeout(timer);
      }
      setIsLoading(false);
    }

    load();
  }, []);

  // Apply theme when mode changes
  useEffect(() => {
    if (theme && mode) {
      // Wait for next tick to ensure DOM is ready
      const timer = setTimeout(() => {
        const currentMode = mode === "dark" ? "dark" : "light";
        applyTheme(theme, currentMode);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [theme, mode]);

  const setThemeName = async (themeName: string) => {
    setIsLoading(true);
    const loadedTheme = await loadTheme(themeName);
    if (loadedTheme) {
      setTheme(loadedTheme);
      setCurrentThemeName(themeName);
      storeTheme(themeName);
      // Apply theme based on current mode
      const currentMode = (mode || "light") as "light" | "dark";
      applyTheme(loadedTheme, currentMode);
    }
    setIsLoading(false);
  };

  return {
    themeName: currentThemeName,
    setThemeName,
    mode,
    setMode,
    isLoading,
  };
}
