import { afterEach } from "vitest";

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
