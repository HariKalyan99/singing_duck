import trimSnippet from "../helper/trimSnippet.js";
import { api } from "../convex/_generated/api.js";

export async function getRecentErrors(_, { convex }) {
  const errors = await convex.query(api.errors.getRecentErrors);

  return errors.map((err) => ({
    ...err,
    codeSnippet: trimSnippet(err.codeSnippet, 5),
  }));
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

  return error.codeSnippet || [];
}
