import { validateProductSchema } from "../schemas/productSchema.js";
import { api } from "../convex/_generated/api.js";
import { getConvex } from "../src/lib/convex.js";

const convex = getConvex();

export async function addProduct(payload, context = {}) {
  const {
    dryRun = false,
    transactionId = null,
    transactionMode = "write",
  } = context;

  if (payload?.simulateError) {
    const error = new Error("Forced product error for capture/replay workflow");
    error.statusCode = 500;
    error.code = "PRODUCT_SIMULATED_FAILURE";
    throw error;
  }

  const validatedProduct = validateProductSchema(payload);
  const titleLower = validatedProduct.title.toLowerCase();

  const existing = await convex.query(api.products.getByTitle, {
    title: validatedProduct.title,
  });

  if (existing && existing.title.toLowerCase() === titleLower) {
    const error = new Error(
      `Business rule failed: product with title "${validatedProduct.title}" already exists`,
    );
    error.statusCode = 400;
    throw error;
  }

  // Intentionally buggy path for replay workflow:
  // submit with triggerKnownBug=true, fix backend code, then replay.
  if (payload?.triggerKnownBug) {
    const adjustedPrice = buggyPriceCalculator(validatedProduct.price);
    return {
      adjustedPrice,
    };
  }

  if (dryRun) {
    return {
      simulated: false,
      message: "Dry run addProduct succeeded",
      transaction: {
        id: transactionId,
        mode: transactionMode,
      },
      preview: {
        ...validatedProduct,
        createdAt: new Date().toISOString(),
      },
    };
  }

  return await convex.mutation(api.products.addProduct, {
    ...validatedProduct,
    createdAt: new Date().toISOString(),
  });
}
