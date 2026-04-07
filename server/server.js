import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import crypto from "crypto";
import morgan from "morgan";
import winston from "winston";

import getFingerPrint from "./helper/getFingerPrint.js";
import captureDuck from "./main/captureDuck.js";

import { api } from "./convex/_generated/api.js";
import { getConvex } from "./src/lib/convex.js";
import { fetchFirstProduct } from "./services/productService.js";
import { ingestFrontendError } from "./services/frontendErrorService.js";
import {
  clearErrors,
  getFullSnippet,
  getLatestSnippet,
  getGroupedErrors,
  getRecentErrors,
} from "./services/errorService.js";
import { replayService } from "./services/replayService.js";
import {
  triggerManualServiceError,
  triggerPromiseServiceError,
} from "./services/testService.js";
import { runTx } from "./services/transactionService.js";

const convex = getConvex();

const app = express();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

app.use(cors());
app.use(express.json());
app.use(
  morgan(":method :url :status :response-time ms - :res[content-length]", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }),
);

function buildServiceContext(req, service, replayable = true, extras = {}) {
  return {
    service,
    payload: {
      params: req.params || {},
      query: req.query || {},
      body: req.body || null,
    },
    context: {
      route: req.originalUrl,
      method: req.method,
      ...extras,
    },
    replayable,
  };
}

/**
 * FRONTEND ERROR INGESTION
 */
app.post("/errors", async (req, res) => {
  try {
    const result = await ingestFrontendError(req.body, { convex });
    res.status(200).json(result);
  } catch (err) {
    logger.error(`Failed to store frontend error: ${err.message}`);
    res.status(500).json({ success: false });
  }
});

/**
 * GET RECENT ERRORS
 */
app.get("/errors", async (req, res) => {
  try {
    const formatted = await getRecentErrors(null, { convex });
    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    logger.error(`Failed to fetch errors: ${err.message}`);
    res.status(500).json({ success: false });
  }
});

app.delete("/errors", async (req, res) => {
  try {
    const result = await clearErrors(null, { convex });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/**
 * GROUPED ERRORS (server-side grouping)
 */
app.get("/all-errors", async (req, res) => {
  try {
    const groupedWithReplay = await getGroupedErrors(null, { convex });
    res.json(groupedWithReplay);
  } catch (err) {
    logger.error(`Failed to group errors: ${err.message}`);
    res.status(500).json({ success: false });
  }
});

app.get("/error/:id/full-snippet", async (req, res) => {
  try {
    const codeSnippet = await getFullSnippet({ id: req.params.id }, { convex });
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
    logger.error(`Failed to fetch full snippet: ${err.message}`);
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
    logger.error(`Failed to fetch latest snippet: ${err.message}`);
    res.status(500).json({ success: false });
  }
});
/**
 * TEST MANUAL ERROR
 */
app.get("/test-error", async (req, res) => {
  try {
    await triggerManualServiceError();
  } catch (err) {
    await captureDuck(err, {
      url: "/test-error",
      serviceContext: buildServiceContext(req, "triggerManualServiceError", true),
    });
  }

  res.status(200).json({ message: "Triggered manual error" });
});
/**
 * TEST PROMISE ERROR
 */
app.get("/test-promise-error", async (req, res) => {
  await triggerPromiseServiceError().catch(async (err) => {
    await captureDuck(err, {
      url: "/promiseService",
      serviceContext: buildServiceContext(req, "triggerPromiseServiceError", true),
    });
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

app.get("/products", async (req, res, next) => {
  try {
    const result = await fetchFirstProduct(
      {
        params: req.params || {},
        query: req.query || {},
        body: req.body || null,
      },
      {},
    );
    return res.status(200).json(result);
  } catch (error) {
    await captureDuck(error, {
      url: "/products",
      serviceContext: buildServiceContext(req, "fetchFirstProduct", true),
    });

    return res.status(500).json({ error: "internal server error" });
  }
});

app.post("/errors/:id/replay-service", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      message: "Replay disabled in production",
    });
  }

  const transactionId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  try {
    const txEnvelope = await runTx(
      { transactionId, dryRun: true },
      async (tx) => {
        const error = await tx.read("get_error_by_id", () =>
          convex.query(api.errors.getErrorById, { id: req.params.id }),
        );

        if (!error) {
          throw new Error("Error not found");
        }

        const replayable =
          Boolean(error.serviceContext?.service) &&
          error.serviceContext?.replayable !== false;

        if (!replayable) {
          throw new Error("Replay not available for this error");
        }

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

        const completedAt = new Date().toISOString();

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
            completedAt,
          }),
        );

        return {
          beginResult,
          result,
          isResolved,
          resolutionStatus: isResolved ? "resolved" : "not_yet_resolved",
        };
      },
    );
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
    if (err.message === "Error not found") {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }
    if (err.message === "Replay not available for this error") {
      return res.status(400).json({
        success: false,
        message:
          "Replay not available for this error. Missing replayable service context.",
      });
    }

    try {
      await convex.mutation(api.errors.completeReplayTransaction, {
        errorId: req.params.id,
        transactionId,
        status: "failed",
        replayMessage: err.message,
        replayFingerPrint: undefined,
        isResolved: false,
        resolutionStatus: "not_yet_resolved",
        compared: true,
        completedAt: new Date().toISOString(),
      });
    } catch {
      // swallow logging failure and return original replay failure
    }

    res.status(500).json({
      success: false,
      message: err.message,
      transactionId,
    });
  }
});

/**
 * GLOBAL ERROR MIDDLEWARE
 */
app.use(async (err, req, res, next) => {
  logger.error(`Global Error: ${err.message}`);

  await captureDuck(err, {
    url: req.originalUrl,
    serviceContext: buildServiceContext(
      req,
      "globalRouteErrorHandler",
      false,
      { reason: "global_error_middleware" },
    ),
  });

  res.status(500).json({
    message: "Internal Server Error",
  });
});

/**
 * UNCAUGHT ERRORS
 */
process.on("uncaughtException", async (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);

  await captureDuck(err, {
    url: "uncaughtException",
    serviceContext: {
      service: "uncaughtException",
      payload: null,
      context: { source: "process" },
      replayable: false,
    },
  });
});

process.on("unhandledRejection", async (reason) => {
  logger.error(`Unhandled Rejection: ${String(reason)}`);

  await captureDuck(
    reason instanceof Error ? reason : new Error(String(reason)),
    {
      url: "unhandledRejection",
      serviceContext: {
        service: "unhandledRejection",
        payload: null,
        context: { source: "process" },
        replayable: false,
      },
    },
  );
});

app.listen(8080, () => {
  logger.info("Server running on http://localhost:8080");
});
