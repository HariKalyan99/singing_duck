export async function triggerManualServiceError(_, context = {}) {
  const { dryRun = false } = context;
  if (dryRun) {
    return { simulated: true, service: "triggerManualServiceError" };
  }

  throw new Error("failure in service");
}

export async function triggerPromiseServiceError(_, context = {}) {
  const { dryRun = false } = context;
  if (dryRun) {
    return { simulated: true, service: "triggerPromiseServiceError" };
  }

  await Promise.reject(new Error("Manual promise error"));
}


// export async function triggerManualServiceError(_, context = {}) {
//   // For this test service, dry-run should mirror real logic so replay can
//   // correctly report resolved vs not-yet-resolved.
//   // throw new Error("failure in service");
//   return "success";
// }

// export async function triggerPromiseServiceError(_, context = {}) {
//   // Keep parity between dry-run replay and real execution outcome.
//   await Promise.reject(new Error("Manual promise error"));
// }
