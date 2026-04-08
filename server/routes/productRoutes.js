import { Router } from "express";
import { addProductController } from "../controllers/productController.js";

const router = Router();

router.post("/products/add", addProductController);

export default router;
