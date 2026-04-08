export default function buildServiceContext(
  req,
  service,
  replayable = true,
  extras = {},
) {
  return {
    service,
    payload: {
      params: req.params || {},
      query: req.query || {},
      body: req.body || null,
    },
    context: {
      route: req.originalUrl,
      method: req.method,
      ...extras,
    },
    replayable,
  };
}
