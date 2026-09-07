import { describe, expect, it, vi } from "vitest";
import { warnOnce } from "../../src/core/env.ts";

describe("warnOnce", () => {
  it("does not throw where `process` is undefined (plain <script type=module>)", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("process", undefined);

    try {
      expect(() => warnOnce("env-no-process", "no process here")).not.toThrow();
    } finally {
      // vitest's own runner needs `process` back before the test ends.
      vi.unstubAllGlobals();
    }
  });
});
