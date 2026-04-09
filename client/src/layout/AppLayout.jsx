import { NavLink, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useTheme } from "../context/themeContext.js";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggleTheme();
      }}
      className="relative z-30 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100/80 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <>
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          Light
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          Dark
        </>
      )}
    </button>
  );
}

const navClass = ({ isActive }) =>
  [
    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
    isActive
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
  ].join(" ");

export default function AppLayout() {
  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="fixed top-3 right-3 z-40">
        <ThemeToggle />
      </div>
      <aside className="hidden md:flex h-full min-h-0 w-60 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="shrink-0 p-5 border-b border-zinc-200 dark:border-zinc-800">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Singing Duck
          </p>
          <h1 className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
            Error Monitoring System
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Capture, replay, and triage in one place.
          </p>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-3 space-y-0.5">
          <NavLink to="/" end className={navClass}>
            <span className="h-1 w-1 rounded-full bg-current opacity-60" />
            Dashboard
          </NavLink>
          <NavLink to="/recordings" className={navClass}>
            <span className="h-1 w-1 rounded-full bg-current opacity-60" />
            Recordings
          </NavLink>
          <NavLink to="/error--trigger-services" className={navClass}>
            <span className="h-1 w-1 rounded-full bg-current opacity-60" />
            Error triggers
          </NavLink>
        </nav>
        <div className="shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">
            {import.meta.env.VITE_PUBLIC_POSTHOG_KEY
              ? "PostHog: session replay & pageviews (see project → Recordings)."
              : "Add VITE_PUBLIC_POSTHOG_KEY for PostHog replay & analytics."}
          </p>
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
        <header className="z-20 flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white/95 px-3 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 md:hidden">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              [
                "rounded-md px-2.5 py-1.5 text-xs font-medium",
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
              ].join(" ")
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/recordings"
            className={({ isActive }) =>
              [
                "rounded-md px-2.5 py-1.5 text-xs font-medium",
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
              ].join(" ")
            }
          >
            Recordings
          </NavLink>
          <NavLink
            to="/error--trigger-services"
            className={({ isActive }) =>
              [
                "rounded-md px-2.5 py-1.5 text-xs font-medium",
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
              ].join(" ")
            }
          >
            Triggers
          </NavLink>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <Outlet />
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "!bg-white !text-zinc-900 !border !border-zinc-200 !shadow-lg dark:!bg-zinc-900 dark:!text-zinc-100 dark:!border-zinc-700",
        }}
      />
    </div>
  );
}
