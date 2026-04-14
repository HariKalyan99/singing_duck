import { useState } from "react";

const API_BASE = import.meta.env.VITE_TRIAL_API_BASE || "http://localhost:8090";

export default function App() {
  const [message, setMessage] = useState("Manual backend trigger from trial app");
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const triggerBackendError = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trigger-error`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setResult({ status: res.status, data });
    } catch (error) {
      setResult({ status: 0, data: { success: false, message: error.message } });
    } finally {
      setLoading(false);
    }
  };

  const fetchErrors = async () => {
    const res = await fetch(`${API_BASE}/errors`);
    const data = await res.json();
    setErrors(data?.data || []);
  };

  return (
    <main>
      <h1>Capture Duck npm trial</h1>
      <p>Trigger a backend error and verify it was captured via package API.</p>

      <div className="row">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Error message"
        />
        <button onClick={triggerBackendError} disabled={loading}>
          {loading ? "Triggering..." : "Trigger backend error"}
        </button>
        <button onClick={fetchErrors}>Refresh captured errors</button>
      </div>

      {result ? (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      ) : (
        <p className="muted">No trigger run yet.</p>
      )}

      <h2>Captured errors (latest 20)</h2>
      {errors.length === 0 ? <p className="muted">No errors captured yet.</p> : null}
      <ul>
        {errors.map((item) => (
          <li key={item.id}>
            <strong>{item.message}</strong> ({item.fingerPrint}) at {item.url}
          </li>
        ))}
      </ul>
    </main>
  );
}
