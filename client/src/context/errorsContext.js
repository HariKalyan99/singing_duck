import { createContext, useContext } from "react";

export const ErrorsContext = createContext(null);

export function useErrors() {
  const ctx = useContext(ErrorsContext);
  if (!ctx) {
    throw new Error("useErrors must be used within ErrorsProvider");
  }
  return ctx;
}
