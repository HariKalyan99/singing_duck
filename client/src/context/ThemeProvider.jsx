import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { ThemeContext } from "./themeContext.js";

const STORAGE_KEY = "singing-duck-theme";

function readStoredTheme() {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light") return "light";
  if (stored === "dark") return "dark";
  return "dark";
}

function syncDocumentTheme(theme) {
  const isDark = theme === "dark";
  const html = document.documentElement;
  const { body } = document;

  html.setAttribute("data-theme", isDark ? "dark" : "light");
  body.setAttribute("data-theme", isDark ? "dark" : "light");
  html.style.colorScheme = isDark ? "dark" : "light";

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readStoredTheme());

  useLayoutEffect(() => {
    syncDocumentTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className="h-full min-h-0 w-full" data-theme={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
