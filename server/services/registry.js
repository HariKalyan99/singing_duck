import { fetchFirstProduct } from "./productService.js";
import { ingestFrontendError } from "./frontendErrorService.js";
import {
  clearErrors,
  getFullSnippet,
  getLatestSnippet,
  getGroupedErrors,
  getRecentErrors,
} from "./errorService.js";
import {
  triggerManualServiceError,
  triggerPromiseServiceError,
} from "./testService.js";

export const serviceRegistry = {
  fetchFirstProduct,
  ingestFrontendError,
  getRecentErrors,
  getGroupedErrors,
  clearErrors,
  getFullSnippet,
  getLatestSnippet,
  triggerManualServiceError,
  triggerPromiseServiceError,
};
