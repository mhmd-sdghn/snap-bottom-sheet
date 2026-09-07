// @vitest-environment node
import { describe, expect, it } from "vitest";

describe("core entry", () => {
  it("imports without a DOM", async () => {
    const entry = await import("../../src/index.ts");
    expect(typeof entry.createSheet).toBe("function");
    expect(typeof entry.steps).toBe("function");
  });
});
