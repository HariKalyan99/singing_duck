import { addProduct } from "./productService.js";
import { ingestFrontendError } from "./frontendErrorService.js";
import { getRecentErrors } from "./errorService.js";
import {
  triggerManualServiceError,
  triggerPromiseServiceError,
} from "./testService.js";

export const serviceRegistry = {
  addProduct,
  ingestFrontendError,
  getRecentErrors,
  triggerManualServiceError,
  triggerPromiseServiceError,
};
