export default function HeroSection() {
    return (
        <section id="home" className="mt-20 flex flex-col items-center justify-center">
            <p className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm text-emerald-700">
                JavaScript-first documentation for Singing Duck
            </p>

            <h1 className="mt-5 max-w-3xl text-center text-4xl font-semibold text-gray-900 md:text-6xl/18">
                Ship a working Singing Duck flow with copy-paste friendly docs
            </h1>

            <p className="mt-4 max-w-2xl text-center text-base text-gray-600">
                This guide is suitable for <strong>JavaScript (Node.js)</strong>. Before testing end-to-end,
                configure your database and PostHog so events and responses can be validated correctly.
            </p>

            <div className="mt-8 w-full max-w-4xl rounded-xl border border-gray-200 bg-white p-5">
                <p className="mb-3 font-medium text-gray-800">Quick start environment template</p>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100 md:text-sm">
{`# .env
# Convex backend
CONVEX_URL=https://<your-deployment>.convex.cloud
CONVEX_ADMIN_KEY=<server-admin-key>

# PostHog settings for /posthog/recordings endpoint
POSTHOG_PERSONAL_API_KEY=phx_xxxxxxxxxxxxxxxxx
POSTHOG_PROJECT_ID=<project-id>
POSTHOG_REGION=us
POSTHOG_APP_HOST=https://app.posthog.com

# Runtime
NODE_ENV=development`}
                </pre>
            </div>
        </section>
    );
}