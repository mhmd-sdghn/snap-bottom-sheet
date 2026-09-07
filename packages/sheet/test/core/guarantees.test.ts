import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSheet,
  type SheetController,
  type SheetElements,
  type SheetOptions,
} from "../../src/core/sheet.ts";
import { fire } from "../helpers/pointer.ts";

const ViewHeight = 1000;

type ResizeEntryLike = { target: Element };
/**
 * measure.ts creates one module-level ResizeObserver on its first use and keeps
 * it for the lifetime of the module, so this list must NOT be reset per test —
 * clearing it would orphan the only callback that reaches the shared observer.
 */
const observerCallbacks: ((entries: ResizeEntryLike[]) => void)[] = [];

/** Fires every live ResizeObserver callback for one element. */
const resizeTo = (el: HTMLElement, height: number) => {
  Object.defineProperty(el, "offsetHeight", {
    value: height,
    configurable: true,
  });
  for (const cb of [...observerCallbacks]) cb([{ target: el }]);
};

const setHeight = (el: HTMLElement, height: number) => {
  Object.defineProperty(el, "offsetHeight", {
    value: height,
    configurable: true,
  });
};

interface Fixture extends SheetElements {
  wrapper: HTMLElement;
  inner: HTMLElement;
  sibling: HTMLElement;
  button: HTMLButtonElement;
}

/**
 * The shape the React layer renders: content holds exactly one inner wrapper so
 * `findContentInner` measures the wrapper, not the full-height panel.
 */
function fixture(): Fixture {
  const wrapper = document.createElement("div");
  const overlay = document.createElement("div");
  const content = document.createElement("div");
  const inner = document.createElement("div");
  inner.setAttribute("data-snap-sheet-inner", "");
  const handle = document.createElement("button");
  const header = document.createElement("div");
  const body = document.createElement("div");
  const button = document.createElement("button");
  const sibling = document.createElement("div");

  header.append(button);
  inner.append(handle, header, body);
  content.append(inner);
  wrapper.append(overlay, content);
  document.body.append(sibling, wrapper);

  return {
    wrapper,
    content,
    inner,
    overlay,
    handle,
    header,
    body,
    sibling,
    button,
  };
}

const controllers: SheetController[] = [];
const make = (elements: SheetElements, options: SheetOptions = {}) => {
  const controller = createSheet(elements, options);
  controllers.push(controller);
  return controller;
};

/** Drives the rAF loop until the spring rests. */
const settle = async () => {
  await vi.advanceTimersByTimeAsync(3000);
};

const yOf = (content: HTMLElement) =>
  Number(
    /translate3d\(0, (-?[\d.]+)px, 0\)/.exec(content.style.transform)?.[1] ??
      Number.NaN,
  );

/** pointerdown → threshold move → drag move → pointerup, all on `el`. */
function drag(el: HTMLElement, from: number, to: number) {
  fire(el, "pointerdown", { clientY: from, timeStamp: 0 });
  const direction = to >= from ? 1 : -1;
  fire(el, "pointermove", { clientY: from + direction * 4, timeStamp: 10 });
  fire(el, "pointermove", { clientY: to, timeStamp: 200 });
  fire(el, "pointerup", { clientY: to, timeStamp: 210 });
}

const press = (el: HTMLElement, key: string) => {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
};

const progressOn = (el: HTMLElement) =>
  el.style.getPropertyValue("--snap-sheet-progress");

