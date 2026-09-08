/**
 * Dev warnings, in their own file: `warnOnce` dedupes per key for a module's
 * lifetime, so asserting one needs a fresh module registry — and
 * `vi.resetModules()` would otherwise strand the shared ResizeObserver that
 * every other test in a file depends on.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installTestEnv, settle, yOf } from "../helpers/env.ts";

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  installTestEnv();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("dev warnings", () => {
  it("A.10 warns when a measured snap has nothing to measure", async () => {
    vi.resetModules();
    const { createSheet } = await import("../../src/core/sheet.ts");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const content = document.createElement("div");
    const inner = document.createElement("div");
    inner.setAttribute("data-snap-sheet-inner", "");
    content.append(inner);
    document.body.append(content);

    // no header element registered, so "header" can never resolve
    const controller = createSheet({ content }, { snapPoints: ["header"] });
    const opened = controller.open();
    await settle(controller);
    await opened;

    // the placeholder still applies — the sheet is usable, just not where the
    // consumer meant, which is exactly why it has to say so
    expect(yOf(content)).toBe(500);
    expect(warn.mock.calls.flat().join(" ")).toMatch(/Sheet\.Header/);

    warn.mockRestore();
    controller.destroy();
  });

  it("says nothing in a production build", async () => {
    // A fresh registry, or `warnOnce` would be silent for the wrong reason:
    // the key above is already spent in the module instance the other test
    // loaded.
    vi.resetModules();
    const { createSheet } = await import("../../src/core/sheet.ts");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const content = document.createElement("div");
      const inner = document.createElement("div");
      inner.setAttribute("data-snap-sheet-inner", "");
      content.append(inner);
      document.body.append(content);

      const controller = createSheet({ content }, { snapPoints: ["header"] });
      const opened = controller.open();
      await settle(controller);
      await opened;

      expect(yOf(content)).toBe(500);
      expect(warn).not.toHaveBeenCalled();
      controller.destroy();
    } finally {
      process.env.NODE_ENV = previous;
      warn.mockRestore();
    }
  });
});
