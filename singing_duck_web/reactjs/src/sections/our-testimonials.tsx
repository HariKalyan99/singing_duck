export default function OurTestimonials() {
    return (
        <section className="mt-28 px-4">
            <h3 className="text-center font-domine text-3xl">Error handling + captureDuck usage</h3>
            <p className="mx-auto mt-3 max-w-3xl text-center text-sm/6 text-gray-600">
                These are the practical patterns used in your current Express server to capture service errors and return safe API responses.
            </p>

            <div className="mx-auto mt-8 max-w-5xl rounded-xl border border-gray-200 bg-white p-6">
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100 md:text-sm">
{`// controller pattern: capture, then return typed error response
app.post("/products/add", async (req, res) => {
  const transactionId = req.headers["x-transaction-id"] || null;

  try {
    const product = await addProduct(req.body, { transactionId, transactionMode: "write" });
    return res.status(201).json({ success: true, data: product });
  } catch (error) {
    await captureDuck(error, {
      url: "/products/add",
      serviceContext: {
        service: "addProduct",
        payload: req.body,
        context: { transactionId, transactionMode: "write" },
        replayable: true
      }
    });

    // business errors (4xx)
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }

    // system errors (5xx)
    return res.status(500).json(
      buildClientErrorResponse(error, {
        code: "PRODUCT_CREATE_FAILED",
        defaultMessage: "internal server error",
        requestId: transactionId || undefined,
        includeStack: false
      })
    );
  }
});`}
                </pre>
            </div>

            <div className="mx-auto mt-6 max-w-5xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Common errors: duplicate title returns <code>400</code>, forced demo failure returns <code>500</code>,
                replay endpoints return <code>403</code> in production by design.
            </div>
        </section>
    );
}
