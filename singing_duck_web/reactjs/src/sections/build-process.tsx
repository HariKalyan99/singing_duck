const steps = [
    "Create `.env` for server with Convex + PostHog keys.",
    "Run backend on port 8080 with `npm run dev` inside `server`.",
    "Run frontend docs with `npm run dev` inside `singing_duck_web/reactjs`.",
    "Test `/products/add` and inspect stored errors via `/errors`.",
];

export default function BuildProcess() {
    return (
        <section id="process" className="mt-28">
            <p className="text-center font-domine">Developer Flow</p>
            <h3 className="mt-3 text-center text-3xl text-gray-700">From configuration to first response</h3>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <p className="mb-3 font-medium text-gray-800">Step-by-step checklist</p>
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600">
                        {steps.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <p className="mb-3 font-medium text-gray-800">Capture Duck integration from current server</p>
                    <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100 md:text-sm">
{`// server/main/captureDuck.js
import { createCaptureDuck } from "@singing-duck/capture-duck/node";
import { api } from "../convex/_generated/api.js";
import { getConvex } from "../src/lib/convex.js";

const convex = getConvex();

export default createCaptureDuck({
  report: (payload) =>
    convex.mutation(api.errors.reportError, {
      message: payload.message,
      rawStack: payload.rawStack,
      url: payload.url,
      type: payload.type,
      fingerPrint: payload.fingerPrint,
      serviceContext: payload.serviceContext,
    }),
});`}
                    </pre>
                </div>
            </div>
        </section>
    );
}