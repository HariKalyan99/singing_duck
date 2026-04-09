import { useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useErrors } from "../context/errorsContext.js";

const API_BASE = "http://localhost:8080";

function formatTime(value) {
  if (!value) return "n/a";
  return new Date(value).toLocaleString();
}

function formatRelativeTime(value) {
  if (!value) return "unknown";
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function RecordingsPanel() {
  const { errors, fetchAllErrors } = useErrors();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recordingsError, setRecordingsError] = useState("");
  const [replayingId, setReplayingId] = useState(null);
  const [replayResultsById, setReplayResultsById] = useState({});

  const backendErrors = useMemo(
    () =>
      errors
        .map((item) => item.error)
        .filter((e) => e.type === "backend")
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [errors],
  );

  const fetchRecordings = async () => {
    setLoading(true);
    setRecordingsError("");
    try {
      const { data } = await axios.get(`${API_BASE}/posthog/recordings?limit=8`);
      setRecordings(data?.recordings || []);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to load recordings";
      setRecordingsError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = async (error) => {
    const isProductServiceError =
      error.url === "/products/add" &&
      error.serviceContext?.service === "addProduct";
    const replayEndpoint = isProductServiceError
      ? `${API_BASE}/products/errors/${error._id}/replay-service`
      : `${API_BASE}/errors/${error._id}/replay-service`;

    try {
      setReplayingId(error._id);
      setReplayResultsById((prev) => ({
        ...prev,
        [error._id]: null,
      }));

      const { data } = await axios.post(replayEndpoint);
      const resultData = data?.result || {};
      setReplayResultsById((prev) => ({
        ...prev,
        [error._id]: {
          success: true,
          data: {
            transactionId: data.transactionId || resultData.transactionId,
            attemptNumber: data.attemptNumber || resultData.attemptNumber,
            compared:
              data.compared ??
              resultData.compared ??
              Boolean(resultData?.resolutionStatus),
            resolutionStatus:
              data.resolutionStatus ||
              resultData.resolutionStatus ||
              "not_yet_resolved",
          },
        },
      }));
      toast.success("Replay completed");
      await fetchAllErrors();
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Replay failed";
      setReplayResultsById((prev) => ({
        ...prev,
        [error._id]: {
          success: false,
          message,
        },
      }));
      toast.error(message);
    } finally {
      setReplayingId(null);
    }
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              PostHog + Replay Service
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Recordings and replay panel
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Pull recent session snapshots from PostHog and run backend replay
              actions from one place.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchRecordings}
              className="px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              {loading ? "Loading..." : "Fetch recent recordings"}
            </button>
            <button
              type="button"
              onClick={() => fetchAllErrors()}
              className="px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Refresh errors
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Recent session recordings</h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {recordings.length} loaded
            </span>
          </div>
          {recordingsError ? (
            <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3 text-sm text-rose-800 dark:text-rose-200">
              {recordingsError}
            </div>
          ) : null}
          {!recordings.length && !recordingsError ? (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              No recordings loaded yet. Click "Fetch recent recordings".
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            {recordings.map((rec) => (
              <div
                key={rec.id || rec.sessionId}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-950/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Session {rec.sessionId || rec.id}
                  </p>
                  {rec.replayUrl ? (
                    <a
                      href={rec.replayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline text-zinc-700 dark:text-zinc-300"
                    >
                      Open in PostHog
                    </a>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Distinct ID: {rec.distinctId || "n/a"}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Seen: {formatRelativeTime(rec.startTime)}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Start: {formatTime(rec.startTime)} | End: {formatTime(rec.endTime)}{" "}
                  | Duration:{" "}
                  {rec.ongoing
                    ? "Live"
                    : rec.durationSeconds == null
                      ? "pending"
                      : `${rec.durationSeconds}s`}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Backend replay service</h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {backendErrors.length} backend errors
            </span>
          </div>
          {!backendErrors.length ? (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              No backend errors available right now.
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            {backendErrors.map((error) => {
              const replayResult = replayResultsById[error._id];
              return (
                <div
                  key={error._id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-950/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {error.message}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {error.url} | {formatTime(error.timestamp)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReplay(error)}
                      disabled={replayingId === error._id}
                      className="px-3 py-2 text-xs rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                    >
                      {replayingId === error._id ? "Replaying..." : "Run replay"}
                    </button>
                  </div>
                  {replayResult?.success ? (
                    <p className="mt-3 text-xs rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 p-2.5">
                      Replay succeeded | attempt {replayResult.data?.attemptNumber || "n/a"}
                      {" | "}status{" "}
                      {replayResult.data?.resolutionStatus === "resolved"
                        ? "Resolved"
                        : "Not Yet Resolved"}
                    </p>
                  ) : null}
                  {replayResult && !replayResult.success ? (
                    <p className="mt-3 text-xs rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 p-2.5">
                      Replay failed: {replayResult.message}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
