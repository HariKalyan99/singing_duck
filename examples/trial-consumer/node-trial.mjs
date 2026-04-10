import { createCaptureDuck } from "@singing-duck/capture-duck/node";

const captureDuck = createCaptureDuck({
  readSnippet: null,
  report: async (payload) => {
    console.log("[trial] captured:", {
      message: payload.message,
      fingerPrint: payload.fingerPrint,
      frames: payload.parsedStack.length,
    });
  },
});

const inner = () => {
  throw new Error("trial-consumer node smoke test");
};

try {
  inner();
} catch (e) {
  const out = await captureDuck(e, { url: "/trial", type: "backend" });
  if (!out.ok) {
    console.error("[trial] capture failed", out.error);
    process.exit(1);
  }
  console.log("[trial] ok, id:", out.payload.id);
}
