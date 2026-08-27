import { ScriptOnce } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { createContext, use, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const mediaQuery = "(prefers-color-scheme: dark)";
const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () =>
      (typeof window !== "undefined"
        ? (localStorage.getItem(storageKey) as Theme)
        : null) ?? defaultTheme,
  );

  useEffect(() => {
    const media = window.matchMedia(mediaQuery);
    const applySystemTheme = (event: MediaQueryListEvent | MediaQueryList) => {
      if (theme !== "system") return;

      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(event.matches ? "dark" : "light");
    };

    media.addEventListener("change", applySystemTheme);
    applySystemTheme(media);

    return () => media.removeEventListener("change", applySystemTheme);
  }, [theme]);

  useEffect(() => {
    const targetTheme =
      theme === "system"
        ? window.matchMedia(mediaQuery).matches
          ? "dark"
          : "light"
        : theme;

    if (theme === "system") localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, theme);

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(targetTheme);
  }, [storageKey, theme]);

  return (
    <ThemeProviderContext value={{ theme, setTheme }}>
      <ScriptOnce>
        {`document.documentElement.classList.toggle(
					'dark',
					localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
				)`}
      </ScriptOnce>
      {children}
    </ThemeProviderContext>
  );
}

export function useTheme() {
  const context = use(ThemeProviderContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}
