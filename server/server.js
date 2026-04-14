import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import crypto from "crypto";

import getFingerPrint from "./helper/getFingerPrint.js";
import captureDuck from "./main/captureDuck.js";
import { buildClientErrorResponse } from "@singing-duck/capture-duck/node";

import { api } from "./convex/_generated/api.js";
import { getConvex } from "./src/lib/convex.js";
import trimSnippet from "./helper/trimSnippet.js";
import { replayService } from "./services/replayService.js";
import { addProductController } from "./controllers/productController.js";
import { runTx } from "./services/transactionService.js";
import { getGroupedErrors, getLatestSnippet } from "./services/errorService.js";

const convex = getConvex();

const app = express();

app.use(cors());
app.use(express.json());

/**
 * FRONTEND ERROR INGESTION
 */
app.post("/errors", async (req, res) => {
  try {
    const {
      message,
      stack,
      url,
      parsedStack,
      userAgent,
      type = "frontend",
    } = req.body;

    const errorObject = {
      id: crypto.randomUUID(),
      message,
      rawStack: stack,
      url,
      userAgent,
      type,
      parsedStack,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    };

    errorObject.fingerPrint = getFingerPrint(errorObject);

    await convex.mutation(api.errors.reportError, {
      message: errorObject.message,

      stack: errorObject.rawStack,
      rawStack: errorObject.rawStack,

      url: errorObject.url,
      userAgent: errorObject.userAgent,
      type: errorObject.type,
      timestamp: errorObject.timestamp,
      environment: errorObject.environment,
      fingerPrint: errorObject.fingerPrint,

      parsedStack: errorObject.parsedStack,

      codeSnippet: undefined,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to store frontend error:", err);
    res.status(500).json({ success: false });
  }
});

/**
 * GET RECENT ERRORS
 */
app.get("/errors", async (req, res) => {
  try {
    const errors = await convex.query(api.errors.getRecentErrors);
    const formatted = errors.map((err) => ({
      ...err,
      codeSnippet: trimSnippet(err.codeSnippet, 5),
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    console.error("Failed to fetch errors:", err);
    res.status(500).json({ success: false });
  }
});

app.delete("/errors", async (req, res) => {
  try {
    await convex.mutation(api.errors.clearErrors);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/**
 * GROUPED ERRORS (server-side grouping)
 */
app.get("/all-errors", async (req, res) => {
  try {
    const grouped = await getGroupedErrors(null, { convex });
    res.json(grouped);
  } catch (err) {
    console.error("Failed to group errors:", err);
    res.status(500).json({ success: false });
  }
});

app.get("/error/:id/full-snippet", async (req, res) => {
  try {
    const error = await convex.query(api.errors.getErrorById, {
      id: req.params.id,
    });

    if (!error) {
      return res.status(404).json({
        success: false,
        message: "Error not found",
      });
    }

    res.json({
      success: true,
      codeSnippet: error.codeSnippet || [],
    });
  } catch (err) {
    console.error("Failed to fetch full snippet:", err);
    res.status(500).json({ success: false });
  }
});

app.get("/error/:id/latest-snippet", async (req, res) => {
  try {
    const codeSnippet = await getLatestSnippet({ id: req.params.id }, { convex });
    res.json({
      success: true,
      codeSnippet,
    });
  } catch (err) {
    if (err.message === "Error not found") {
      return res.status(404).json({
        success: false,
        message: "Error not found",
      });
    }
    if (err.message === "Latest snippet is only available after a resolved replay") {
      return res.status(409).json({
        success: false,
        message: err.message,
      });
    }

    console.error("Failed to fetch latest snippet:", err);
    res.status(500).json({ success: false });
  }
});
/**
 * TEST MANUAL ERROR
 */
app.get("/test-error", async (req, res) => {
  await (async function anotherService() {
    const err = new Error("failure in service");
    await captureDuck(err, { url: "/test-error" });
  })();

  res.status(200).json({ message: "Triggered manual error" });
});
/**
 * TEST PROMISE ERROR
 */
app.get("/test-promise-error", async (req, res) => {
  await new Promise((_, reject) => {
    reject(new Error("Manual promise error"));
  }).catch(async (err) => {
    await captureDuck(err, { url: "/promiseService" });
  });

  res.status(200).json({ message: "Promise handled manually" });
});

// app.use("/products", async (req, res, next) => {
//   try {
//     const { data } = await axios.get("https://dummyjson.com/products");

//     if (!Array.isArray(data.products.id)) {
//       throw new Error("Invalid API response: products is not an array");
//     }

//     if (!data.products.length) {
//       throw new Error("No products found");
//     }

//     return res.status(200).json(data.products[0].id);
//   } catch (error) {
//     await captureDuck(error, { url: "/products" });
//     return res.status(500).json({ error: "internal server error" });
//   }
// });

app.post("/products/add", addProductController);

app.post("/errors/:id/replay-service", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      message: "Replay disabled in production",
    });
  }

  try {
    const error = await convex.query(api.errors.getErrorById, {
      id: req.params.id,
    });
    if (!error) {
      return res.status(404).json({
        success: false,
        message: "Error not found",
      });
    }

    const transactionId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    const txEnvelope = await runTx({ transactionId, dryRun: true }, async (tx) => {
      const beginResult = await tx.write("begin_replay_transaction", () =>
        convex.mutation(api.errors.beginReplayTransaction, {
          errorId: error._id,
          transactionId,
          originalMessage: error.message,
          originalFingerPrint: error.fingerPrint,
          startedAt,
        }),
      );

      const result = await replayService(error, { dryRun: true });

      const replayMessage =
        typeof result === "string"
          ? result
          : result?.message || JSON.stringify(result || {});
      const replayFingerPrint = getFingerPrint({
        message: replayMessage,
        url: error.url,
        type: error.type,
        parsedStack: error.parsedStack || [],
      });
      const isSimulatedReplay = Boolean(result?.simulated);
      const isResolved =
        !isSimulatedReplay &&
        replayFingerPrint !== error.fingerPrint &&
        replayMessage !== error.message;

      await tx.write("complete_replay_transaction_success", () =>
        convex.mutation(api.errors.completeReplayTransaction, {
          errorId: error._id,
          transactionId,
          status: "success",
          replayMessage,
          replayFingerPrint,
          isResolved,
          resolutionStatus: isResolved ? "resolved" : "not_yet_resolved",
          compared: true,
          completedAt: new Date().toISOString(),
        }),
      );

      return {
        beginResult,
        result,
        isResolved,
        resolutionStatus: isResolved ? "resolved" : "not_yet_resolved",
      };
    });

    const { beginResult, result, isResolved, resolutionStatus } = txEnvelope.result;

    res.json({
      success: true,
      transactionId,
      attemptNumber: beginResult.attemptNumber,
      compared: true,
      isResolved,
      resolutionStatus,
      result,
      txOperations: txEnvelope.operations,
    });
  } catch (err) {
    res.status(500).json(
      buildClientErrorResponse(err, {
        code: "REPLAY_FAILED",
        defaultMessage: "Replay failed",
        includeStack: false,
      }),
    );
  }
});

app.post("/products/errors/:id/replay-service", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      message: "Replay disabled in production",
    });
  }

  try {
    const error = await convex.query(api.errors.getErrorById, {
      id: req.params.id,
    });

    if (!error) {
      return res.status(404).json({
        success: false,
        message: "Error not found",
      });
    }

    if (error.serviceContext?.service !== "addProduct") {
      return res.status(400).json({
        success: false,
        message: "Replay is only supported for product add service",
      });
    }

    const transactionId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    const txEnvelope = await runTx({ transactionId, dryRun: true }, async (tx) => {
      const beginResult = await tx.write("begin_replay_transaction", () =>
        convex.mutation(api.errors.beginReplayTransaction, {
          errorId: error._id,
          transactionId,
          originalMessage: error.message,
          originalFingerPrint: error.fingerPrint,
          startedAt,
        }),
      );

      const result = await replayService(error, {
        dryRun: true,
        transactionId,
        transactionMode: "dry-run",
      });

      const replayMessage =
        typeof result === "string"
          ? result
          : result?.message || JSON.stringify(result || {});
      const replayFingerPrint = getFingerPrint({
        message: replayMessage,
        url: error.url,
        type: error.type,
        parsedStack: error.parsedStack || [],
      });
      const isSimulatedReplay = Boolean(result?.simulated);
      const isResolved =
        !isSimulatedReplay &&
        replayFingerPrint !== error.fingerPrint &&
        replayMessage !== error.message;

      await tx.write("complete_replay_transaction_success", () =>
        convex.mutation(api.errors.completeReplayTransaction, {
          errorId: error._id,
          transactionId,
          status: "success",
          replayMessage,
          replayFingerPrint,
          isResolved,
          resolutionStatus: isResolved ? "resolved" : "not_yet_resolved",
          compared: true,
          completedAt: new Date().toISOString(),
        }),
      );

      return {
        beginResult,
        result,
        isResolved,
        resolutionStatus: isResolved ? "resolved" : "not_yet_resolved",
      };
    });

    const { beginResult, result, isResolved, resolutionStatus } = txEnvelope.result;

    res.json({
      success: true,
      transactionId,
      attemptNumber: beginResult.attemptNumber,
      compared: true,
      isResolved,
      resolutionStatus,
      result,
      txOperations: txEnvelope.operations,
    });
  } catch (err) {
    res.status(500).json(
      buildClientErrorResponse(err, {
        code: "PRODUCT_REPLAY_FAILED",
        defaultMessage: "Replay failed",
        includeStack: false,
      }),
    );
  }
});

