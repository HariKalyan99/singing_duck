import { getConvex } from "../src/lib/convex.js";
import { ingestFrontendError } from "../services/frontendErrorService.js";
import {
  clearErrors,
  getFullSnippet,
  getGroupedErrors,
  getLatestSnippet,
  getRecentErrors,
} from "../services/errorService.js";
import { runReplayTransaction } from "../services/replayTransactionService.js";

const convex = getConvex();

export async function ingestFrontendErrorController(req, res) {
  try {
    const result = await ingestFrontendError(req.body, { convex });
    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to store frontend error:", err);
    res.status(500).json({ success: false });
  }
}

export async function getErrorsController(req, res) {
  try {
    const formatted = await getRecentErrors(null, { convex });
    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    console.error("Failed to fetch errors:", err);
    res.status(500).json({ success: false });
  }
}

export async function clearErrorsController(req, res) {
  try {
    const result = await clearErrors(null, { convex });
    res.status(200).json(result);
  } catch {
    res.status(500).json({ success: false });
  }
}

export async function getGroupedErrorsController(req, res) {
  try {
    const grouped = await getGroupedErrors(null, { convex });
    res.json(grouped);
  } catch (err) {
    console.error("Failed to group errors:", err);
    res.status(500).json({ success: false });
  }
}

export async function getFullSnippetController(req, res) {
  try {
    const codeSnippet = await getFullSnippet({ id: req.params.id }, { convex });
    res.json({ success: true, codeSnippet });
  } catch (err) {
    if (err.message === "Error not found") {
      return res.status(404).json({ success: false, message: "Error not found" });
    }
    console.error("Failed to fetch full snippet:", err);
    res.status(500).json({ success: false });
  }
}

export async function getLatestSnippetController(req, res) {
  try {
    const codeSnippet = await getLatestSnippet({ id: req.params.id }, { convex });
    res.json({ success: true, codeSnippet });
  } catch (err) {
    if (err.message === "Error not found") {
      return res.status(404).json({ success: false, message: "Error not found" });
    }
    console.error("Failed to fetch latest snippet:", err);
    res.status(500).json({ success: false });
  }
}

export async function replayErrorController(req, res) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Replay disabled in production" });
  }

  try {
    const result = await runReplayTransaction(
      { errorId: req.params.id },
      { convex },
    );
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message === "Error not found") {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.message === "Replay not available for this error") {
      return res.status(400).json({
        success: false,
        message:
          "Replay not available for this error. Missing replayable service context.",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function replayProductErrorController(req, res) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Replay disabled in production" });
  }

  try {
    const result = await runReplayTransaction(
      { errorId: req.params.id, expectedService: "addProduct" },
      { convex },
    );
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message === "Error not found") {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.message === "Replay is only supported for addProduct") {
      return res.status(400).json({
        success: false,
        message: "Replay is only supported for product add service",
      });
    }
    if (err.message === "Replay not available for this error") {
      return res.status(400).json({
        success: false,
        message:
          "Replay not available for this error. Missing replayable service context.",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}
