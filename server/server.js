import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import captureDuck from "./main/captureDuck.js";
import buildServiceContext from "./helper/buildServiceContext.js";
import errorRoutes from "./routes/errorRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import productRoutes from "./routes/productRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(errorRoutes);
app.use(testRoutes);
app.use(productRoutes);

/**
 * GLOBAL ERROR MIDDLEWARE
 */
app.use(async (err, req, res, next) => {
  console.error("Global Error:", err.message);

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
  console.error("Uncaught Exception:", err);

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
  console.error("Unhandled Rejection:", reason);

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
  console.log("Server running on http://localhost:8080");
});
