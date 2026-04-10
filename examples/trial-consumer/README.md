# Trial consumer — verify `@singing-duck/capture-duck` before npm

## Inside the monorepo (workspace)

From repo root:

```bash
cd examples/trial-consumer && npm install && npm run trial:node
```

You should see `[trial] captured:` with a fingerprint and `[trial] ok`.

## Simulate a real npm install (tarball)

Pack the library (from repo root):

```bash
npm pack -w @singing-duck/capture-duck
```

Creates something like `singing-duck-capture-duck-0.1.0.tgz` in the root (or current directory, depending on npm version). In a **new empty folder** outside the repo:

```bash
mkdir /tmp/capture-duck-trial && cd /tmp/capture-duck-trial
npm init -y
npm install /full/path/to/singing-duck-capture-duck-0.1.0.tgz
node --input-type=module -e "
import { createCaptureDuck } from '@singing-duck/capture-duck/node';
const c = createCaptureDuck({ report: async (p) => console.log(p.message) });
await c(new Error('from tarball'));
"
```

If that prints `from tarball`, the published package layout is good.

## Browser trial

Create a small Vite (or Next) app, add the same tarball or `workspace:*` via `file:`, then:

```javascript
import { initErrorTracking, captureDuck } from "@singing-duck/capture-duck/browser";

await initErrorTracking({
  ingestUrl: "http://localhost:3999/errors", // your mock server
});
await captureDuck(new Error("browser trial"));
```

Point `ingestUrl` at any server that logs `POST` bodies.
