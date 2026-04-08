export function validateProductSchema(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    const error = new Error("Invalid payload: product data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const { title, price, category = "general", stock = 0, description = "" } =
    payload;

  if (typeof title !== "string" || title.trim().length < 2) {
    const error = new Error(
      "Validation failed: title is required and must be at least 2 characters",
    );
    error.statusCode = 400;
    throw error;
  }

  if (typeof price !== "number" || Number.isNaN(price) || price <= 0) {
    const error = new Error("Validation failed: price must be a positive number");
    error.statusCode = 400;
    throw error;
  }

  if (typeof category !== "string" || !category.trim()) {
    const error = new Error("Validation failed: category must be a non-empty string");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(stock) || stock < 0) {
    const error = new Error("Validation failed: stock must be a non-negative integer");
    error.statusCode = 400;
    throw error;
  }

  if (typeof description !== "string") {
    const error = new Error("Validation failed: description must be a string");
    error.statusCode = 400;
    throw error;
  }

  return {
    title: title.trim(),
    price,
    category: category.trim(),
    stock,
    description: description.trim(),
  };
}
