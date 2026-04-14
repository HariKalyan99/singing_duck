# E2E trial: Vite frontend + Node backend

This trial validates package usage before npm publish.

## 1) Backend (uses package)

```bash
cd examples/e2e-vite-node-trial/backend
npm install
npm run dev
```

Backend runs at `http://localhost:8090` with endpoints:

- `POST /trigger-error` (captures via `@singing-duck/capture-duck/node`)
- `GET /errors` (in-memory captured list)

## 2) Frontend

```bash
cd examples/e2e-vite-node-trial/frontend
npm install
npm run dev
```

Open the shown URL (usually `http://localhost:5173`) and click **Trigger backend error**.
Then click **Refresh captured errors** to verify payloads/fingerprints.

## Notes

- This trial intentionally stores errors in memory (not DB).
- For npm-like validation, swap package dependency in backend to your packed tarball:

```json
"@singing-duck/capture-duck": "file:/full/path/singing-duck-capture-duck-0.1.0.tgz"
```
