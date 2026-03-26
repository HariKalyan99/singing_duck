import React, { useState } from "react";
import axios from "axios";
import { captureDuck } from "./sdk/errorTracker";

const App = () => {
  const [errors, setErrors] = useState([]);
  const [expanded, setExpanded] = useState(null);

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
      await fetchAllErrors();
    } catch (error) {
      console.error(error);
    }
  };

  const triggerBackendPromiseError = async () => {
    try {
      await axios.get("http://localhost:8080/test-promise-error");
      await fetchAllErrors();
    } catch (error) {
      console.error(error);
    }
  };

  const triggerFrontendError = async () => {
    try {
      const obj = null;
      return obj.name;
    } catch (err) {
      await captureDuck(err, { context: "myFunction" });
      await fetchAllErrors();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
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
        </div>
      </div>

      {/* Empty State */}
      {!errors.length && (
        <div className="text-center py-20 text-gray-400">
          No errors detected
        </div>
      )}

      {/* Error List */}
      <div className="space-y-4">
        {errors.map((item, index) => {
          const error = item.error;
          const isOpen = expanded === index;

          return (
            <div
              key={index}
              onClick={() => setExpanded(isOpen ? null : index)}
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
            >
              {/* Top Row */}
              <div className="flex justify-between items-center px-6 py-4">
                <div>
                  <h3 className="text-gray-800 font-medium">{error.message}</h3>
                  {error.type === "backend" && (
                    <p className="text-xs text-gray-400 mt-1">
                      {error.stack?.[0]?.file} : {error.stack?.[0]?.line}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {item.count} occurrences
                  </span>

                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      error.type === "backend"
                        ? "bg-red-100 text-red-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {error.type}
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
                    <div className="rounded-lg overflow-hidden border border-gray-800">
                      <pre className="bg-black text-gray-200 text-xs p-4 overflow-x-auto">
                        {error.codeSnippet.map((line) => (
                          <div
                            key={line.lineNumber}
                            className={`flex ${
                              line.isErrorLine
                                ? "bg-red-500/20 border-l-4 border-red-500"
                                : ""
                            }`}
                          >
                            <span className="w-10 text-right pr-3 text-gray-500 select-none">
                              {line.lineNumber}
                            </span>
                            <span>{line.content}</span>
                          </div>
                        ))}
                      </pre>
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default App;
