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

/** jsdom 26 has no `inert` property, so dom.ts falls back to the attribute. */
const isInert = (el: HTMLElement) =>
  el.hasAttribute("inert") || el.inert === true;

const yOf = (content: HTMLElement) =>
  Number(
    /translate3d\(0, (-?[\d.]+)px, 0\)/.exec(content.style.transform)?.[1] ??
      Number.NaN,
  );

/** pointerdown → threshold move → drag move → pointerup, all on `el`. */
function drag(
  el: HTMLElement,
  from: number,
  to: number,
  opts: { steps?: [number, number][]; up?: boolean; upAt?: number } = {},
) {
  fire(el, "pointerdown", { clientY: from, timeStamp: 0 });
  const direction = to >= from ? 1 : -1;
  fire(el, "pointermove", { clientY: from + direction * 4, timeStamp: 10 });
  for (const [clientY, timeStamp] of opts.steps ?? [[to, 200]]) {
    fire(el, "pointermove", { clientY, timeStamp });
  }
  if (opts.up !== false) {
    fire(el, "pointerup", { clientY: to, timeStamp: opts.upAt ?? 210 });
  }
}

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

describe("createSheet", () => {
  it("throws without a content element", () => {
    expect(() =>
      createSheet({ content: undefined as unknown as HTMLElement }),
    ).toThrow(TypeError);
  });

  it("1. writes base styles at attach and destroy() removes them", () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });

    expect(el.content.style.position).toBe("fixed");
    expect(el.content.style.height).toBe("100dvh");
    expect(el.content.style.flexDirection).toBe("column");
    expect(el.content.style.touchAction).toBe("none");
    expect(el.content.getAttribute("role")).toBe("dialog");
    expect(el.content.getAttribute("data-state")).toBe("closed");
    expect(el.content.getAttribute("aria-modal")).toBe("true");
    expect(el.content.getAttribute("tabindex")).toBe("-1");
    expect(el.overlay?.getAttribute("aria-hidden")).toBe("true");
    expect(el.handle?.getAttribute("aria-label")).toBe("Resize sheet");
    expect(yOf(el.content)).toBe(ViewHeight);

    controller.destroy();

    expect(el.content.style.position).toBe("");
    expect(el.content.style.transform).toBe("");
    expect(el.content.getAttribute("role")).toBeNull();
    expect(el.content.getAttribute("data-state")).toBeNull();
    expect(el.content.style.getPropertyValue("--snap-sheet-y")).toBe("");

    // listeners are gone: a drag no longer moves anything
    drag(el.content, 100, 300);
    expect(el.content.style.transform).toBe("");
  });

  it("1b. uses absolute positioning inside a container", () => {
    const el = fixture();
    setHeight(el.wrapper, 600);
    make({ ...el, container: el.wrapper }, { snapPoints: [0.5] });

    expect(el.content.style.position).toBe("absolute");
    expect(el.content.style.height).toBe("100%");
    expect(yOf(el.content)).toBe(600);
  });

  it("2. open() locks, inerts, focuses and animates; close() reverses", async () => {
    const el = fixture();
    const onAnimationEnd = vi.fn();
    const controller = make(el, { snapPoints: [0.5], onAnimationEnd });

    const opened = controller.open();
    expect(el.content.getAttribute("data-state")).toBe("open");
    expect(el.overlay?.getAttribute("data-state")).toBe("open");
    expect(document.body.style.overflow).toBe("hidden");
    expect(isInert(el.sibling)).toBe(true);
    expect(el.content.contains(document.activeElement)).toBe(true);

    await settle();
    await opened;

    expect(yOf(el.content)).toBe(500);
    expect(controller.getState().open).toBe(true);
    expect(onAnimationEnd).toHaveBeenCalledWith(true);

    const closed = controller.close();
    await settle();
    await closed;

    expect(el.content.getAttribute("data-state")).toBe("closed");
    expect(yOf(el.content)).toBe(ViewHeight);
    expect(document.body.style.overflow).toBe("");
    expect(isInert(el.sibling)).toBe(false);
    expect(onAnimationEnd).toHaveBeenCalledWith(false);
    expect(onAnimationEnd.mock.calls.filter(([o]) => o === false)).toHaveLength(
      1,
    );
  });

  it("3. resolves snap points in consumer order, not sorted order", async () => {
    const el = fixture();
    const controller = make(el, {
      snapPoints: [0.9, 0.3],
      defaultSnapIndex: 0,
    });

    const opened = controller.open();
    await settle();
    await opened;

    // index 0 is the consumer's first entry (0.9), i.e. y = 1000 - 900
    expect(yOf(el.content)).toBe(100);
    expect(controller.getState().snapIndex).toBe(0);

    await controller.snapTo(1, { immediate: true });
    expect(yOf(el.content)).toBe(700);
  });

  it("4. re-animates a 'content' snap when its measurement changes", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: ["content", 0.9] });

    const opened = controller.open();
    await settle();
    await opened;

    resizeTo(el.inner, 200);
    await settle();
    expect(yOf(el.content)).toBe(800);

    // a different snap is active: a content measurement must not move the sheet
    await controller.snapTo(1, { immediate: true });
    expect(yOf(el.content)).toBe(100);
    resizeTo(el.inner, 400);
    await settle();
    expect(yOf(el.content)).toBe(100);
  });

  it("5. release lands on the nearest snap, flings, and dismisses", async () => {
    const el = fixture();
    const onOpenChange = vi.fn();
    const onDragEnd = vi.fn();
    const controller = make(el, {
      snapPoints: [0.3, 0.9],
      defaultSnapIndex: 1,
      onOpenChange,
      onDragEnd,
    });

    const opened = controller.open();
    await settle();
    await opened;
    expect(yOf(el.content)).toBe(100);

    // 100 px down from y=100 stays nearest to index 1 (y=100 vs y=700)
    drag(el.content, 0, 100);
    await settle();
    expect(controller.getState().snapIndex).toBe(1);

    // far enough down to cross the midpoint → index 0
    drag(el.content, 0, 400);
    await settle();
    expect(controller.getState().snapIndex).toBe(0);
    expect(yOf(el.content)).toBe(700);

    // fling upward: the last 100 ms of samples give vy = -100px / 50ms = -2,
    // so from y=600 the projection is 600 - 400 = 200 → nearest is index 1
    drag(el.content, 500, 400, {
      steps: [
        [500, 100],
        [400, 150],
      ],
      upAt: 150,
    });
    await settle();
    expect(controller.getState().snapIndex).toBe(1);
    expect(onDragEnd).toHaveBeenLastCalledWith(1);
  });

  it("5b. dragging below the lowest snap closes only when dismissible", async () => {
    const el = fixture();
    const onOpenChange = vi.fn();
    const onDragEnd = vi.fn();
    const controller = make(el, {
      snapPoints: [0.3, 0.9],
      defaultSnapIndex: 0,
      onOpenChange,
      onDragEnd,
    });

    const opened = controller.open();
    await settle();
    await opened;
    expect(yOf(el.content)).toBe(700);

    // threshold = min(80, 25% of 300) = 75; 90 px past the lowest snap closes
    drag(el.content, 0, 90);
    await settle();

    expect(onDragEnd).toHaveBeenLastCalledWith(-1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(controller.getState().open).toBe(false);
    expect(yOf(el.content)).toBe(ViewHeight);

    const stubborn = fixture();
    const other = make(stubborn, {
      snapPoints: [0.3, 0.9],
      defaultSnapIndex: 0,
      dismissible: false,
    });
    const reopened = other.open();
    await settle();
    await reopened;

    drag(stubborn.content, 0, 90);
    await settle();

    expect(other.getState().open).toBe(true);
    expect(yOf(stubborn.content)).toBe(700);
  });

  it("6. honours drag locks and lets body scroll win", async () => {
    const locked = fixture();
    const controller = make(locked, {
      snapPoints: [{ value: 0.5, drag: { down: false } }],
    });
    const opened = controller.open();
    await settle();
    await opened;
    expect(yOf(locked.content)).toBe(500);

    drag(locked.content, 0, 200, { up: false });
    expect(yOf(locked.content)).toBe(500);
    fire(locked.content, "pointerup", { clientY: 200, timeStamp: 210 });

    const el = fixture();
    const scroller = make(el, {
      snapPoints: [{ value: 0.5, scroll: true }],
    });
    const ready = scroller.open();
    await settle();
    await ready;

    const bodyEl = el.body as HTMLElement;
    Object.defineProperty(bodyEl, "scrollTop", {
      value: 50,
      writable: true,
      configurable: true,
    });

    // mid-scroll: the native scroll keeps the gesture
    drag(bodyEl, 0, 100, { up: false });
    expect(scroller.getState().dragging).toBe(false);
    expect(yOf(el.content)).toBe(500);
    fire(bodyEl, "pointerup", { clientY: 100, timeStamp: 210 });

    // at the top, pulling down: the drag wins
    bodyEl.scrollTop = 0;
    drag(bodyEl, 0, 100, { up: false });
    expect(scroller.getState().dragging).toBe(true);
    expect(yOf(el.content)).toBe(600);
    fire(bodyEl, "pointerup", { clientY: 100, timeStamp: 210 });
  });

  it("7. Escape closes the innermost modal sheet only", async () => {
    const outerEl = fixture();
    const outer = make(outerEl, { snapPoints: [0.5] });
    const outerOpen = outer.open();
    await settle();
    await outerOpen;

    const innerEl = fixture();
    const inner = make(innerEl, { snapPoints: [0.5] });
    const innerOpen = inner.open();
    await settle();
    await innerOpen;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();

    expect(inner.getState().open).toBe(false);
    expect(outer.getState().open).toBe(true);

    // and now the outer one is innermost
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();
    expect(outer.getState().open).toBe(false);
  });

  it("7b. Escape is ignored when not modal or not dismissible", async () => {
    const first = fixture();
    const nonModal = make(first, { snapPoints: [0.5], modal: false });
    const second = fixture();
    const fixed = make(second, { snapPoints: [0.5], dismissible: false });

    await Promise.all([
      (async () => {
        const p = nonModal.open();
        await settle();
        await p;
      })(),
      (async () => {
        const p = fixed.open();
        await settle();
        await p;
      })(),
    ]);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();

    expect(nonModal.getState().open).toBe(true);
    expect(fixed.getState().open).toBe(true);
  });

  it("8. update({ snapPoints }) clamps the index and animates", async () => {
    const el = fixture();
    const onSnapIndexChange = vi.fn();
    const controller = make(el, {
      snapPoints: [0.3, 0.6, 0.9],
      defaultSnapIndex: 2,
      onSnapIndexChange,
    });

    const opened = controller.open();
    await settle();
    await opened;
    expect(yOf(el.content)).toBe(100);
    expect(onSnapIndexChange).not.toHaveBeenCalled();

    // index 2 disappears → clamped to 1, callback fires once
    controller.update({ snapPoints: [0.3, 0.6] });
    await settle();
    expect(controller.getState().snapIndex).toBe(1);
    expect(yOf(el.content)).toBe(400);
    expect(onSnapIndexChange).toHaveBeenCalledTimes(1);
    expect(onSnapIndexChange).toHaveBeenCalledWith(1, 0.6);

    // same index, new y → animates without a callback
    controller.update({ snapPoints: [0.3, 0.8] });
    await settle();
    expect(yOf(el.content)).toBe(200);
    expect(onSnapIndexChange).toHaveBeenCalledTimes(1);
  });

  it("9. reduced motion resolves without any animation frames", async () => {
    vi.stubGlobal("matchMedia", (media: string) => ({
      media,
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));

    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });

    await controller.open();

    expect(yOf(el.content)).toBe(500);
    expect(controller.getState().animating).toBe(false);
  });

  it("11. padding-bottom tracks the resting y and Body scrolls per snap", async () => {
    const el = fixture();
    const controller = make(el, {
      snapPoints: [0.4, { value: 0.9, scroll: true }],
    });
    const bodyEl = el.body as HTMLElement;

    const opened = controller.open();
    await settle();
    await opened;

    expect(el.content.style.paddingBottom).toBe("600px");
    expect(el.content.style.getPropertyValue("--snap-sheet-offset")).toBe(
      "600px",
    );
    expect(el.content.getAttribute("data-snap-index")).toBe("0");
    expect(bodyEl.style.overflowY).toBe("");
    expect(bodyEl.style.overflow).toBe("hidden");

    await controller.snapTo(1, { immediate: true });

    expect(el.content.style.paddingBottom).toBe("100px");
    expect(el.content.getAttribute("data-snap-index")).toBe("1");
    expect(bodyEl.style.overflowY).toBe("auto");
    expect(bodyEl.style.overflow).toBe("");
  });

  it("content mode hugs the measured content and resists dismissal", async () => {
    const el = fixture();
    const controller = make(el, { dismissible: false });

    expect(controller.getState().contentMode).toBe(true);
    expect(el.content.hasAttribute("data-content-mode")).toBe(true);

    resizeTo(el.inner, 250);
    const opened = controller.open();
    await settle();
    await opened;
    expect(yOf(el.content)).toBe(750);

    // dismissible: false must clamp back instead of closing
    drag(el.content, 0, 200);
    await settle();
    expect(controller.getState().open).toBe(true);
    expect(yOf(el.content)).toBe(750);
  });

  it("notifies subscribers and stops after unsubscribe", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });
    const seen: number[] = [];
    const unsubscribe = controller.subscribe((state) => seen.push(state.y));

    const opened = controller.open();
    await settle();
    await opened;

    expect(seen.length).toBeGreaterThan(1);
    expect(seen.at(-1)).toBe(500);

    unsubscribe();
    const before = seen.length;
    await controller.snapTo(0, { immediate: true });
    expect(seen).toHaveLength(before);
  });

  it("destroy() is idempotent", () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });
    controller.destroy();
    expect(() => controller.destroy()).not.toThrow();
  });
});
