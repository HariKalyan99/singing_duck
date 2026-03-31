import React, { useMemo, useState } from "react";
import axios from "axios";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { captureDuck } from "./sdk/errorTracker";
import { useEffect } from "react";

const App = () => {
  const [errors, setErrors] = useState([]);
  const [expanded, setExpanded] = useState(0);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isSticky, setIsSticky] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [loadingSnippet, setLoadingSnippet] = useState(false);
  const [fullSnippets, setFullSnippets] = useState({});

  const [replayingId, setReplayingId] = useState(null);
  const [replayResult, setReplayResult] = useState(null);

  const fetchAllErrors = async () => {
    try {
      const { data } = await axios.get("http://localhost:8080/all-errors");
      setErrors(data);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerBackendError = async () => {
    try {
      await axios.get("http://localhost:8080/test-error");
    } catch (error) {
      console.error(error);
    } finally {
      await fetchAllErrors();
    }
  };

  const triggerBackendPromiseError = async () => {
    try {
      await axios.get("http://localhost:8080/test-promise-error");
    } catch (error) {
      console.error(error);
    } finally {
      await fetchAllErrors();
    }
  };

  const triggerProcutsError = async () => {
    try {
      await axios.get("http://localhost:8080/products");
    } catch (error) {
      console.error(error);
    } finally {
      await fetchAllErrors();
    }
  };

  const triggerFrontendError = async () => {
    try {
      const obj = null;
      return obj.name;
    } catch (err) {
      await captureDuck(err, { context: "myFunction" });
    } finally {
      await fetchAllErrors();
    }
  };

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

  useEffect(() => {
    fetchAllErrors();

    // const interval = setInterval(fetchAllErrors, 3000);
    // return () => clearInterval(interval);
  }, []);

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

  const handleExpand = async (errorId) => {
    if (expandedId === errorId) {
      setExpandedId(null);
      return;
    }

    // Already cached
    if (fullSnippets[errorId]) {
      setExpandedId(errorId);
      return;
    }

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
        setExpandedId(errorId);
      }
    } catch (err) {
      console.error("Failed to load full snippet", err);
    } finally {
      setLoadingSnippet(false);
    }
  };

  const handleReplay = async (errorId) => {
    try {
      setReplayingId(errorId);
      setReplayResult(null);

      const { data } = await axios.post(
        `http://localhost:8080/errors/${errorId}/replay-service`,
      );

      setReplayResult({
        success: true,
        data,
      });

      // refresh errors after replay
      await fetchAllErrors();
    } catch (err) {
      setReplayResult({
        success: false,
        message: err.response?.data?.message || err.message || "Replay failed",
      });
    } finally {
      setReplayingId(null);
    }
  };
  // we can also add a polling server!

  return (
    <div className="min-h-screen bg-gray-50 px-20 py-14">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800">
            Error Monitoring
          </h1>
          <p className="text-sm text-gray-500 mt-1">Realtime error tracking</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={clearErrors}
            className="px-4 py-2 text-sm text-black rounded-lg shadow-md hover:bg-gray-300 transition underline"
          >
            Clear errors
          </button>
          <button
            onClick={triggerBackendError}
            className="px-4 py-2 text-sm bg-black text-white rounded-lg shadow-md hover:bg-gray-800 transition"
          >
            Trigger Test Error
          </button>
          <button
            onClick={triggerBackendPromiseError}
            className="px-4 py-2 text-sm bg-black text-white rounded-lg shadow-md hover:bg-gray-800 transition"
          >
            Trigger Promise Error
          </button>

          <button
            onClick={triggerFrontendError}
            className="px-4 py-2 text-sm bg-black text-white rounded-lg shadow-md hover:bg-gray-800 transition"
          >
            Trigger Frontend Error
          </button>
          <button
            onClick={triggerProcutsError}
            className="px-4 py-2 text-sm bg-black text-white rounded-lg shadow-md hover:bg-gray-800 transition"
          >
            Trigger Products Error
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-xs text-gray-400">Total Errors</p>
          <p className="text-3xl font-semibold mt-2">{errors.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-xs text-gray-400">Frontend</p>
          <p className="text-3xl font-semibold mt-2 text-blue-600">
            {errors.filter((e) => e.error.type === "frontend").length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-xs text-gray-400">Backend</p>
          <p className="text-3xl font-semibold mt-2 text-red-600">
            {errors.filter((e) => e.error.type === "backend").length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-xs text-gray-400">Most Frequent</p>
          <p className="text-3xl font-semibold mt-2">
            {Math.max(...errors.map((e) => e.count), 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        className={`bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 
  p-6 rounded-2xl border border-gray-200 mb-8 sticky top-0 z-10 
  transition-all duration-300 ${
    isSticky ? "shadow-xl ring-1 ring-black/5" : "shadow-sm"
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
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm 
      focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="backend">Backend</option>
            <option value="frontend">Frontend</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm 
      focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-4 py-2 rounded-xl text-sm border border-gray-200 
      hover:bg-gray-50 transition"
          >
            Reset
          </button>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-gray-100" />

        {/* Time Filters */}
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm 
        focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="datetime-local"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm 
        focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          const parsedStack = normalizeStack(error.stack);
          const firstFrame = parsedStack.find((f) => f?.file);
          const extension = firstFrame?.file?.split(".").pop();

          const snippetToRender =
            expandedId === error._id && fullSnippets[error._id]
              ? fullSnippets[error._id]
              : error.codeSnippet;

          const hasMoreContext = error.codeSnippet?.length >= 10;
          return (
            <div
              key={error._id}
              onClick={() => setExpanded(isOpen ? null : index)}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
            >
              {/* Top Row */}
              <div className="flex justify-between items-start px-6 py-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-gray-900 font-semibold text-lg leading-snug">
                    {error.message}
                  </h3>

                  <div className="flex gap-3 items-center text-xs text-gray-400">
                    <span>{formatTime(error.timestamp)}</span>
                    <span>•</span>
                    <span className="truncate max-w-xs">{error.url}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-gray-400">
                    {item.count} occurrences
                  </span>

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      error.type === "backend"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {error.type.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Expanded Section */}
              {isOpen && (
                <div className="border-t border-gray-100 px-6 py-5 bg-gray-50 rounded-b-xl">
                  <div className="grid grid-cols-2 gap-6 text-sm text-gray-600 mb-6">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">URL</p>
                      <p>{error.url}</p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-xs mb-1">Time</p>
                      <p>{formatTime(error.timestamp)}</p>
                    </div>

                    {/* ADD THIS */}
                    <div className="col-span-2">
                      <p className="text-gray-400 text-xs mb-1">User Agent</p>
                      <p className="break-words">{error.userAgent}</p>
                    </div>
                  </div>

                  {/* Code Snippet */}
                  {error?.codeSnippet && (
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
                      {/* Expand / Collapse */}
                      {hasMoreContext && (
                        <div className="flex justify-center bg-gray-950 border-b border-gray-800">
                          <button
                            disabled={
                              loadingSnippet && expandedId !== error._id
                            }
                            onClick={() => handleExpand(error._id)}
                            className="text-gray-400 hover:text-white text-xs py-1 px-3 flex items-center gap-1 disabled:opacity-50"
                          >
                            {expandedId === error._id
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

                  {/* Stack Trace */}
                  <details
                    className="mt-6 text-xs text-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                      Full Stack Trace
                    </summary>

                    <pre className="mt-3 bg-white border border-gray-200 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                      {error.rawStack}
                    </pre>
                  </details>

                  {error.type === "backend" && (
                    <div
                      className="mt-6 flex items-center gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleReplay(error._id)}
                        disabled={replayingId === error._id}
                        className="px-4 py-2 text-xs bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                      >
                        {replayingId === error._id
                          ? "Replaying..."
                          : "Replay Service"}
                      </button>
                    </div>
                  )}

                  {replayResult && replayingId !== error._id && (
                    <div className="mt-4 text-xs">
                      {replayResult.success ? (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg">
                          Replay succeeded
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
                          Replay failed: {replayResult.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!filteredErrors.length && (
          <div className="bg-white p-20 rounded-2xl border shadow-sm text-center">
            <p className="text-gray-400 text-lg">
              No errors match your filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