app.get("/posthog/recordings", async (req, res) => {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const region = process.env.POSTHOG_REGION === "eu" ? "eu" : "us";
  const configuredHost = process.env.POSTHOG_APP_HOST || null;
  const fallbackHosts =
    region === "eu"
      ? ["https://eu.posthog.com", "https://app.posthog.com"]
      : ["https://app.posthog.com", "https://us.posthog.com"];
  const hosts = [configuredHost, ...fallbackHosts].filter(Boolean);

  if (!apiKey || !projectId) {
    return res.status(400).json({
      success: false,
      message:
        "Missing PostHog server config (POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID).",
    });
  }

  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    let payload = null;
    let resolvedHost = hosts[0];
    let lastError = null;

    for (const host of hosts) {
      const url = `${host.replace(/\/$/, "")}/api/projects/${projectId}/session_recordings?limit=${limit}`;
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            const detail = data?.detail || data?.message || "";
            const looksLikeProjectKey = String(apiKey).startsWith("phc_");
            const authHint = looksLikeProjectKey
              ? "Use POSTHOG_PERSONAL_API_KEY (phx_...), not project key (phc_...)."
              : "Check that this personal key has access to the target project/org and that POSTHOG_PROJECT_ID is correct.";
            return res.status(response.status).json({
              success: false,
              message: detail
                ? `PostHog auth failed: ${detail}. ${authHint}`
                : `PostHog auth failed. ${authHint}`,
            });
          }
          lastError =
            data?.detail ||
            data?.message ||
            `PostHog request failed (${response.status})`;
          continue;
        }

        payload = data;
        resolvedHost = host;
        break;
      } catch (err) {
        lastError = err?.message || "fetch failed";
      }
    }

    if (!payload) {
      return res.status(502).json({
        success: false,
        message:
          lastError ||
          "Unable to reach PostHog API. Check POSTHOG_REGION/POSTHOG_APP_HOST and network.",
      });
    }

    const results = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload)
        ? payload
        : [];

    const recordings = results
      .map((rec) => {
        const sessionId = rec?.session_id || rec?.id || null;
        const startTime = rec?.start_time || rec?.created_at || null;
        const endTime = rec?.end_time || null;
        const explicitDuration =
          rec?.recording_duration_s ?? rec?.duration_s ?? null;
        const hasEndTime = Boolean(endTime);
        const isOngoing = hasEndTime ? false : Boolean(rec?.ongoing);
        const derivedDuration =
          !explicitDuration && startTime && endTime
            ? Math.max(
                0,
                Math.round(
                  (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000,
                ),
              )
            : null;
        return {
          id: rec?.id || sessionId,
          sessionId,
          distinctId: rec?.distinct_id || null,
          startTime,
          endTime,
          durationSeconds: explicitDuration ?? derivedDuration,
          ongoing: isOngoing,
          viewed: Boolean(rec?.viewed),
          replayUrl:
            rec?.viewer_url ||
            (sessionId
              ? `${resolvedHost.replace(/\/$/, "")}/project/${projectId}/replay/${sessionId}`
              : null),
        };
      })
      .sort((a, b) => {
        const at = new Date(a.startTime || 0).getTime();
        const bt = new Date(b.startTime || 0).getTime();
        return bt - at;
      });

    res.json({
      success: true,
      recordings,
    });
  } catch (err) {
    res.status(500).json(
      buildClientErrorResponse(err, {
        code: "POSTHOG_RECORDINGS_FETCH_FAILED",
        defaultMessage: "Failed to fetch recordings",
        includeStack: false,
      }),
    );
  }
});

/**
 * GLOBAL ERROR MIDDLEWARE
 */
app.use(async (err, req, res, next) => {
  console.error("Global Error:", err.message);

  await captureDuck(err, {
    url: req.originalUrl,
  });

  res.status(500).json(
    buildClientErrorResponse(err, {
      code: "INTERNAL_SERVER_ERROR",
      defaultMessage: "Internal Server Error",
      includeStack: false,
    }),
  );
});

/**
 * UNCAUGHT ERRORS
 */
process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);

  await captureDuck(err, {
    url: "uncaughtException",
  });
});

process.on("unhandledRejection", async (reason) => {
  console.error("Unhandled Rejection:", reason);

  await captureDuck(
    reason instanceof Error ? reason : new Error(String(reason)),
    {
      url: "unhandledRejection",
    },
  );
});

app.listen(8080, () => {
  console.log("Server running on http://localhost:8080");
});
