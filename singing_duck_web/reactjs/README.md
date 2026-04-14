# Singing Duck Docs Web

This web app is the documentation frontend for the JavaScript-based Singing Duck server.

## Local run

1. Start backend:

```bash
cd ../../server
npm install
npm run dev
```

2. Start docs frontend:

```bash
cd ../singing_duck_web/reactjs
npm install
npm run dev
```

3. Build frontend:

```bash
npm run build
```

## Backend integration summary

- `captureDuck` is wired in `server/main/captureDuck.js` using `createCaptureDuck(...)`.
- Route-level capture is shown in `server/controllers/productController.js`.
- Global capture is enforced in `server/server.js` middleware + `uncaughtException` / `unhandledRejection`.
- Useful endpoints:
  - `POST /products/add`
  - `GET /errors`
  - `POST /products/errors/:id/replay-service` (disabled in production)

## Production checklist

- Set `NODE_ENV=production`.
- Use secure environment variables for Convex/PostHog credentials.
- Run backend with `npm start` from `server`.
- Build frontend with `npm run build` and host `dist/` on static hosting/CDN.
- Keep replay endpoints disabled in production (already enforced by code).
