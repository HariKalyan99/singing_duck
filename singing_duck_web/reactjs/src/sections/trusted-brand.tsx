export default function TrustedBrand() {
    return (
        <section className="mt-24">
            <p className="py-3 text-center text-base text-gray-700">
                Local development and production directions
            </p>

            <div className="mx-auto w-full max-w-4xl rounded-xl border border-gray-200 bg-white p-5">
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100 md:text-sm">
{`# LOCAL SETUP
# 1) Install + start server (Express)
cd server
npm install
npm run dev   # runs on http://localhost:8080

# 2) Install + start web docs/client
cd ../singing_duck_web/reactjs
npm install
npm run dev   # default Vite local URL

# PRODUCTION GUIDANCE
# - Set NODE_ENV=production
# - Run server with: npm start (inside /server)
# - Build client once: npm run build (inside /reactjs)
# - Serve dist via static hosting/CDN
# - Keep replay routes disabled in prod (already enforced by code)
# - Store secrets in env manager, never in git`}
                </pre>
            </div>
        </section>
    );
}