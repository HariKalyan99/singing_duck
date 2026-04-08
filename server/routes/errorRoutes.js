import { Router } from "express";
import {
  clearErrorsController,
  getErrorsController,
  getFullSnippetController,
  getGroupedErrorsController,
  getLatestSnippetController,
  ingestFrontendErrorController,
  replayErrorController,
  replayProductErrorController,
} from "../controllers/errorController.js";

const router = Router();

router.post("/errors", ingestFrontendErrorController);
router.get("/errors", getErrorsController);
router.delete("/errors", clearErrorsController);
router.get("/all-errors", getGroupedErrorsController);
router.get("/error/:id/full-snippet", getFullSnippetController);
router.get("/error/:id/latest-snippet", getLatestSnippetController);
router.post("/errors/:id/replay-service", replayErrorController);
router.post("/products/errors/:id/replay-service", replayProductErrorController);

export default router;
