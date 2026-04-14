import trimSnippet from "../helper/trimSnippet.js";
import { api } from "../convex/_generated/api.js";
import getCodeSnippet from "../helper/getCodeSnippet.js";

export async function getRecentErrors(_, { convex }) {
  const errors = await convex.query(api.errors.getRecentErrors);

  return errors.map((err) => ({
    ...err,
    codeSnippet: trimSnippet(err.codeSnippet, 5),
  }));
}

export async function getGroupedErrors(_, { convex }) {
  const errors = await convex.query(api.errors.getRecentErrors);
  const grouped = {};

  errors.forEach((err) => {
    if (!grouped[err.fingerPrint]) {
      grouped[err.fingerPrint] = {
        count: 0,
        error: {
          ...err,
          codeSnippet: trimSnippet(err.codeSnippet, 5),
        },
      };
    }
    grouped[err.fingerPrint].count++;
  });

  return await Promise.all(
    Object.values(grouped).map(async (group) => {
      const latestReplayTx = await convex.query(
        api.errors.getLatestReplayTransactionByErrorId,
        { errorId: group.error._id },
      );

      return {
        ...group,
        latestReplayTx,
      };
    }),
  );
}

export async function clearErrors(_, { convex }) {
  await convex.mutation(api.errors.clearErrors);
  return { success: true };
}

export async function getFullSnippet({ id }, { convex }) {
  const error = await convex.query(api.errors.getErrorById, { id });

  if (!error) {
    throw new Error("Error not found");
  }

  return error.originalCodeSnippet || error.codeSnippet || [];
}

export async function getLatestSnippet({ id }, { convex }) {
  const error = await convex.query(api.errors.getErrorById, { id });

  if (!error) {
    throw new Error("Error not found");
  }

  const latestReplayTx = await convex.query(
    api.errors.getLatestReplayTransactionByErrorId,
    { errorId: error._id },
  );
  const isResolved =
    error.resolutionStatus === "resolved" ||
    latestReplayTx?.resolutionStatus === "resolved" ||
    latestReplayTx?.isResolved === true;

  if (!isResolved) {
    throw new Error("Latest snippet is only available after a resolved replay");
  }

  const topFrame = error.parsedStack?.[0];
  if (!topFrame?.file || !topFrame?.line) {
    return [];
  }

  return getCodeSnippet(topFrame.file, topFrame.line) || [];
}
