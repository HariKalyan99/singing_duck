# Publishing checklist — @singing-duck/capture-duck

## Before you publish to npm

1. **Name & scope**  
   Confirm `@singing-duck` (or your chosen scope) is available on [npm](https://www.npmjs.com/). Unscoped names like `capture-duck` may already be taken.

2. **Repository metadata**  
   Update `repository.url` and `repository.directory` in `package.json` to match your real Git remote.

3. **Version**  
   Follow [semver](https://semver.org/). Start at `0.1.0` for early adopters; bump `0.x` for breaking API changes.

4. **Tests**  
   From `packages/capture-duck`:

   ```bash
   npm test
   ```

5. **Pack dry run**  

   ```bash
   npm pack --dry-run
   ```

   Check that only `src/`, `README.md`, and `PUBLISHING.md` (and any intentional files) are included (`files` field in `package.json`).

6. **Trial outside the monorepo** (recommended)  
   See `examples/trial-consumer/README.md`: install from a tarball (`npm pack`) or `npm link`, run the node trial, and optionally wire a tiny Vite app to `@singing-duck/capture-duck/browser`.

7. **Login & publish**  

   ```bash
   npm login
   npm publish --access public
   ```

   Scoped packages default to private unless you pass `--access public`.

## When it is “ready” to publish

You can publish **after**:

- Trial consumer runs cleanly against a **packed** tarball (not only `workspace:*`).  
- You have documented breaking changes and peer deps (`posthog-js` optional).  
- You accept supporting issues for stack formats you do not parse (source maps are a follow-up).

You do **not** need to bundle the library for npm: pure ESM `src/` is fine for Node 18+ and modern bundlers.

## After publish

- Tag the release in Git (`v0.1.0`).  
- Smoke-test: `npm init -y && npm install @singing-duck/capture-duck` in an empty folder and run a one-line import.