const zIndexOf = (el: HTMLElement) => el.style.getPropertyValue("z-index");

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  document.documentElement.style.cssText = "";
  document.body.style.cssText = "";

  Object.defineProperty(window, "innerHeight", {
    value: ViewHeight,
    configurable: true,
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(cb: (entries: ResizeEntryLike[]) => void) {
        observerCallbacks.push(cb);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("matchMedia", (media: string) => ({
    media,
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});

afterEach(() => {
  for (const controller of controllers) controller.destroy();
  controllers.length = 0;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("documented guarantees", () => {
  it("progress is 1 at the topmost declared snap, not at the viewport top", async () => {
    const el = fixture();
    const snaps = [0.3, 0.6];
    // The span the docs promise: closed → the tallest snap the consumer
    // declared. Nothing above 0.6 is reachable, so 0.6 must read exactly 1.
    const topY = ViewHeight - Math.max(...snaps) * ViewHeight;
    const span = ViewHeight - topY;
    const progressAt = (y: number) => (ViewHeight - y) / span;

    const controller = make(el, { snapPoints: snaps, defaultSnapIndex: 1 });
    const overlay = el.overlay as HTMLElement;

    expect(progressOn(el.content)).toBe("0");
    expect(controller.getState().progress).toBe(0);

    const opened = controller.open();
    await settle();
    await opened;

    expect(yOf(el.content)).toBe(topY);
    expect(progressAt(topY)).toBe(1);
    expect(progressOn(el.content)).toBe(String(progressAt(topY)));
    expect(progressOn(overlay)).toBe(String(progressAt(topY)));
    expect(controller.getState().progress).toBe(progressAt(topY));

    const lowY = ViewHeight - Math.min(...snaps) * ViewHeight;
    await controller.snapTo(0, { immediate: true });

    expect(yOf(el.content)).toBe(lowY);
    expect(progressOn(el.content)).toBe(String(progressAt(lowY)));
    expect(controller.getState().progress).toBe(progressAt(lowY));
  });

  it("data-dragging and data-content-mode are presence attributes", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });

    // Off means absent, never the string "false".
    expect(el.content.hasAttribute("data-content-mode")).toBe(false);
    expect(el.content.hasAttribute("data-dragging")).toBe(false);

    const opened = controller.open();
    await settle();
    await opened;

    fire(el.content, "pointerdown", { clientY: 0, timeStamp: 0 });
    fire(el.content, "pointermove", { clientY: 8, timeStamp: 10 });

    expect(el.content.hasAttribute("data-dragging")).toBe(true);
    expect(el.content.getAttribute("data-dragging")).toBe("");

    fire(el.content, "pointerup", { clientY: 8, timeStamp: 20 });
    await settle();

    expect(el.content.hasAttribute("data-dragging")).toBe(false);

    // On means the empty string, never "true".
    const hugging = fixture();
    make(hugging);
    expect(hugging.content.getAttribute("data-content-mode")).toBe("");
  });

  it("open flips to false when closing starts, not when it ends", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });

    const opened = controller.open();
    await settle();
    await opened;
    expect(controller.getState().open).toBe(true);

    const seen: boolean[] = [];
    controller.subscribe((state) => seen.push(state.open));

    const closing = controller.close();

    // Still mid-animation, and the panel is still marked open — but the state
    // a consumer reads already says closed.
    expect(controller.getState().open).toBe(false);
    expect(controller.getState().animating).toBe(true);
    expect(el.content.getAttribute("data-state")).toBe("open");
    expect(seen[0]).toBe(false);
    expect(yOf(el.content)).toBe(500);

    await settle();
    await closing;

    expect(controller.getState().open).toBe(false);
    expect(controller.getState().animating).toBe(false);
    expect(el.content.getAttribute("data-state")).toBe("closed");
  });

  it("the handle's Enter/Space cycles snaps and wraps to the lowest", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.3, 0.6, 0.9] });
    const handle = el.handle as HTMLElement;

    const opened = controller.open();
    await settle();
    await opened;
    expect(controller.getState().snapIndex).toBe(0);
    expect(yOf(el.content)).toBe(700);

    press(handle, "Enter");
    await settle();
    expect(controller.getState().snapIndex).toBe(1);
    expect(yOf(el.content)).toBe(400);

    press(handle, " ");
    await settle();
    expect(controller.getState().snapIndex).toBe(2);
    expect(yOf(el.content)).toBe(100);

    // Topmost: the next press wraps back to the lowest snap rather than
    // stopping at the top.
    press(handle, "Enter");
    await settle();
    expect(controller.getState().snapIndex).toBe(0);
    expect(yOf(el.content)).toBe(700);
  });

  it("'header' resolves from offsetHeight, so margins are excluded", async () => {
    const el = fixture();
    const header = el.header as HTMLElement;
    header.style.marginTop = "40px";
    header.style.marginBottom = "60px";
    setHeight(header, 120);

    const controller = make(el, { snapPoints: ["header"] });
    const opened = controller.open();
    await settle();
    await opened;

    // 120, not 120 + 40 + 60.
    expect(yOf(el.content)).toBe(ViewHeight - 120);

    resizeTo(header, 200);
    await settle();
    expect(yOf(el.content)).toBe(ViewHeight - 200);
  });

  it("keeps the last 'content' measurement while a scroll snap is active", async () => {
    const el = fixture();
    const controller = make(el, {
      snapPoints: ["content", { value: 0.9, scroll: true }],
    });

    resizeTo(el.inner, 300);
    const opened = controller.open();
    await settle();
    await opened;
    expect(yOf(el.content)).toBe(700);

    await controller.snapTo(1, { immediate: true });
    expect(yOf(el.content)).toBe(100);

    // Body is the scroller at this snap, so the wrapper no longer reports the
    // natural content height. The measurement is paused, not zeroed.
    resizeTo(el.inner, 40);
    await settle();

    await controller.snapTo(0, { immediate: true });
    expect(yOf(el.content)).toBe(700);
  });

  it("fires onDragEnd(-1) before onOpenChange(false) on a drag dismissal", async () => {
    const el = fixture();
    const order: string[] = [];
    const controller = make(el, {
      snapPoints: [0.3, 0.9],
      defaultSnapIndex: 0,
      onDragEnd: (index) => order.push(`dragEnd:${index}`),
      onOpenChange: (open) => order.push(`openChange:${open}`),
    });

    const opened = controller.open();
    await settle();
    await opened;
    expect(yOf(el.content)).toBe(700);

    // threshold = min(80, 25% of 300) = 75; 90 px past the lowest snap closes
    drag(el.content, 0, 90);
    await settle();

    expect(order).toEqual(["dragEnd:-1", "openChange:false"]);
    expect(controller.getState().open).toBe(false);
  });

  it("never writes a z-index on any element it touches", async () => {
    const el = fixture();
    const overlay = el.overlay as HTMLElement;
    const body = el.body as HTMLElement;
    const touched = [el.content, overlay, body, el.inner, document.body];

    const controller = make(el, { snapPoints: [0.5, { value: 0.9 }] });
    for (const node of touched) expect(zIndexOf(node)).toBe("");

    const opened = controller.open();
    await settle();
    await opened;

    for (const node of touched) expect(zIndexOf(node)).toBe("");

    await controller.snapTo(1, { immediate: true });
    for (const node of touched) expect(zIndexOf(node)).toBe("");
  });
});
