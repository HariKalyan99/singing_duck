import { addProduct } from "./productService.js";
import { ingestFrontendError } from "./frontendErrorService.js";
import { getRecentErrors } from "./errorService.js";

export const serviceRegistry = {
  addProduct,
  ingestFrontendError,
  getRecentErrors,
};
