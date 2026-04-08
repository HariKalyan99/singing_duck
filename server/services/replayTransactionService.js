import crypto from "crypto";
import getFingerPrint from "../helper/getFingerPrint.js";
import { api } from "../convex/_generated/api.js";
import { runTx } from "./transactionService.js";
import { replayService } from "./replayService.js";

export async function runReplayTransaction(
  { errorId, expectedService },
  { convex },
) {
  const transactionId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  const txEnvelope = await runTx({ transactionId, dryRun: true }, async (tx) => {
    const error = await tx.read("get_error_by_id", () =>
      convex.query(api.errors.getErrorById, { id: errorId }),
    );

    if (!error) {
      throw new Error("Error not found");
    }

    if (expectedService && error.serviceContext?.service !== expectedService) {
      throw new Error(`Replay is only supported for ${expectedService}`);
    }

    const replayable =
      Boolean(error.serviceContext?.service) &&
      error.serviceContext?.replayable !== false;

    if (!replayable) {
      throw new Error("Replay not available for this error");
    }

    const beginResult = await tx.write("begin_replay_transaction", () =>
      convex.mutation(api.errors.beginReplayTransaction, {
        errorId: error._id,
        transactionId,
        originalMessage: error.message,
        originalFingerPrint: error.fingerPrint,
        startedAt,
      }),
    );

    const result = await replayService(error, {
      dryRun: true,
      transactionId,
      transactionMode: "dry-run",
    });

    const replayMessage =
      typeof result === "string"
        ? result
        : result?.message || JSON.stringify(result || {});
    const replayFingerPrint = getFingerPrint({
      message: replayMessage,
      url: error.url,
      type: error.type,
      parsedStack: error.parsedStack || [],
    });
    const isSimulatedReplay = Boolean(result?.simulated);
    const isResolved =
      !isSimulatedReplay &&
      replayFingerPrint !== error.fingerPrint &&
      replayMessage !== error.message;

    await tx.write("complete_replay_transaction_success", () =>
      convex.mutation(api.errors.completeReplayTransaction, {
        errorId: error._id,
        transactionId,
        status: "success",
        replayMessage,
        replayFingerPrint,
        isResolved,
        resolutionStatus: isResolved ? "resolved" : "not_yet_resolved",
        compared: true,
        completedAt: new Date().toISOString(),
      }),
    );

    return {
      beginResult,
      result,
      isResolved,
      resolutionStatus: isResolved ? "resolved" : "not_yet_resolved",
    };
  });

  const { beginResult, result, isResolved, resolutionStatus } = txEnvelope.result;
  return {
    transactionId,
    attemptNumber: beginResult.attemptNumber,
    compared: true,
    isResolved,
    resolutionStatus,
    result,
    txOperations: txEnvelope.operations,
  };
}
