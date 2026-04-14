import express from "express";
import cors from "cors";
import { createCaptureDuck } from "@singing-duck/capture-duck/node";

const app = express();
const PORT = Number(process.env.PORT || 8090);

app.use(cors());
app.use(express.json());

const capturedErrors = [];

const captureDuck = createCaptureDuck({
  readSnippet: null,
  report: async (payload) => {
    capturedErrors.unshift(payload);
  },
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "capture-duck-trial-backend" });
});

app.get("/errors", (_req, res) => {
  res.json({
    success: true,
    count: capturedErrors.length,
    data: capturedErrors.slice(0, 20),
  });
});

app.post("/trigger-error", async (req, res) => {
  try {
    const { message = "Manual backend trigger from trial app" } = req.body || {};
    throw new Error(message);
  } catch (error) {
    const result = await captureDuck(error, {
      url: "/trigger-error",
      type: "backend",
      serviceContext: {
        service: "trialTrigger",
        payload: req.body || {},
      },
    });

    return res.status(500).json({
      success: false,
      message: "Triggered and captured backend error",
      captureResult: result,
    });
  }
});

app.listen(PORT, () => {
  console.log(`trial backend running on http://localhost:${PORT}`);
});
