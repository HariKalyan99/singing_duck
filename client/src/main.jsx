import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PostHogProvider } from "posthog-js/react";
import posthog from "posthog-js";
import "./index.css";
import App from "./App.jsx";
import { ErrorsProvider } from "./context/ErrorsProvider.jsx";
import { ThemeProvider } from "./context/ThemeProvider.jsx";
import {
  buildPosthogInitOptions,
  initErrorTracking,
} from "@singing-duck/capture-duck/browser";

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

if (posthogKey) {
  posthog.init(
    posthogKey,
    buildPosthogInitOptions({
      apiKey: posthogKey,
      ...(posthogHost ? { host: posthogHost } : {}),
    }),
  );
}

await initErrorTracking({
  ingestUrl:
    import.meta.env.VITE_ERRORS_INGEST_URL ||
    "http://localhost:8080/errors",
  posthogClient: posthogKey ? posthog : undefined,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <PostHogProvider client={posthog}>
        <BrowserRouter>
          <ErrorsProvider>
            <App />
          </ErrorsProvider>
        </BrowserRouter>
      </PostHogProvider>
    </ThemeProvider>
  </StrictMode>,
);
