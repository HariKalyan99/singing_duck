export async function triggerManualServiceError() {
  throw new Error("failure in service");
}

export async function triggerPromiseServiceError() {
  return await new Promise((resolve, reject) => {
    reject(new Error("Manual promise error"));
  });
}
