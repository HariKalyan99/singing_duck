export async function runTx(options, fn) {
  const { transactionId, dryRun = false } = options;
  const operations = [];

  const tx = {
    async read(label, reader) {
      const startedAt = new Date().toISOString();
      const value = await reader();
      operations.push({
        type: "read",
        label,
        startedAt,
        completedAt: new Date().toISOString(),
      });
      return value;
    },
    async write(label, writer) {
      const startedAt = new Date().toISOString();
      const value = await writer();
      operations.push({
        type: "write",
        label,
        dryRun,
        startedAt,
        completedAt: new Date().toISOString(),
      });
      return value;
    },
  };

  const result = await fn(tx);
  return {
    transactionId,
    dryRun,
    operations,
    result,
  };
}
