import test from "node:test";
import assert from "node:assert/strict";
import { parseStackTrace, parseStackLine } from "../src/parseStackTrace.js";

test("parseStackLine: V8 with function", () => {
  const f = parseStackLine(
    "at myFn (/app/src/foo.js:10:5)",
  );
  assert.equal(f?.function, "myFn");
  assert.equal(f?.file, "/app/src/foo.js");
  assert.equal(f?.line, 10);
  assert.equal(f?.column, 5);
});

test("parseStackLine: async V8", () => {
  const f = parseStackLine(
    "at async handler (/app/api.js:2:1)",
  );
  assert.equal(f?.function, "handler");
  assert.equal(f?.isAsync, true);
});

test("parseStackTrace: multi-frame", () => {
  const stack = `Error: boom
    at inner (/x/a.js:1:1)
    at outer (/x/b.js:2:2)`;
  const frames = parseStackTrace(stack);
  assert.equal(frames.length, 2);
  assert.equal(frames[0].function, "inner");
  assert.equal(frames[1].function, "outer");
});
