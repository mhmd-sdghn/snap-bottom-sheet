// @vitest-environment node
import { expect, it } from "vitest";

it("imports without a DOM", async () => {
  const { attachDrag } = await import("../src/index.ts");
  expect(typeof attachDrag).toBe("function");
  expect(typeof globalThis.document).toBe("undefined");
});
