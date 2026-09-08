import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isBodyScrollLocked } from "../../src/core/scroll-lock.ts";
import {
  createSheet,
  type SheetController,
  type SheetElements,
  type SheetOptions,
} from "../../src/core/sheet.ts";
import {
  installTestEnv,
  isObserved,
  resizeTo,
  setHeight,
  settle,
  stubScroller,
  ViewHeight,
} from "../helpers/env.ts";
import { fire, press } from "../helpers/pointer.ts";

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
  installTestEnv();
});

afterEach(() => {
  for (const controller of controllers) controller.destroy();
  controllers.length = 0;
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

  it("6. honours drag locks and scrolls the body before the sheet", async () => {
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
    stubScroller(bodyEl, { scrollHeight: 3000, clientHeight: 400 });
    bodyEl.scrollTop = 50;

    // mid-scroll: the content takes the gesture until it is back at its top,
    // and the remaining 50 px of the same drag move the sheet down
    drag(bodyEl, 0, 100, { up: false });
    expect(scroller.getState().dragging).toBe(true);
    expect(bodyEl.scrollTop).toBe(0);
    expect(yOf(el.content)).toBe(550);
    fire(bodyEl, "pointerup", { clientY: 100, timeStamp: 210 });
    await settle(scroller);

    // already at the top: the whole drag is the sheet's
    drag(bodyEl, 0, 100, { up: false });
    expect(scroller.getState().dragging).toBe(true);
    expect(bodyEl.scrollTop).toBe(0);
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

  it("12. setElements rewires parts; content/container changes throw", async () => {
    const el = fixture();
    // attach with no header, then hand one over afterwards
    const controller = make(
      { content: el.content, body: el.body, overlay: el.overlay },
      { snapPoints: ["header"] },
    );

    const opened = controller.open();
    await settle();
    await opened;
    // unmeasured "header" resolves to the 50% placeholder
    expect(yOf(el.content)).toBe(500);

    setHeight(el.header as HTMLElement, 120);
    controller.setElements({ header: el.header });
    await settle();
    expect(yOf(el.content)).toBe(880);

    // a later resize of the registered header is picked up
    resizeTo(el.header as HTMLElement, 200);
    await settle();
    expect(yOf(el.content)).toBe(800);

    // removing it drops the measurement back to the placeholder
    controller.setElements({ header: null });
    await settle();
    expect(yOf(el.content)).toBe(500);
    resizeTo(el.header as HTMLElement, 300);
    await settle();
    expect(yOf(el.content)).toBe(500);

    expect(() => controller.setElements({ content: el.inner })).toThrow(
      TypeError,
    );
    expect(() => controller.setElements({ container: el.wrapper })).toThrow(
      TypeError,
    );
  });

  it("12b. setElements wires a late overlay and unwires a removed one", async () => {
    const el = fixture();
    const controller = make({ content: el.content }, { snapPoints: [0.5] });
    const opened = controller.open();
    await settle();
    await opened;

    const overlay = el.overlay as HTMLElement;
    controller.setElements({ overlay });
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect(overlay.getAttribute("data-state")).toBe("open");

    controller.setElements({ overlay: null });
    expect(overlay.getAttribute("aria-hidden")).toBeNull();
    // the detached overlay no longer dismisses
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    expect(controller.getState().open).toBe(true);
  });

  it("12e. setElements hands over a body and a handle in place", async () => {
    const el = fixture();
    const body = el.body as HTMLElement;
    const handle = el.handle as HTMLElement;
    const controller = make(
      { content: el.content },
      { snapPoints: [0.3, { value: 0.9, scroll: true }] },
    );
    const opened = controller.open();
    await settle();
    await opened;
    expect(yOf(el.content)).toBe(700);

    controller.setElements({ body, handle });

    // The handle is labelled, and the body carries the layout of the snap the
    // sheet is already resting at — no scrolling at 0.3.
    expect(handle.getAttribute("aria-label")).toBe("Resize sheet");
    expect(body.style.overflow).toBe("hidden");
    expect(body.style.overflowY).toBe("");

    // Clicking the fresh handle cycles, and the body follows the new snap.
    handle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    expect(controller.getState().snapIndex).toBe(1);
    expect(yOf(el.content)).toBe(100);
    expect(body.style.overflowY).toBe("auto");
    expect(body.style.overflow).toBe("");

    // So do its keys: Enter wraps back to the lowest snap.
    press(handle, "Enter");
    await settle();
    expect(controller.getState().snapIndex).toBe(0);
    expect(body.style.overflow).toBe("hidden");

    controller.setElements({ body: null, handle: null });

    expect(handle.getAttribute("aria-label")).toBeNull();
    // Everything the sheet wrote on the body is handed back.
    expect(body.style.overflow).toBe("");
    expect(body.style.overflowY).toBe("");
    expect(body.style.flex).toBe("");

    handle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    press(handle, "Enter");
    await settle();
    expect(controller.getState().snapIndex).toBe(0);
  });

  it("12c. every method is a no-op after destroy()", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });
    const opened = controller.open();
    await settle();
    await opened;

    controller.destroy();
    const transform = el.content.style.transform;

    await expect(controller.open()).resolves.toBeUndefined();
    await expect(controller.close()).resolves.toBeUndefined();
    await expect(controller.snapTo(0)).resolves.toBeUndefined();
    expect(() => controller.update({ snapPoints: [0.9] })).not.toThrow();
    expect(() => controller.setElements({ header: null })).not.toThrow();
    expect(() => controller.destroy()).not.toThrow();
    expect(controller.subscribe(() => {})).toBeTypeOf("function");

    expect(el.content.style.transform).toBe(transform);
    expect(el.content.getAttribute("data-state")).toBeNull();
  });

  it("getState() keeps one reference until something changes", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });

    const first = controller.getState();
    expect(controller.getState()).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);

    const opened = controller.open();
    await settle();
    await opened;

    const afterOpen = controller.getState();
    expect(afterOpen).not.toBe(first);
    expect(controller.getState()).toBe(afterOpen);
    expect(afterOpen.y).toBe(500);
  });

  it("a re-entrant open() from onOpenChange vetoes the dismissal", async () => {
    const el = fixture();
    let controller: SheetController | undefined;
    controller = make(el, {
      snapPoints: [0.5],
      onOpenChange: (open) => {
        if (!open) void controller?.open();
      },
    });

    const opened = controller.open();
    await settle();
    await opened;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();

    expect(controller.getState().open).toBe(true);
    expect(el.content.getAttribute("data-state")).toBe("open");
    expect(yOf(el.content)).toBe(500);
    // the veto must not have leaked a second body-scroll lock
    controller.destroy();
    expect(document.body.style.overflow).toBe("");
  });

  it("3a. finalises an open whose animation is superseded mid-flight", async () => {
    const el = fixture();
    const onAnimationEnd = vi.fn();
    const controller = make(el, {
      snapPoints: ["content", 0.9],
      onAnimationEnd,
    });

    resizeTo(el.inner, 300);
    const opened = controller.open();
    // land a measurement while the open animation is still running
    await vi.advanceTimersByTimeAsync(100);
    expect(controller.getState().animating).toBe(true);
    resizeTo(el.inner, 200);

    await settle();
    await opened;

    expect(yOf(el.content)).toBe(800);
    expect(onAnimationEnd.mock.calls).toEqual([[true]]);
    expect(controller.getState().open).toBe(true);
  });

  it("3b. finalises a close whose animation is superseded mid-flight", async () => {
    const el = fixture();
    const onAnimationEnd = vi.fn();
    const controller = make(el, { snapPoints: [0.5], onAnimationEnd });

    const opened = controller.open();
    await settle();
    await opened;
    expect(isBodyScrollLocked()).toBe(true);

    const closed = controller.close();
    await vi.advanceTimersByTimeAsync(100);
    expect(controller.getState().animating).toBe(true);
    // a viewport resize mid-close supersedes the closing spring.set
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      configurable: true,
    });
    window.dispatchEvent(new Event("resize"));

    await settle();
    await closed;

    expect(el.content.getAttribute("data-state")).toBe("closed");
    expect(yOf(el.content)).toBe(800);
    expect(isBodyScrollLocked()).toBe(false);
    expect(isInert(el.sibling)).toBe(false);
    expect(onAnimationEnd.mock.calls.filter(([o]) => o === false)).toHaveLength(
      1,
    );
  });

  it("2. a vetoed dismissal leaves no lock or inert behind", async () => {
    const el = fixture();
    let controller: SheetController | undefined;
    controller = make(el, {
      snapPoints: [0.3, 0.9],
      defaultSnapIndex: 0,
      onOpenChange: (open) => {
        if (!open) void controller?.open();
      },
    });

    const opened = controller.open();
    await settle();
    await opened;

    // drag past the lowest snap: dismissal fires, the callback re-opens
    drag(el.content, 0, 90);
    await settle();
    expect(el.content.getAttribute("data-state")).toBe("open");
    expect(controller.getState().open).toBe(true);

    const closed = controller.close();
    await settle();
    await closed;

    expect(isBodyScrollLocked()).toBe(false);
    expect(isInert(el.sibling)).toBe(false);
    // a non-idempotent captureFocus would have remembered a node inside the
    // sheet during the veto, and restored focus back into it here
    expect(el.content.contains(document.activeElement)).toBe(false);
  });

  it("7. drops aria refs it wrote, keeps the consumer's own", async () => {
    const el = fixture();
    el.content.setAttribute("aria-describedby", "mine");
    const controller = make(el, { snapPoints: [0.5], labelledBy: "title" });

    expect(el.content.getAttribute("aria-labelledby")).toBe("title");

    controller.update({ labelledBy: undefined });
    expect(el.content.getAttribute("aria-labelledby")).toBeNull();
    // never written by us, so never removed by us
    expect(el.content.getAttribute("aria-describedby")).toBe("mine");
  });

  it("7b. update({ dismissible: true }) re-arms Escape", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5], dismissible: false });
    const opened = controller.open();
    await settle();
    await opened;

    const pressEscape = () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );

    pressEscape();
    await settle();
    expect(controller.getState().open).toBe(true);

    controller.update({ dismissible: true });
    pressEscape();
    await settle();
    expect(controller.getState().open).toBe(false);
  });

  it("8. open() is deferred while the view is unmeasurable", async () => {
    const el = fixture();
    setHeight(el.wrapper, 0);
    const controller = make(
      { ...el, container: el.wrapper },
      { snapPoints: [0.5] },
    );

    let opened = false;
    const promise = controller.open().then(() => {
      opened = true;
    });
    await settle();

    // held, not dropped: nothing resolved, so there is no position to open to
    expect(opened).toBe(false);
    expect(controller.getState().open).toBe(false);
    expect(el.content.getAttribute("data-state")).toBe("closed");
    expect(isBodyScrollLocked()).toBe(false);

    // the container becomes measurable — the held open() runs now
    resizeTo(el.wrapper, 800);
    await settle();
    await promise;

    expect(opened).toBe(true);
    expect(controller.getState().open).toBe(true);
    expect(el.content.getAttribute("data-state")).toBe("open");
    expect(yOf(el.content)).toBe(400);
  });

  it("8b. a deferred open is cancelled by close() and destroy()", async () => {
    const el = fixture();
    setHeight(el.wrapper, 0);
    const controller = make(
      { ...el, container: el.wrapper },
      { snapPoints: [0.5] },
    );

    void controller.open();
    await controller.close();
    resizeTo(el.wrapper, 800);
    await settle();

    expect(controller.getState().open).toBe(false);
    expect(el.content.getAttribute("data-state")).toBe("closed");
  });

  it("8c. open() still warns and stays closed when no snap is valid", async () => {
    const el = fixture();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // measurable view, but every declared point resolves to nothing
    const controller = make(el, { snapPoints: [0] });

    await controller.open();
    await settle();

    expect(controller.getState().open).toBe(false);
    expect(el.content.getAttribute("data-state")).toBe("closed");
    expect(isBodyScrollLocked()).toBe(false);
    // the point of "still warns": an ignored open() has to be distinguishable
    // from a broken one
    expect(warn.mock.calls.flat().join(" ")).toMatch(/no usable snap point/i);
    warn.mockRestore();
  });

  it("11a. snapTo() while closed moves the index, not the panel", async () => {
    const el = fixture();
    const onSnapIndexChange = vi.fn();
    const controller = make(el, {
      snapPoints: [0.3, 0.9],
      onSnapIndexChange,
    });

    const closedY = yOf(el.content);
    await controller.snapTo(1);
    await settle();

    // index recorded and reported, panel untouched behind data-state="closed"
    expect(controller.getState().snapIndex).toBe(1);
    expect(onSnapIndexChange).toHaveBeenCalledWith(1, 0.9);
    expect(yOf(el.content)).toBe(closedY);
    expect(el.content.getAttribute("data-state")).toBe("closed");

    // the next open() uses it
    const opened = controller.open();
    await settle();
    await opened;
    expect(yOf(el.content)).toBe(100);
  });

  it("11b. skipInitialAnimation applies to the first open only", async () => {
    const el = fixture();
    const controller = make(el, {
      snapPoints: [0.5],
      skipInitialAnimation: true,
    });

    // first open: mounted at position, no frames needed
    await controller.open();
    expect(yOf(el.content)).toBe(500);
    expect(controller.getState().animating).toBe(false);

    const closed = controller.close();
    await settle();
    await closed;

    // second open: animates
    const reopened = controller.open();
    await vi.advanceTimersByTimeAsync(16);
    expect(controller.getState().animating).toBe(true);
    expect(yOf(el.content)).not.toBe(500);
    await settle();
    await reopened;
    expect(yOf(el.content)).toBe(500);
  });

  it("11c. writes restorable base geometry on the overlay", () => {
    const el = fixture();
    const overlay = el.overlay as HTMLElement;
    overlay.style.zIndex = "5";
    const controller = make(el, { snapPoints: [0.5] });

    expect(overlay.style.position).toBe("fixed");
    expect(overlay.style.inset).toBe("0px");
    // colour, z-index and pointer-events stay the consumer's
    expect(overlay.style.zIndex).toBe("5");

    controller.destroy();
    expect(overlay.style.position).toBe("");
    expect(overlay.style.inset).toBe("");
    expect(overlay.style.zIndex).toBe("5");
  });

  it("11d. positions the overlay absolutely inside a container", () => {
    const el = fixture();
    setHeight(el.wrapper, 600);
    make({ ...el, container: el.wrapper }, { snapPoints: [0.5] });
    expect((el.overlay as HTMLElement).style.position).toBe("absolute");
  });

  it("11e. keeps the measured wrapper from being shrunk by the panel", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: ["content"] });

    // the library owns this now: without it the wrapper is a shrinkable flex
    // item of a panel whose content box is only the visible strip. It is also
    // a flex column itself, or Body's flex/min-height would be inert inside it.
    expect(el.inner.style.display).toBe("flex");
    expect(el.inner.style.flexDirection).toBe("column");
    // no height cap: the panel's content box already bounds it, and a 100dvh
    // cap ignores padding-bottom (audit P0-8 by the back door)
    expect(el.inner.style.maxHeight).toBe("");

    resizeTo(el.inner, 200);
    const opened = controller.open();
    await settle();
    await opened;
    expect(yOf(el.content)).toBe(800);

    // growth is the case the shrink used to freeze
    resizeTo(el.inner, 400);
    await settle();
    expect(yOf(el.content)).toBe(600);

    controller.destroy();
    expect(el.inner.style.flex).toBe("");
  });

  it("11f. a locked direction cannot be flung past", async () => {
    const el = fixture();
    const onOpenChange = vi.fn();
    const controller = make(el, {
      snapPoints: [{ value: 0.3, drag: { down: false } }, 0.9],
      defaultSnapIndex: 0,
      onOpenChange,
    });

    const opened = controller.open();
    await settle();
    await opened;
    expect(yOf(el.content)).toBe(700);

    // six 20px moves with no delay: dy is locked to 0 but vy is large
    fire(el.content, "pointerdown", { clientY: 0, timeStamp: 0 });
    for (let i = 1; i <= 6; i++) {
      fire(el.content, "pointermove", { clientY: i * 20, timeStamp: i });
    }
    fire(el.content, "pointerup", { clientY: 120, timeStamp: 6 });
    await settle();

    expect(controller.getState().open).toBe(true);
    expect(controller.getState().snapIndex).toBe(0);
    expect(yOf(el.content)).toBe(700);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("12a. a modal sheet in a container locks the container, not the page", async () => {
    const el = fixture();
    setHeight(el.wrapper, 600);
    el.wrapper.style.overflow = "auto";
    document.documentElement.style.overflow = "scroll";

    const controller = make(
      { ...el, container: el.wrapper },
      { snapPoints: [0.5] },
    );
    const opened = controller.open();
    await settle();
    await opened;

    expect(el.wrapper.style.overflow).toBe("hidden");
    expect(el.wrapper.style.overscrollBehavior).toBe("none");
    // the host page keeps its own scrolling and its own inline value
    expect(document.documentElement.style.overflow).toBe("scroll");
    expect(document.body.style.overflow).toBe("");
    expect(isBodyScrollLocked()).toBe(false);

    const closed = controller.close();
    await settle();
    await closed;

    expect(el.wrapper.style.overflow).toBe("auto");
  });

  it("12b. refcounts two sheets sharing one container", async () => {
    const outer = fixture();
    setHeight(outer.wrapper, 600);
    const innerEl = fixture();
    // both sheets live in the same container element
    outer.wrapper.append(innerEl.content);

    const first = make(
      { ...outer, container: outer.wrapper },
      { snapPoints: [0.5] },
    );
    const second = make(
      { content: innerEl.content, container: outer.wrapper },
      { snapPoints: [0.5] },
    );

    const a = first.open();
    await settle();
    await a;
    const b = second.open();
    await settle();
    await b;
    expect(outer.wrapper.style.overflow).toBe("hidden");

    const closedSecond = second.close();
    await settle();
    await closedSecond;
    // the first sheet is still open, so the container stays locked
    expect(outer.wrapper.style.overflow).toBe("hidden");

    const closedFirst = first.close();
    await settle();
    await closedFirst;
    expect(outer.wrapper.style.overflow).toBe("");
  });

  it("12c. destroy() mid-open releases the container", async () => {
    const el = fixture();
    setHeight(el.wrapper, 600);
    el.wrapper.style.overflow = "scroll";
    const controller = make(
      { ...el, container: el.wrapper },
      { snapPoints: [0.5] },
    );

    void controller.open();
    await vi.advanceTimersByTimeAsync(32);
    expect(el.wrapper.style.overflow).toBe("hidden");

    controller.destroy();
    expect(el.wrapper.style.overflow).toBe("scroll");
  });

  it("12d. Escape still reaches an embedded modal sheet", async () => {
    const el = fixture();
    setHeight(el.wrapper, 600);
    const controller = make(
      { ...el, container: el.wrapper },
      { snapPoints: [0.5] },
    );
    const opened = controller.open();
    await settle();
    await opened;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();

    expect(controller.getState().open).toBe(false);
  });

  it("13a. does not finalise a transition on the first frame", async () => {
    const el = fixture();
    const onAnimationEnd = vi.fn();
    const controller = make(el, { snapPoints: [0.5], onAnimationEnd });

    const opened = controller.open();
    await vi.advanceTimersByTimeAsync(16);

    // one frame in, the panel has barely moved: nothing about this transition
    // has finished, so none of its tail may have run yet
    expect(controller.getState().animating).toBe(true);
    expect(onAnimationEnd).not.toHaveBeenCalled();
    expect(yOf(el.content)).toBeGreaterThan(900);
    expect(el.content.style.paddingBottom).toBe("");
    expect(el.content.getAttribute("data-snap-index")).toBeNull();

    await settle();
    await opened;

    expect(controller.getState().animating).toBe(false);
    expect(onAnimationEnd).toHaveBeenCalledExactlyOnceWith(true);
    expect(yOf(el.content)).toBe(500);
    expect(el.content.style.paddingBottom).toBe("500px");
    expect(el.content.getAttribute("data-snap-index")).toBe("0");
  });

  it("A.2 a deferred open settles when close() cancels it", async () => {
    const el = fixture();
    setHeight(el.wrapper, 0);
    const controller = make(
      { ...el, container: el.wrapper },
      { snapPoints: [0.5] },
    );

    let settled = false;
    void controller.open().then(() => {
      settled = true;
    });
    await controller.close();
    await settle(controller);

    expect(settled).toBe(true);
    expect(controller.getState().open).toBe(false);
  });

  it("A.2 a deferred open settles when destroy() cancels it", async () => {
    const el = fixture();
    setHeight(el.wrapper, 0);
    const controller = make(
      { ...el, container: el.wrapper },
      { snapPoints: [0.5] },
    );

    let settled = false;
    void controller.open().then(() => {
      settled = true;
    });
    controller.destroy();
    await settle();

    expect(settled).toBe(true);
  });

  it("A.3 a non-modal sheet does not touch focus", async () => {
    const el = fixture();
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const controller = make(el, { snapPoints: [0.5], modal: false });
    const opened = controller.open();
    await settle(controller);
    await opened;

    expect(document.activeElement).toBe(outside);

    const closed = controller.close();
    await settle(controller);
    await closed;
    expect(document.activeElement).toBe(outside);
  });

  it("A.4 close() does not resolve on a later open()", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });
    const opened = controller.open();
    await settle(controller);
    await opened;

    let closeSettled = false;
    void controller.close().then(() => {
      closeSettled = true;
    });
    await vi.advanceTimersByTimeAsync(16);
    // reopen before the close finishes: the close can never complete now
    const reopened = controller.open();
    await settle(controller);
    await reopened;

    // it must have been settled as superseded, not left hanging...
    expect(closeSettled).toBe(true);
    // ...and the sheet is open, which is what the old shared list confused it with
    expect(controller.getState().open).toBe(true);
  });

  it("A.5 destroy() gives the body's inline styles back", async () => {
    const el = fixture();
    const body = el.body as HTMLElement;
    body.style.overflow = "scroll";
    body.style.flex = "2 2 auto";
    // The declarations, not the attribute string: restoring writes them back
    // one property at a time, so their order is the library's, not the
    // consumer's. What matters is that the same set comes back.
    const declarations = () =>
      (body.getAttribute("style") ?? "")
        .split(";")
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .sort();
    const before = declarations();

    const controller = make(el, {
      snapPoints: [{ value: 0.5, scroll: true }],
    });
    const opened = controller.open();
    await settle(controller);
    await opened;
    // the library has written its own overflow/flex by now
    expect(body.style.overflowY).toBe("auto");

    controller.destroy();

    expect(declarations()).toEqual(before);
  });

  it("A.6 a non-dismissible modal swallows Escape", async () => {
    const outerEl = fixture();
    const outer = make(outerEl, { snapPoints: [0.5] });
    const outerOpen = outer.open();
    await settle(outer);
    await outerOpen;

    const innerEl = fixture();
    const inner = make(innerEl, { snapPoints: [0.5], dismissible: false });
    const innerOpen = inner.open();
    await settle(inner);
    await innerOpen;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle(outer);

    // neither closes: the inner one owns Escape and refuses it, and Escape
    // must not fall through to the sheet behind it
    expect(inner.getState().open).toBe(true);
    expect(outer.getState().open).toBe(true);
  });

  it("A.8 Escape is ignored once a child has handled it", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });
    const opened = controller.open();
    await settle(controller);
    await opened;

    const field = document.createElement("input");
    (el.body as HTMLElement).append(field);
    field.addEventListener("keydown", (event) => event.preventDefault());

    // cancelable matters: preventDefault() is a no-op without it, so the
    // event would reach the document with defaultPrevented still false
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(controller);

    expect(controller.getState().open).toBe(true);
  });

  it("A.7 a cancelled drag still reports onDragEnd", async () => {
    const el = fixture();
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();
    const controller = make(el, {
      snapPoints: [0.5, 0.9],
      onDragStart,
      onDragEnd,
    });
    const opened = controller.open();
    await settle(controller);
    await opened;

    fire(el.content, "pointerdown", { clientY: 0, timeStamp: 0 });
    fire(el.content, "pointermove", { clientY: 8, timeStamp: 10 });
    expect(onDragStart).toHaveBeenCalledTimes(1);

    fire(el.content, "pointercancel", { clientY: 8, timeStamp: 20 });
    await settle(controller);

    // every drag that starts must end, or a consumer's "dragging" flag sticks
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(controller.getState().dragging).toBe(false);
  });

  it("A.12 a closed panel does not drag", async () => {
    const el = fixture();
    const onDragStart = vi.fn();
    const controller = make(el, { snapPoints: [0.5], onDragStart });
    const closedY = yOf(el.content);

    fire(el.content, "pointerdown", { clientY: 0, timeStamp: 0 });
    fire(el.content, "pointermove", { clientY: 8, timeStamp: 10 });
    fire(el.content, "pointermove", { clientY: 200, timeStamp: 100 });
    fire(el.content, "pointerup", { clientY: 200, timeStamp: 110 });
    await settle();

    expect(onDragStart).not.toHaveBeenCalled();
    expect(controller.getState().dragging).toBe(false);
    expect(yOf(el.content)).toBe(closedY);
  });

  it("A.11 update({ modal }) pairs focus with the lock", async () => {
    const el = fixture();
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();

    const controller = make(el, { snapPoints: [0.5], modal: false });
    const opened = controller.open();
    await settle(controller);
    await opened;
    expect(document.activeElement).toBe(outside);

    controller.update({ modal: true });
    expect(el.content.contains(document.activeElement)).toBe(true);

    controller.update({ modal: false });
    expect(document.activeElement).toBe(outside);
  });

  it("A.14b destroy() stops observing the elements it watched", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: ["content", "header"] });
    const opened = controller.open();
    await settle(controller);
    await opened;

    expect(isObserved(el.inner)).toBe(true);
    expect(isObserved(el.header as HTMLElement)).toBe(true);

    controller.destroy();

    // a leaked observer keeps a detached node alive and fires into a dead
    // controller; the fake is target-aware now, so this can actually fail
    expect(isObserved(el.inner)).toBe(false);
    expect(isObserved(el.header as HTMLElement)).toBe(false);
  });

  it("B.4 update() re-applies layout when only `scroll` changed", async () => {
    const el = fixture();
    const body = el.body as HTMLElement;
    const controller = make(el, { snapPoints: [{ value: 0.5 }] });
    const opened = controller.open();
    await settle(controller);
    await opened;

    expect(body.style.overflow).toBe("hidden");

    // same index, same y — only the config moved
    controller.update({ snapPoints: [{ value: 0.5, scroll: true }] });
    await settle(controller);

    // without this the body stays clipped while the drag logic yields to a
    // scroll that cannot happen: the sheet neither scrolls nor drags
    expect(body.style.overflowY).toBe("auto");
    expect(el.inner.style.flex).toBe("1 1 auto");
  });

  it("B.6 keeps the body a scroller while the sheet drags", async () => {
    const el = fixture();
    const body = el.body as HTMLElement;
    const controller = make(el, {
      snapPoints: [{ value: 0.5, scroll: true }, 0.9],
    });
    const opened = controller.open();
    await settle(controller);
    await opened;
    expect(body.style.overflowY).toBe("auto");

    stubScroller(body, { scrollHeight: 3000, clientHeight: 400 });

    // at the top of the list, moving down: the sheet takes the gesture
    fire(body, "pointerdown", { clientY: 0, timeStamp: 0 });
    fire(body, "pointermove", { clientY: 8, timeStamp: 10 });
    expect(controller.getState().dragging).toBe(true);
    // B.6 used to freeze the body here. The arbiter decides per frame instead,
    // so the styles that make the body a scroller must stay exactly as they are
    // — a reversal mid-gesture scrolls the list, and nothing reflows.
    expect(body.style.overflowY).toBe("auto");
    expect(body.style.touchAction).toBe("pan-x");
    expect(body.style.getPropertyValue("overflow")).toBe("");

    fire(body, "pointermove", { clientY: 120, timeStamp: 100 });
    expect(yOf(el.content)).toBe(620);
    // and back up: the list scrolls, the sheet stops at its snap
    fire(body, "pointermove", { clientY: 0, timeStamp: 140 });
    expect(yOf(el.content)).toBe(500);
    expect(body.scrollTop).toBe(0);
    fire(body, "pointermove", { clientY: -40, timeStamp: 180 });
    expect(yOf(el.content)).toBe(500);
    expect(body.scrollTop).toBe(40);

    fire(body, "pointerup", { clientY: -40, timeStamp: 190 });
    await settle(controller);

    expect(body.style.overflowY).toBe("auto");
    expect(body.style.touchAction).toBe("pan-x");
  });

  it("B.3 a partial scroll snap bounds the body at the fold (P0-8)", async () => {
    const el = fixture();
    const body = el.body as HTMLElement;
    // scroll at a PARTIAL snap is the P0-8 case: the panel is full height and
    // translated down, so anything not bounded by the content box hangs below
    // the viewport with no way to scroll it up
    const controller = make(el, {
      snapPoints: [{ value: 0.5, scroll: true }],
    });
    const opened = controller.open();
    await settle(controller);
    await opened;

    const y = 500;
    expect(yOf(el.content)).toBe(y);
    // the chain that keeps the scroll region inside the visible strip:
    // panel content box = 100dvh - padding-bottom, wrapper fills it, body fills
    // the wrapper. Break any link and the bottom `y` px become unreachable.
    expect(el.content.style.paddingBottom).toBe(`${y}px`);
    expect(el.inner.style.display).toBe("flex");
    expect(el.inner.style.flexDirection).toBe("column");
    expect(el.inner.style.flex).toBe("1 1 auto");
    expect(el.inner.style.maxHeight).toBe("");
    expect(body.style.flex).toBe("1 1 auto");
    expect(body.style.minHeight).toBe("0px");
    expect(body.style.overflowY).toBe("auto");
  });

  it("destroy() is idempotent", () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });
    controller.destroy();
    expect(() => controller.destroy()).not.toThrow();
  });
});
