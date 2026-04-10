# @singing-duck/capture-duck

Capture JavaScript errors in the **browser** and **Node**, normalize stack traces, optionally forward to **PostHog**, and send browser payloads to **your own HTTP ingest** (you own the URL, API keys, and database).

## Install

```bash
npm install @singing-duck/capture-duck
```

In this monorepo, `client` and `server` depend on the package via `"file:../packages/capture-duck"` until you publish and switch to the npm version.

Optional (browser only), for PostHog:

```bash
npm install posthog-js
```

## Browser

Use **`fetch`** (no axios) to POST JSON to `ingestUrl`. Global `window.onerror` / `onunhandledrejection` handlers fire **`captureDuck` without awaiting** so the UI is not blocked.

```javascript
import posthog from "posthog-js";
import {
  buildPosthogInitOptions,
  initErrorTracking,
  captureDuck,
} from "@singing-duck/capture-duck/browser";

// If you use PostHog elsewhere (e.g. React provider), init once and pass the client:
posthog.init(MY_KEY, buildPosthogInitOptions({ apiKey: MY_KEY, host: MY_HOST }));

await initErrorTracking({
  ingestUrl: "https://api.example.com/errors",
  getIngestHeaders: () => ({ Authorization: `Bearer ${token}` }),
  posthogClient: posthog,
  timeoutMs: 8000,
  beforeSend: (payload) => {
    // return false to skip ingest; or return a modified payload
    return payload;
  },
});

// Manual capture — await to read your API response (e.g. navigate by error id)
const { ingest, posthog: ph } = await captureDuck(err, { context: "checkout" });
if (ingest?.ok) {
  console.log(ingest.data);
}
```

### PostHog without a pre-inited client

If you only want lazy loading of `posthog-js`:

```javascript
await initErrorTracking({
  ingestUrl: "https://api.example.com/errors",
  posthog: { apiKey: "phc_…", host: "https://us.i.posthog.com" },
});
```

### Environment variables (Vite example)

- `VITE_ERRORS_INGEST_URL` — full URL for error POST  
- `VITE_PUBLIC_POSTHOG_KEY` / `VITE_PUBLIC_POSTHOG_HOST` — PostHog (public key only; never secret keys in the browser)

## Node / backend

No database or Convex inside the package. You pass a **`report`** function that persists the payload (Convex, Prisma, HTTP, etc.).

```javascript
import { createCaptureDuck } from "@singing-duck/capture-duck/node";

const captureDuck = createCaptureDuck({
  report: async (payload) => {
    await db.errors.insert({
      message: payload.message,
      rawStack: payload.rawStack,
      fingerPrint: payload.fingerPrint,
      parsedStack: payload.parsedStack,
      // …
    });
  },
  environment: process.env.NODE_ENV,
  // readSnippet: null, // disable reading source files from disk
});

const result = await captureDuck(err, { url: "/api/orders", serviceContext: { … } });
if (!result.ok) console.error(result.error);
```

### Payload shape (`BackendErrorPayload`)

| Field | Description |
|--------|-------------|
| `id` | UUID |
| `message` | Error message |
| `rawStack` | Original `.stack` string |
| `parsedStack` | Frames from `parseStackTrace` |
| `fingerPrint` | MD5 of message + top frame (dedupe) |
| `codeSnippet` | Optional lines around top frame (disk read) |
| `timestamp` | ISO string |
| `url`, `userAgent`, `type`, `environment` | Context |

## Core (stack parsing only)

```javascript
import { parseStackTrace } from "@singing-duck/capture-duck";
```

## Security notes

- Browser: use only the **public** PostHog project key (`phc_…`).  
- Put **secrets** on your server or in `getIngestHeaders`, not in shipped client bundles.  
- Use `beforeSend` to strip PII before ingest.

## License

MIT
