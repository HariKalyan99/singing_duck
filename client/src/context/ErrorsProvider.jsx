import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ErrorsContext } from "./errorsContext.js";

export function ErrorsProvider({ children }) {
  const [errors, setErrors] = useState([]);

  const fetchAllErrors = useCallback(async () => {
    try {
      const { data } = await axios.get("http://localhost:8080/all-errors");
      setErrors(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Initial load: shared error index for all routes (async setState is intentional).
  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchAllErrors();
    }, 0);
    return () => window.clearTimeout(t);
  }, [fetchAllErrors]);

  return (
    <ErrorsContext.Provider value={{ errors, fetchAllErrors }}>
      {children}
    </ErrorsContext.Provider>
  );
}
