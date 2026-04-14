export default function PricingSection() {
    return (
        <section id="pricing" className="mt-28">
            <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="font-domine text-3xl">Quick curl verification</h3>
                <p className="mt-2 text-sm/6 text-gray-600">
                    After DB + PostHog setup, use this to confirm the API returns a response and the flow is testable.
                </p>

                <pre className="mt-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100 md:text-sm">
{`# Server is running on 8080 in current codebase
# 1) Trigger success path
curl -X POST http://localhost:8080/products/add \\
  -H "Content-Type: application/json" \\
  -H "x-transaction-id: tx-local-001" \\
  -d '{
    "title": "docs-product-1",
    "description": "created from docs",
    "price": 199
  }'

# 2) Trigger controlled error (captured by captureDuck)
curl -X POST http://localhost:8080/products/add \\
  -H "Content-Type: application/json" \\
  -H "x-transaction-id: tx-local-002" \\
  -d '{
    "title": "docs-product-2",
    "description": "forced failure demo",
    "price": 199,
    "simulateError": true
  }'

# 3) Inspect collected errors
curl -X GET http://localhost:8080/errors

# 4) Optional replay (dev only; blocked in production)
curl -X POST http://localhost:8080/products/errors/<ERROR_ID>/replay-service`}
                </pre>
            </div>
        </section>
    );
}