import express from "express";
import cors from "cors";
import crypto from "crypto";
import parseStackTrace from "./helper/parseStackTrace.js";
import getCodeSnippet from "./helper/getCodeSnippet.js";
import getFingerPrint from "./helper/getFingerPrint.js";
import captureDuck from "./main/captureDuck.js";

export const errorDB = [];

const app = express();

app.use(cors());
app.use(express.json());

app.post("/errors", (req, res) => {
  const { message, stack, url, userAgent, type = "frontend" } = req.body;

  const parsedStack = parseStackTrace(stack);

  const topFrame = parsedStack?.[0];

  let codeSnippet = null;

  if (topFrame?.file && topFrame?.line) {
    codeSnippet = getCodeSnippet(topFrame.file, topFrame.line);
  }

  const errorObject = {
    id: crypto.randomUUID(),
    message,
    stack,
    rawStack: stack,
    url,
    userAgent,
    type,
    codeSnippet,
    timeStamp: new Date().toISOString(),
  };

  errorObject.fingerPrint = getFingerPrint(errorObject);

  errorDB.push(errorObject);

  res.status(200).json({ success: true, data: errorDB });
});

app.get("/errors", (req, res) => {
  res.status(200).json({ success: true, data: errorDB });
});

app.get("/all-errors", (req, res) => {
  const grouped = {};

  errorDB.forEach((err) => {
    if (!grouped[err.fingerPrint]) {
      grouped[err.fingerPrint] = {
        count: 0,
        error: err,
      };
    }
    grouped[err.fingerPrint].count++;
  });

  res.json(Object.values(grouped));
});

app.get("/test-error", (req, res, next) => {
  try {
    // const obj = null;
    // console.log(obj.name);

    (function anotherService() {
      const err = new Error("failure in service");
      captureDuck(err, { url: "anotherService" });
    })();

    res.status(200).json({ message: "Try this for errors" });
  } catch (error) {
    next(error);
  }
});

app.get("/test-promise-error", (req, res) => {
  new Promise((_, reject) => {
    reject(new Error("Manual promise error"));
  }).catch((err) => {
    captureDuck(err, { url: "promiseService" });
  });

  res.json({ message: "Promise handled manually" });
});

// global error middleware after routes
app.use((err, req, res) => {
  console.error("Global Error:", err.message);

  captureDuck(err, {
    url: req.originalUrl,
  });

  res.status(500).json({
    message: "Internal Server Error",
  });
});

// uncaught errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);

  captureDuck(err, {
    url: "uncaughtException",
  });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);

  captureDuck(reason instanceof Error ? reason : new Error(String(reason)), {
    url: "unhandledRejection",
  });
});

app.listen(8080, () => {
  console.log("Server running on http://localhost:8080");
});
