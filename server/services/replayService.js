import { serviceRegistry } from "./registry.js";

export async function replayService(errorRecord, context) {
  if (!errorRecord?.serviceContext) {
    throw new Error("No service replay data found");
  }

  const {
    service,
    payload,
    context: storedContext,
  } = errorRecord.serviceContext;

  const fn = serviceRegistry[service];

  if (!fn) {
    throw new Error(`Service "${service}" not registered`);
  }

  return await fn(payload, {
    ...storedContext,
    ...context,
  });
}
