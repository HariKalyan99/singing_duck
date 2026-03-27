import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import crypto from "crypto";

import getFingerPrint from "./helper/getFingerPrint.js";
import captureDuck from "./main/captureDuck.js";

import { api } from "./convex/_generated/api.js";
import { getConvex } from "./src/lib/convex.js";
import axios from "axios";

const convex = getConvex();

const app = express();

app.use(cors());
app.use(express.json());

/**
 * FRONTEND ERROR INGESTION
 */
app.post("/errors", async (req, res) => {
  try {
    const { message, stack, url, userAgent, type = "frontend" } = req.body;

    const errorObject = {
      id: crypto.randomUUID(),
      message,
      stack,
      rawStack: stack,
      url,
      userAgent,
      type,
      timestamp: new Date().toISOString(),
    };

    errorObject.fingerPrint = getFingerPrint(errorObject);

    await convex.mutation(api.errors.reportError, {
      message: errorObject.message,
      stack: JSON.stringify(errorObject.stack),
      rawStack: errorObject.rawStack,
      url: errorObject.url,
      userAgent: errorObject.userAgent,
      type: errorObject.type,
      timestamp: errorObject.timestamp,
      fingerPrint: errorObject.fingerPrint,
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
    res.status(200).json({
      success: true,
      data: errors,
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
    const errors = await convex.query(api.errors.getRecentErrors);
    const grouped = {};

    errors.forEach((err) => {
      if (!grouped[err.fingerPrint]) {
        grouped[err.fingerPrint] = {
          count: 0,
          error: err,
        };
      }
      grouped[err.fingerPrint].count++;
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error("Failed to group errors:", err);
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

app.use("/products", async (req, res, next) => {
  try {
    const { data } = await axios.get("https://dummyjson.com/products");

    if (!Array.isArray(data.products.id)) {
      throw new Error("Invalid API response: products is not an array");
    }

    if (!data.products.length) {
      throw new Error("No products found");
    }

    return res.status(200).json(data.products[0].id);
  } catch (error) {
    await captureDuck(error, { url: "/products" });
    return res.status(500).json({ error: "internal server error" });
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
