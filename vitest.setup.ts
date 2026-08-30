import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { configure } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const root = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(root, ".env"), quiet: true });
config({ path: path.join(root, ".env.local"), override: true, quiet: true });

// Testing Library's default 1000ms poll timeout for waitFor/findBy is tight
// on a loaded shared CI runner — tests that pass reliably locally have been
// observed timing out only in CI. Raising it doesn't mask a real hang (genuine
// bugs still time out, just at 5s), it just gives slow-runner scheduling room.
configure({ asyncUtilTimeout: 5000 });

// jsdom installs its own AbortController/AbortSignal over Node's, but leaves
// the global `Request` as Node's (undici) — and undici brand-checks
// `init.signal` against Node's native AbortSignal, so `new Request(url, {
// signal })` throws `RequestInit: Expected signal ("AbortSignal {}") to be an
// instance of AbortSignal`. react-router's data router builds a Request on
// *every* navigation (createClientSideRequest in startNavigation), so
// createMemoryRouter + RouterProvider is unusable under jsdom without this.
// Node's real AbortSignal class is not reachable from here (undici's captured
// reference is internal), so detect the clash by probing and, when present,
// drop the incompatible signal.
// ponytail: dropping the signal loses Request abort propagation in tests;
// swap to passing the signal through if a test ever needs to abort a fetch.
const NodeRequest = globalThis.Request;
if (typeof NodeRequest === "function" && typeof AbortController === "function") {
  let signalAccepted = true;
  try {
    new NodeRequest("http://localhost/", { signal: new AbortController().signal });
  } catch {
    signalAccepted = false;
  }
  if (!signalAccepted) {
    globalThis.Request = class extends NodeRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        super(input, init?.signal ? { ...init, signal: undefined } : init);
      }
    };
  }
}
