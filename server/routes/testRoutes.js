import { Router } from "express";
import {
  testErrorController,
  testPromiseErrorController,
} from "../controllers/testErrorController.js";

const router = Router();

router.get("/test-error", testErrorController);
router.get("/test-promise-error", testPromiseErrorController);

export default router;
