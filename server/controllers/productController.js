import captureDuck from "../main/captureDuck.js";
import { addProduct } from "../services/productService.js";

export async function addProductController(req, res) {
  const transactionId = req.headers["x-transaction-id"] || null;

  try {
    const product = await addProduct(req.body, {
      transactionId,
      transactionMode: "write",
    });

    return res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    await captureDuck(error, {
      url: "/products/add",
      serviceContext: {
        service: "addProduct",
        payload: req.body,
        context: {
          dryRun: false,
          transactionId,
          transactionMode: "write",
        },
        replayable: true,
      },
    });

    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "internal server error",
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    });
  }
}
