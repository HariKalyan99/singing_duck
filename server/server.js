import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import crypto from "crypto";

import getFingerPrint from "./helper/getFingerPrint.js";
import captureDuck from "./main/captureDuck.js";

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

    const result = await replayService(error, { dryRun: true });

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
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
    res.status(500).json({
      success: false,
      message: err.message,
    });
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

  res.status(500).json({
    message: "Internal Server Error",
  });
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
