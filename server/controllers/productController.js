import captureDuck from "../main/captureDuck.js";
import { addProduct } from "../services/productService.js";
import { buildClientErrorResponse } from "@singing-duck/capture-duck/node";

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

    return res.status(500).json(
      buildClientErrorResponse(error, {
        code: "PRODUCT_CREATE_FAILED",
        defaultMessage: "internal server error",
        requestId: transactionId || undefined,
        includeStack: false,
      }),
    );
  }
}
