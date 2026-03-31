import { fetchFirstProduct } from "./productService.js";
import { ingestFrontendError } from "./frontendErrorService.js";
import { getRecentErrors } from "./errorService.js";

export const serviceRegistry = {
  fetchFirstProduct,
  ingestFrontendError,
  getRecentErrors,
};
