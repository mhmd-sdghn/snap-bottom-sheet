import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetWarnings } from "../../src/core/env.ts";
import {
  createSheet,
  type SheetController,
  type SheetElements,
  type SheetOptions,
} from "../../src/core/sheet.ts";
import {
  installTestEnv,
  resizeTo,
  setHeight,
  settle,
  ViewHeight,
  yOf,
} from "../helpers/env.ts";
import { press } from "../helpers/pointer.ts";

/**
 * Task 16, the core findings of the OpenCodeReview pass. Every test here fails
 * on the code as it was before the fix named in its title.
 */

interface Fixture extends SheetElements {
  wrapper: HTMLElement;
  inner: HTMLElement;
  overlay: HTMLElement;
  handle: HTMLElement;
  trigger: HTMLButtonElement;
}

function fixture(): Fixture {
  const wrapper = document.createElement("div");
  const overlay = document.createElement("div");
  const content = document.createElement("div");
  const inner = document.createElement("div");
  inner.setAttribute("data-snap-sheet-inner", "");
  const handle = document.createElement("button");
  const body = document.createElement("div");
  // The page behind the sheet, and the button that opened it.
  const page = document.createElement("div");
  const trigger = document.createElement("button");

  inner.append(handle, body);
  content.append(inner);
  wrapper.append(overlay, content);
  page.append(trigger);
  document.body.append(page, wrapper);

  return { wrapper, content, inner, overlay, handle, body, trigger };
}

const controllers: SheetController[] = [];
const make = (elements: SheetElements, options: SheetOptions = {}) => {
  const controller = createSheet(elements, options);
  controllers.push(controller);
  return controller;
};

const opened = async (controller: SheetController) => {
  const done = controller.open();
  await settle(controller);
  await done;
};

/**
 * jsdom 26 has no `inert`, so the library falls back to the attribute and the
 * real side effect never happens. This is the spec behaviour that matters
 * here: making a subtree inert blurs the element focused inside it.
 */
function installInertProperty(): () => void {
  const key = Symbol("inert");
  Object.defineProperty(HTMLElement.prototype, "inert", {
    configurable: true,
    get(this: HTMLElement & { [key]?: boolean }) {
      return this[key] === true;
    },
    set(this: HTMLElement & { [key]?: boolean }, on: boolean) {
      this[key] = on;
      if (!on) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && this.contains(active)) active.blur();
    },
  });
  return () => {
    Reflect.deleteProperty(HTMLElement.prototype, "inert");
  };
}

let uninstallInert: (() => void) | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  resetWarnings();
  installTestEnv();
});

afterEach(() => {
  for (const controller of controllers) controller.destroy();
  controllers.length = 0;
  uninstallInert?.();
  uninstallInert = null;
  vi.useRealTimers();
});

describe("focus is captured before the siblings go inert", () => {
  it("returns focus to the trigger a real browser would have blurred", async () => {
    uninstallInert = installInertProperty();
    const el = fixture();
    el.trigger.focus();
    expect(document.activeElement).toBe(el.trigger);

    const controller = make(el, { snapPoints: [0.5] });
    await opened(controller);

    // The page around the sheet is inert now, so the trigger has lost focus —
    // which is exactly why it has to be remembered before that happens.
    expect(document.activeElement).not.toBe(el.trigger);

    const closing = controller.close();
    await settle(controller);
    await closing;

    expect(document.activeElement).toBe(el.trigger);
  });

  it("does the same when update() turns a non-modal sheet modal", async () => {
    uninstallInert = installInertProperty();
    const el = fixture();
    el.trigger.focus();

    const controller = make(el, { snapPoints: [0.5], modal: false });
    await opened(controller);
    expect(document.activeElement).toBe(el.trigger);

    controller.update({ modal: true });
    expect(document.activeElement).not.toBe(el.trigger);

    const closing = controller.close();
    await settle(controller);
    await closing;

    expect(document.activeElement).toBe(el.trigger);
  });
});

describe("cancelling a deferred open", () => {
  it("settles the open transition instead of finalising it later", async () => {
    const el = fixture();
    const container = document.createElement("div");
    container.style.position = "relative";
    setHeight(container, 0);
    document.body.append(container);
    container.append(el.content);

    const ends: boolean[] = [];
    const controller = make(
      { content: el.content, container },
      { snapPoints: [0.5], onAnimationEnd: (open) => ends.push(open) },
    );

    // Nothing is measurable, so the open is held.
    const opening = controller.open();
    expect(controller.getState().open).toBe(false);

    await controller.close();
    // The held open resolves rather than hanging.
    await opening;
    expect(ends).toEqual([false]);

    // The view becomes measurable. Nothing may finalise the cancelled open.
    resizeTo(container, ViewHeight);
    await settle();

    expect(ends).toEqual([false]);
    expect(controller.getState().open).toBe(false);
    expect(el.content.getAttribute("data-state")).toBe("closed");
    expect(el.content.hasAttribute("data-snap-index")).toBe(false);
  });
});

describe("defaultSnapIndex", () => {
  it("is clamped at attach, so the arrows step from where the panel is", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = fixture();
    const controller = make(el, {
      snapPoints: [0.3, 0.6],
      defaultSnapIndex: 5,
    });

    expect(controller.getState().snapIndex).toBe(1);
    expect(warn.mock.calls.flat().join(" ")).toMatch(/defaultSnapIndex 5/);

    await opened(controller);
    expect(yOf(el.content)).toBe(400);

    // One snap up from the tallest snap is the tallest snap. An unclamped
    // index is in no order at all, so this used to jump down to 0.3.
    press(el.handle, "ArrowUp");
    await settle(controller);
    expect(controller.getState().snapIndex).toBe(1);
    expect(yOf(el.content)).toBe(400);
  });
});

describe("re-entrant snapTo", () => {
  it("lets a snapTo from inside onSnapIndexChange win", async () => {
    const el = fixture();
    let controller: SheetController | undefined;
    controller = make(el, {
      snapPoints: [0.3, 0.6, 0.9],
      onSnapIndexChange: (index) => {
        if (index === 1) void controller?.snapTo(2);
      },
    });

    await opened(controller);
    expect(yOf(el.content)).toBe(700);

    await controller.snapTo(1);
    await settle(controller);

    expect(controller.getState().snapIndex).toBe(2);
    expect(yOf(el.content)).toBe(100);
    expect(el.content.getAttribute("data-snap-index")).toBe("2");
  });
});

describe("findContentInner", () => {
  it("warns when there is no single wrapper to measure", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const content = document.createElement("div");
    content.append(
      document.createElement("div"),
      document.createElement("div"),
    );
    document.body.append(content);

    make({ content });

    expect(warn.mock.calls.flat().join(" ")).toMatch(/data-snap-sheet-inner/);
  });
});
