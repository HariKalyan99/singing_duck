import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "react-hot-toast";
import { useErrors } from "../context/errorsContext.js";

export default function ErrorDashboard() {
  const { errors, fetchAllErrors } = useErrors();
  const [expanded, setExpanded] = useState(0);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isSticky, setIsSticky] = useState(false);

  const [expandedOlderId, setExpandedOlderId] = useState(null);
  const [expandedLatestId, setExpandedLatestId] = useState(null);
  const [loadingSnippet, setLoadingSnippet] = useState(false);
  const [fullSnippets, setFullSnippets] = useState({});
  const [latestSnippets, setLatestSnippets] = useState({});

  const [replayingId, setReplayingId] = useState(null);
  const [replayResultsById, setReplayResultsById] = useState({});

  const clearErrors = async () => {
    try {
      await axios.delete("http://localhost:8080/errors");
    } catch (error) {
      console.error(error);
    }

    await fetchAllErrors(); // no need finally if always after
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const buildCurlFromError = (error) => {
    const method =
      error?.serviceContext?.context?.method ||
      (error?.url === "/products/add" ? "POST" : "GET");
    const endpoint = `http://localhost:8080${error?.url || ""}`;
    const payload =
      error?.serviceContext?.payload?.body ?? error?.serviceContext?.payload;

    if (
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      Object.keys(payload).length > 0
    ) {
      const bodyString = JSON.stringify(payload, null, 2)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "'\\''");
      return `curl -X ${method} "${endpoint}" -H "Content-Type: application/json" -d '${bodyString}'`;
    }

    return `curl -X ${method} "${endpoint}"`;
  };

  const copyCurlCommand = async (command) => {
    try {
      await navigator.clipboard.writeText(command);
      toast.success("cURL copied");
    } catch {
      toast.error("Failed to copy cURL");
    }
  };

  const copyRequestBodyJson = async (error) => {
    const payload =
      error?.serviceContext?.payload?.body ?? error?.serviceContext?.payload;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      toast.error("No JSON request body available");
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success("Request body JSON copied");
    } catch {
      toast.error("Failed to copy request body JSON");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredErrors = useMemo(() => {
    return errors
      .filter((item) => {
        const { error, occurrences = [] } = item;

        // 🔍 Search filter
        const matchesSearch = error.message
          ?.toLowerCase()
          .includes(search.toLowerCase());

        // 🏷 Type filter
        const matchesType = typeFilter === "all" || error.type === typeFilter;

        // 🕒 Time filter logic (IMPORTANT PART)
        let matchesTime = true;

        if (fromDate || toDate) {
          // If occurrences exist, use latest occurrence
          const latestTimestamp =
            occurrences.length > 0
              ? new Date(
                  Math.max(
                    ...occurrences.map((o) => new Date(o.timestamp).getTime()),
                  ),
                )
              : new Date(error.timestamp);

          if (fromDate) {
            matchesTime = matchesTime && latestTimestamp >= new Date(fromDate);
          }

          if (toDate) {
            matchesTime = matchesTime && latestTimestamp <= new Date(toDate);
          }
        }

        return matchesSearch && matchesType && matchesTime;
      })
      .sort((a, b) => {
        if (sortBy === "latest") {
          const aTime = new Date(
            a.occurrences?.length
              ? Math.max(
                  ...a.occurrences.map((o) => new Date(o.timestamp).getTime()),
                )
              : a.error.timestamp,
          );

          const bTime = new Date(
            b.occurrences?.length
              ? Math.max(
                  ...b.occurrences.map((o) => new Date(o.timestamp).getTime()),
                )
              : b.error.timestamp,
          );

          return bTime - aTime;
        }

        if (sortBy === "oldest") {
          return new Date(a.error.timestamp) - new Date(b.error.timestamp);
        }

        if (sortBy === "most") {
          return b.count - a.count;
        }

        return 0;
      });
  }, [errors, search, typeFilter, fromDate, toDate, sortBy]);

  const totalOccurrences = useMemo(
    () => errors.reduce((sum, e) => sum + (e.count || 0), 0),
    [errors],
  );

  const loadOlderSnippet = async (errorId) => {
    if (fullSnippets[errorId]) return;
    try {
      setLoadingSnippet(true);

      const res = await fetch(
        `http://localhost:8080/error/${errorId}/full-snippet`,
      );
      const data = await res.json();

      if (data.success) {
        setFullSnippets((prev) => ({
          ...prev,
          [errorId]: data.codeSnippet,
        }));
      }
    } catch (err) {
      console.error("Failed to load full snippet", err);
    } finally {
      setLoadingSnippet(false);
    }
  };

  const loadLatestSnippet = async (errorId, forceRefresh = false) => {
    if (!forceRefresh && latestSnippets[errorId]) return;

    try {
      setLoadingSnippet(true);
      const latestRes = await fetch(
        `http://localhost:8080/error/${errorId}/latest-snippet`,
      );
      const latestData = await latestRes.json();
      if (latestData.success) {
        setLatestSnippets((prev) => ({
          ...prev,
          [errorId]: latestData.codeSnippet,
        }));
      } else if (latestData?.message) {
        toast.error(latestData.message);
      }
    } catch (err) {
      console.error("Failed to load latest snippet", err);
    } finally {
      setLoadingSnippet(false);
    }
  };

  const handleOlderExpand = async (errorId) => {
    if (expandedOlderId === errorId) {
      setExpandedOlderId(null);
      return;
    }
    await loadOlderSnippet(errorId);
    setExpandedOlderId(errorId);
  };

  const handleLatestExpand = async (errorId) => {
    if (expandedLatestId === errorId) {
      setExpandedLatestId(null);
      return;
    }
    await loadLatestSnippet(errorId);
    setExpandedLatestId(errorId);
  };

  const handleCardToggle = async (index, errorId) => {
    const isCurrentlyOpen = expanded === index;
    if (isCurrentlyOpen) {
      setExpanded(null);
      return;
    }

    setExpanded(index);
    await loadOlderSnippet(errorId);
  };

  const handleReplay = async (error) => {
    const isProductServiceError =
      error.url === "/products/add" &&
      error.serviceContext?.service === "addProduct";
    const replayEndpoint = isProductServiceError
      ? `http://localhost:8080/products/errors/${error._id}/replay-service`
      : `http://localhost:8080/errors/${error._id}/replay-service`;

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
            isResolved: data.isResolved ?? resultData.isResolved,
            resolutionStatus:
              data.resolutionStatus ||
              resultData.resolutionStatus ||
              "not_yet_resolved",
          },
        },
      }));
      const resolvedStatus =
        data.resolutionStatus ||
        resultData.resolutionStatus ||
        "not_yet_resolved";
      if (resolvedStatus === "resolved") {
        await loadLatestSnippet(error._id, true);
        setExpandedLatestId(error._id);
      } else {
        setExpandedLatestId(null);
      }

      // refresh errors after replay
      await fetchAllErrors();
    } catch (err) {
      setReplayResultsById((prev) => ({
        ...prev,
        [error._id]: {
          success: false,
          message: err.response?.data?.message || err.message || "Replay failed",
        },
      }));
    } finally {
      setReplayingId(null);
    }
  };
  // we can also add a polling server!

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Overview
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Error dashboard
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed">
              Grouped issues, code context, and replay status in a single
              timeline-oriented view—built for fast triage, not dense tables.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fetchAllErrors()}
              className="px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={clearErrors}
              className="px-4 py-2.5 text-sm font-medium rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 hover:bg-rose-100/90 dark:hover:bg-rose-950/70 transition"
            >
              Clear all errors
            </button>
          </div>
        </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-10">
        <div className="bg-white dark:bg-zinc-900 p-5 lg:p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 ring-1 ring-zinc-900/[0.04] dark:ring-white/[0.05]">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Unique issues
          </p>
          <p className="text-3xl font-semibold mt-2 tabular-nums text-zinc-900 dark:text-zinc-50">
            {errors.length}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Distinct fingerprints
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 lg:p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 ring-1 ring-zinc-900/[0.04] dark:ring-white/[0.05]">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total events
          </p>
          <p className="text-3xl font-semibold mt-2 tabular-nums text-zinc-900 dark:text-zinc-50">
            {totalOccurrences}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Sum of occurrences
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 lg:p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 ring-1 ring-amber-500/15 dark:ring-amber-400/20">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Frontend
          </p>
          <p className="text-3xl font-semibold mt-2 tabular-nums text-amber-700 dark:text-amber-400">
            {errors.filter((e) => e.error.type === "frontend").length}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Browser captures
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 lg:p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 ring-1 ring-rose-500/15 dark:ring-rose-400/20">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Backend
          </p>
          <p className="text-3xl font-semibold mt-2 tabular-nums text-rose-700 dark:text-rose-400">
            {errors.filter((e) => e.error.type === "backend").length}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            API &amp; services
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        className={`bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 dark:bg-zinc-900/95 dark:supports-[backdrop-filter]:bg-zinc-900/90
  p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-8 sticky top-0 z-10 
  transition-all duration-300 ${
    isSticky
      ? "shadow-xl ring-1 ring-zinc-900/5 dark:ring-white/10"
      : "shadow-sm"
  }`}
      >
        {/* Top Row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search errors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm 
        focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-transparent"
            />
          </div>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm 
      focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          >
            <option value="all">All Types</option>
            <option value="backend">Backend</option>
            <option value="frontend">Frontend</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm 
      focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="most">Most Occurrences</option>
          </select>

          {/* Reset */}
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
              setSortBy("latest");
              setFromDate("");
              setToDate("");
            }}
            className="px-4 py-2 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200
      hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            Reset
          </button>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-zinc-100 dark:border-zinc-800" />

        {/* Time Filters */}
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              From
            </label>
            <input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm 
        focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              To
            </label>
            <input
              type="datetime-local"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm 
        focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* Error List */}
      <div className="space-y-4">
        {filteredErrors.map((item, index) => {
          const normalizeStack = (stack) => {
            if (!stack) return [];

            // Already array
            if (Array.isArray(stack)) return stack;

            // If string, try parsing
            if (typeof stack === "string") {
              try {
                const parsed = JSON.parse(stack);

                // If parsed is array → good
                if (Array.isArray(parsed)) return parsed;

                return [];
              } catch {
                return [];
              }
            }

            return [];
          };
          const error = item.error;
          const isOpen = expanded === index;

          const parsedStack = normalizeStack(error.parsedStack || error.stack);
          const firstFrame = parsedStack.find((f) => f?.file);
          const extension = firstFrame?.file?.split(".").pop();

          const snippetToRender =
            expandedOlderId === error._id && fullSnippets[error._id]
              ? fullSnippets[error._id]
              : error.codeSnippet;
          const latestSnippetSource = latestSnippets[error._id] || [];
          const latestSnippetToRender =
            expandedLatestId === error._id && latestSnippets[error._id]
              ? latestSnippets[error._id]
              : latestSnippetSource.slice(0, 10);

          const hasMoreContext = error.codeSnippet?.length >= 10;
          const isFrontendError = error.type === "frontend";
          const isBackendError = error.type === "backend";
          const replayResult = replayResultsById[error._id];
          const latestReplayTx = item.latestReplayTx || null;
          const hasReplayAttempt = Boolean(replayResult?.success || latestReplayTx);
          const resolutionStatus =
            replayResult?.data?.resolutionStatus ||
            latestReplayTx?.resolutionStatus ||
            "not_yet_resolved";
          const isResolved = resolutionStatus === "resolved";
          const hasServicePayload = Boolean(error.serviceContext?.payload);
          const curlCommand = buildCurlFromError(error);
          const replayHoverText =
            isBackendError && hasReplayAttempt
              ? isResolved
                ? "Resolved"
                : "Not Yet Resolved"
              : "";
          return (
            <div
              key={error._id}
              onClick={() => handleCardToggle(index, error._id)}
              title={replayHoverText}
              className={`bg-white dark:bg-zinc-900 border rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer ${
                isBackendError && hasReplayAttempt
                  ? isResolved
                    ? "border-emerald-500 dark:border-emerald-600"
                    : "border-rose-500 dark:border-rose-600"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {/* Top Row */}
              <div className="flex justify-between items-start px-6 py-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-zinc-900 dark:text-zinc-50 font-semibold text-lg leading-snug">
                    {error.message}
                  </h3>

                  <div className="flex gap-3 items-center text-xs text-zinc-400 dark:text-zinc-500">
                    <span>{formatTime(error.timestamp)}</span>
                    <span>•</span>
                    <span className="truncate max-w-xs">{error.url}</span>
                  </div>
                  {firstFrame?.file ? (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-md">
                      {firstFrame.file}:{firstFrame.line || "?"}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {item.count} occurrences
                  </span>

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      error.type === "backend"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
                        : "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                    }`}
                  >
                    {error.type.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Expanded Section */}
              {isOpen && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 px-6 py-5 bg-zinc-50 dark:bg-zinc-950/60 rounded-b-xl">
                  <div className="grid grid-cols-2 gap-6 text-sm text-zinc-600 dark:text-zinc-300 mb-6">
                    <div>
                      <p className="text-zinc-400 dark:text-zinc-500 text-xs mb-1">
                        URL
                      </p>
                      <p>{error.url}</p>
                    </div>

                    <div>
                      <p className="text-zinc-400 dark:text-zinc-500 text-xs mb-1">
                        Time
                      </p>
                      <p>{formatTime(error.timestamp)}</p>
                    </div>

                    {/* ADD THIS */}
                    <div className="col-span-2">
                      <p className="text-zinc-400 dark:text-zinc-500 text-xs mb-1">
                        User Agent
                      </p>
                      <p className="break-words">{error.userAgent}</p>
                    </div>
                  </div>
                  {hasServicePayload && (
                    <div
                      className="mb-6 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 p-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          Request cURL (copy to Postman or terminal)
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyRequestBodyJson(error)}
                            className="px-3 py-1 text-xs rounded-md border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            Copy JSON Body
                          </button>
                          <button
                            onClick={() => copyCurlCommand(curlCommand)}
                            className="px-3 py-1 text-xs rounded-md border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            Copy cURL
                          </button>
                        </div>
                      </div>
                      <pre className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md p-3 overflow-x-auto whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                        {curlCommand}
                      </pre>
                    </div>
                  )}

                  {/* Code Snippet */}
                  {!isFrontendError && snippetToRender?.length > 0 && (
                    <div
                      className="rounded-xl overflow-hidden border border-gray-800 shadow-inner bg-black"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* IDE Header */}
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
                        <div className="flex gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full" />
                          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                          <div className="w-3 h-3 bg-green-500 rounded-full" />
                        </div>

                        <span className="text-gray-400 text-xs font-mono truncate">
                          {firstFrame?.file || "source.js"}
                        </span>
                      </div>
                      <div className="px-4 py-2 bg-red-900/30 border-b border-gray-800 text-red-300 text-xs font-medium">
                        Older Snippet (Captured Error)
                      </div>
                      {/* Expand / Collapse */}
                      {hasMoreContext && (
                        <div className="flex justify-center bg-gray-950 border-b border-gray-800">
                          <button
                            disabled={
                              loadingSnippet && expandedOlderId !== error._id
                            }
                            onClick={() => handleOlderExpand(error._id)}
                            className="text-gray-400 hover:text-white text-xs py-1 px-3 flex items-center gap-1 disabled:opacity-50"
                          >
                            {expandedOlderId === error._id
                              ? "▲ Show Less"
                              : "▼ Show More Context"}
                          </button>
                        </div>
                      )}

                      <SyntaxHighlighter
                        language={extension || "javascript"}
                        style={oneDark}
                        showLineNumbers
                        wrapLines={true}
                        startingLineNumber={snippetToRender[0]?.lineNumber || 1}
                        customStyle={{
                          margin: 0,
                          padding: "16px",
                          fontSize: "12px",
                          background: "#000",
                        }}
                        lineProps={(lineNumber) => {
                          const match = snippetToRender.find(
                            (l) => l.lineNumber === lineNumber && l.isErrorLine,
                          );

                          if (match) {
                            return {
                              style: {
                                backgroundColor: "rgba(239, 68, 68, 0.15)",
                                borderLeft: "4px solid #ef4444",
                              },
                            };
                          }

                          return {};
                        }}
                      >
                        {snippetToRender.map((line) => line.content).join("\n")}
                      </SyntaxHighlighter>
                    </div>
                  )}
                  {!isFrontendError && !snippetToRender?.length && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Older snippet is unavailable for this error.
                    </div>
                  )}
                  {!isFrontendError &&
                    hasReplayAttempt &&
                    isResolved &&
                    latestSnippetToRender?.length > 0 && (
                      <div
                        className="mt-4 rounded-xl overflow-hidden border border-gray-800 shadow-inner bg-black"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-4 py-2 bg-green-900/40 border-b border-gray-800 text-green-300 text-xs font-medium">
                          Latest Snippet (Current Code)
                        </div>
                        {latestSnippetSource?.length >= 10 && (
                          <div className="flex justify-center bg-gray-950 border-b border-gray-800">
                            <button
                              disabled={
                                loadingSnippet && expandedLatestId !== error._id
                              }
                              onClick={() => handleLatestExpand(error._id)}
                              className="text-gray-400 hover:text-white text-xs py-1 px-3 flex items-center gap-1 disabled:opacity-50"
                            >
                              {expandedLatestId === error._id
                                ? "▲ Show Less"
                                : "▼ Show More Context"}
                            </button>
                          </div>
                        )}
                        <SyntaxHighlighter
                          language={extension || "javascript"}
                          style={oneDark}
                          showLineNumbers
                          wrapLines={true}
                          startingLineNumber={latestSnippetToRender[0]?.lineNumber || 1}
                          customStyle={{
                            margin: 0,
                            padding: "16px",
                            fontSize: "12px",
                            background: "#000",
                          }}
                        >
                          {latestSnippetToRender.map((line) => line.content).join("\n")}
                        </SyntaxHighlighter>
                      </div>
                    )}
                  {!isFrontendError &&
                    hasReplayAttempt &&
                    isResolved &&
                    !latestSnippetToRender?.length && (
                    <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Latest snippet is unavailable right now.
                    </div>
                  )}
                  {!isFrontendError && hasReplayAttempt && !isResolved && (
                    <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
                      Latest snippet unlocks only after replay status is Resolved.
                    </div>
                  )}
                  {!isFrontendError && !hasReplayAttempt && (
                    <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
                      Run replay to fetch the latest snippet from current backend code.
                    </div>
                  )}

                  {/* Stack Trace */}
                  <details
                    className="mt-6 text-xs text-zinc-600 dark:text-zinc-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <summary className="cursor-pointer text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200">
                      Full Stack Trace
                    </summary>

                    <pre className="mt-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 p-4 rounded-md overflow-x-auto whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                      {error.rawStack}
                    </pre>
                  </details>

                  {isBackendError && (
                    <div
                      className="mt-6 flex items-center gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleReplay(error)}
                        disabled={replayingId === error._id}
                        className="px-4 py-2 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition disabled:opacity-50"
                      >
                        {replayingId === error._id
                          ? "Replaying..."
                          : "Replay Service (Dry Run)"}
                      </button>
                    </div>
                  )}

                  {replayResult && replayingId !== error._id && (
                    <div className="mt-4 text-xs">
                      {replayResult.success ? (
                        <div
                          className={`p-3 rounded-lg border ${
                            replayResult.data?.resolutionStatus === "resolved"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200"
                              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200"
                          }`}
                        >
                          Replay succeeded | attempt #
                          {replayResult.data?.attemptNumber || "n/a"} | tx{" "}
                          {replayResult.data?.transactionId || "n/a"} | compared:{" "}
                          {replayResult.data?.compared ? "yes" : "no"} | status:{" "}
                          {replayResult.data?.resolutionStatus === "resolved"
                            ? "Resolved"
                            : "Not Yet Resolved"}
                        </div>
                      ) : (
                        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 p-3 rounded-lg">
                          Replay failed: {replayResult.message}
                        </div>
                      )}
                    </div>
                  )}
                  {latestReplayTx && (
                    <div
                      className="mt-3 text-xs border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg p-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="font-medium text-zinc-800 dark:text-zinc-100">
                        Latest Replay Transaction
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-300 mt-1">
                        Status: {latestReplayTx.status}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-300">
                        Attempt: {latestReplayTx.attemptNumber}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-300">
                        Resolution:{" "}
                        {latestReplayTx.resolutionStatus === "resolved" ||
                        latestReplayTx.isResolved
                          ? "Resolved"
                          : "Not Yet Resolved"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!filteredErrors.length && (
          <div className="bg-white dark:bg-zinc-900 p-16 sm:p-20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 text-center">
            <p className="text-zinc-600 dark:text-zinc-300 text-base font-medium">
              No errors match your filters
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 max-w-md mx-auto">
              Adjust search or time range, or use Error triggers to generate new
              samples.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
