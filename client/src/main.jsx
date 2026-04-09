import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PostHogProvider } from "posthog-js/react";
import posthog from "posthog-js";
import "./index.css";
import App from "./App.jsx";
import { ErrorsProvider } from "./context/ErrorsProvider.jsx";
import { ThemeProvider } from "./context/ThemeProvider.jsx";
import { initErrorTracking } from "./sdk/errorTracker.js";
import { initPosthog } from "./lib/posthog.js";

initPosthog();
initErrorTracking();

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
