import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { once } from "../../src/core/env.ts";
import {
  createSheet,
  type SheetController,
  type SheetElements,
} from "../../src/core/sheet.ts";
import { installTestEnv, settle } from "../helpers/env.ts";

/** Task 13, B.18 / C.4: the cleanups that are observable from outside. */

const controllers: SheetController[] = [];
const make = (elements: SheetElements, options = {}) => {
  const controller = createSheet(elements, options);
  controllers.push(controller);
  return controller;
};

function fixture(): SheetElements & { inner: HTMLElement } {
  const content = document.createElement("div");
  const inner = document.createElement("div");
  inner.setAttribute("data-snap-sheet-inner", "");
  content.append(inner);
  document.body.append(content);
  return { content, inner };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  installTestEnv();
});

afterEach(() => {
  for (const controller of controllers) controller.destroy();
  controllers.length = 0;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("once()", () => {
  it("runs the wrapped function exactly once", () => {
    const fn = vi.fn();
    const wrapped = once(fn);
    wrapped();
    wrapped();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("aria attributes go through the restore bookkeeping", () => {
  it("gives a consumer's own aria-labelledby back on destroy (C.4)", async () => {
    const el = fixture();
    el.content.setAttribute("aria-labelledby", "theirs");
    const controller = make(el, { snapPoints: [0.5], labelledBy: "ours" });
    await settle(controller);
    expect(el.content.getAttribute("aria-labelledby")).toBe("ours");
    expect(el.content.getAttribute("aria-modal")).toBe("true");

    controller.destroy();
    expect(el.content.getAttribute("aria-labelledby")).toBe("theirs");
    expect(el.content.hasAttribute("aria-modal")).toBe(false);
  });

  it("restores it when the option is cleared mid-life", async () => {
    const el = fixture();
    el.content.setAttribute("aria-describedby", "theirs");
    const controller = make(el, { snapPoints: [0.5], describedBy: "ours" });
    await settle(controller);
    expect(el.content.getAttribute("aria-describedby")).toBe("ours");

    controller.update({ describedBy: undefined });
    expect(el.content.getAttribute("aria-describedby")).toBe("theirs");
  });

  it("removes data-content-mode and aria-modal it added itself", async () => {
    const el = fixture();
    const controller = make(el, { modal: false });
    await settle(controller);
    expect(el.content.hasAttribute("aria-modal")).toBe(false);
    expect(el.content.hasAttribute("data-content-mode")).toBe(true);

    controller.destroy();
    expect(el.content.hasAttribute("data-content-mode")).toBe(false);
  });
});
