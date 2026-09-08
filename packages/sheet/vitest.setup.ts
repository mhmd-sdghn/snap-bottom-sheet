import { afterEach } from "vitest";
import { resetWarnings } from "./src/core/env.ts";

/**
 * `warnOnce` keys are remembered for the life of the module, so a warning
 * asserted in one test would be silently missing in the next file that expects
 * it. Cleared between tests, warning assertions stop depending on file order.
 */
afterEach(resetWarnings);

/**
 * `globals` is off in this project, so React Testing Library cannot register
 * its own cleanup — without this, portalled nodes leak into the next test.
 *
 * Guarded and dynamically imported because `setupFiles` also runs for the
 * node-environment SSR test, where RTL has no DOM to talk to.
 */
if (typeof document !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(cleanup);
}
