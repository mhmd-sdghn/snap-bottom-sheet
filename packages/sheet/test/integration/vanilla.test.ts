import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  SheetController,
  SheetOptions,
  SnapPoint,
} from "../../src/index.ts";
import { createSheet, steps } from "../../src/index.ts";
import {
  installTestEnv,
  isInert,
  resizeTo,
  setHeight,
  settle,
  ViewHeight,
  yOf,
} from "../helpers/env.ts";
import { fire } from "../helpers/pointer.ts";

/**
 * The engine driven the way a vanilla consumer drives it: hand-built DOM, no
 * framework, and nothing imported but the public core entry — if a refactor
 * moves a module, this file must not notice.
 */

interface Fixture {
  wrapper: HTMLElement;
  overlay: HTMLElement;
  content: HTMLElement;
  inner: HTMLElement;
  handle: HTMLElement;
  header: HTMLElement;
  body: HTMLElement;
  sibling: HTMLElement;
}

/**
 * wrapper > (overlay + content > inner > (handle, header, body)).
 *
 * `content` must hold exactly ONE `[data-snap-sheet-inner]` child with
 * everything else nested inside it: that wrapper is what a "content" snap is
 * measured from, and without it the measurement falls back to the panel — which
 * is the full view height, so the snap silently resolves to "fully open".
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
  const sibling = document.createElement("div");

  inner.append(handle, header, body);
  content.append(inner);
  wrapper.append(overlay, content);
  document.body.append(sibling, wrapper);

  return { wrapper, overlay, content, inner, handle, header, body, sibling };
}

const controllers: SheetController[] = [];

function make(el: Fixture, options: SheetOptions = {}): SheetController {
  const controller = createSheet(
    {
      content: el.content,
      overlay: el.overlay,
      handle: el.handle,
      header: el.header,
      body: el.body,
    },
    options,
  );
  controllers.push(controller);
  return controller;
}

/** Frames until this controller's spring is at rest. */
const rest = (c: SheetController) => settle(() => !c.getState().animating);

/** open() + drive the animation to its end, both awaited. */
async function opened(c: SheetController): Promise<void> {
  const done = c.open();
  await rest(c);
  await done;
}

/** pointerdown → threshold move → move → pointerup, all on `el`. */
function drag(el: HTMLElement, from: number, to: number): void {
  const direction = to >= from ? 1 : -1;
  fire(el, "pointerdown", { clientY: from, timeStamp: 0 });
  fire(el, "pointermove", { clientY: from + direction * 4, timeStamp: 10 });
  fire(el, "pointermove", { clientY: to, timeStamp: 200 });
  fire(el, "pointerup", { clientY: to, timeStamp: 210 });
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

describe("vanilla integration", () => {
  it("attach writes base styles and starts closed", () => {
    const el = fixture();
    make(el, { snapPoints: [0.5] });

    expect(el.content.style.position).toBe("fixed");
    expect(el.content.style.height).toBe("100dvh");
    expect(el.content.style.flexDirection).toBe("column");
    expect(el.content.style.touchAction).toBe("none");
    expect(el.content.getAttribute("role")).toBe("dialog");
    expect(el.content.getAttribute("tabindex")).toBe("-1");
    expect(el.content.getAttribute("data-state")).toBe("closed");
    expect(el.overlay.getAttribute("data-state")).toBe("closed");
    expect(el.overlay.getAttribute("aria-hidden")).toBe("true");
    expect(el.inner.style.flex).toBe("0 0 auto");
    expect(yOf(el.content)).toBe(ViewHeight);
  });

  it("open() animates to the default snap and close() reverses", async () => {
    const el = fixture();
    const onAnimationEnd = vi.fn();
    const c = make(el, { snapPoints: [0.5], onAnimationEnd });

    const open = c.open();
    expect(el.content.getAttribute("data-state")).toBe("open");
    expect(document.body.style.overflow).toBe("hidden");
    await rest(c);
    await open;

    expect(yOf(el.content)).toBe(500);
    expect(el.content.style.paddingBottom).toBe("500px");
    expect(el.content.style.getPropertyValue("--snap-sheet-y")).toBe("500px");
    expect(c.getState()).toMatchObject({ open: true, y: 500, progress: 1 });
    expect(onAnimationEnd).toHaveBeenLastCalledWith(true);

    const close = c.close();
    await rest(c);
    await close;

    expect(yOf(el.content)).toBe(ViewHeight);
    expect(el.content.getAttribute("data-state")).toBe("closed");
    expect(document.body.style.overflow).toBe("");
    expect(c.getState()).toMatchObject({ open: false, y: 1000, progress: 0 });
    expect(onAnimationEnd).toHaveBeenLastCalledWith(false);
  });

  it("resolves snap points in consumer order, not sorted", async () => {
    const el = fixture();
    const c = make(el, { snapPoints: [0.9, 0.3] });

    await opened(c);

    // index 0 is the FIRST entry the consumer passed (900px tall), not the
    // smallest one.
    expect(yOf(el.content)).toBe(100);
    expect(el.content.getAttribute("data-snap-index")).toBe("0");

    const snap = c.snapTo(1);
    await rest(c);
    await snap;

    expect(yOf(el.content)).toBe(700);
    expect(el.content.getAttribute("data-snap-index")).toBe("1");
    expect(c.getState().snapIndex).toBe(1);
  });

  it("a drag lands on the nearest snap and reports the new index", async () => {
    const el = fixture();
    const changes: [number, SnapPoint][] = [];
    const onDragEnd = vi.fn();
    const c = make(el, {
      snapPoints: [0.9, 0.3],
      onDragEnd,
      onSnapIndexChange: (index, point) => changes.push([index, point]),
    });

    await opened(c);
    expect(yOf(el.content)).toBe(100);

    // 500px down from y=100 → released at 600, which is nearer 700 than 100.
    drag(el.content, 200, 700);
    expect(yOf(el.content)).toBe(600);
    expect(c.getState().dragging).toBe(false);
    await rest(c);

    expect(yOf(el.content)).toBe(700);
    expect(c.getState().snapIndex).toBe(1);
    expect(changes).toEqual([[1, 0.3]]);
    expect(onDragEnd).toHaveBeenCalledWith(1);
    expect(c.getState().open).toBe(true);
  });

  it("a drag past the dismissal threshold closes the sheet", async () => {
    const el = fixture();
    const onOpenChange = vi.fn();
    const onDragEnd = vi.fn();
    const c = make(el, { snapPoints: [0.3], onOpenChange, onDragEnd });

    await opened(c);
    expect(yOf(el.content)).toBe(700);

    // 200px below the only snap; the threshold is min(80, 25% of 300) = 75.
    drag(el.content, 200, 400);
    expect(yOf(el.content)).toBe(900);
    expect(onDragEnd).toHaveBeenCalledWith(-1);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await rest(c);

    expect(yOf(el.content)).toBe(ViewHeight);
    expect(el.content.getAttribute("data-state")).toBe("closed");
    expect(c.getState().open).toBe(false);
  });

  it('"header" and "content" snaps follow their measured elements', async () => {
    const el = fixture();
    setHeight(el.header, 100);
    setHeight(el.inner, 300);
    const c = make(el, { snapPoints: ["header", "content"] });

    await opened(c);
    expect(yOf(el.content)).toBe(900);

    resizeTo(el.header, 250);
    await rest(c);
    expect(yOf(el.content)).toBe(750);

    const snap = c.snapTo(1);
    await rest(c);
    await snap;
    expect(yOf(el.content)).toBe(700);

    resizeTo(el.inner, 600);
    await rest(c);
    expect(yOf(el.content)).toBe(400);
  });

  it("scroll: true turns the body into the scroller at that snap", async () => {
    const el = fixture();
    const c = make(el, { snapPoints: [0.3, { value: 0.9, scroll: true }] });

    await opened(c);

    expect(el.body.style.overflow).toBe("hidden");
    expect(el.body.style.flex).toBe("0 0 auto");
    expect(el.body.style.minHeight).toBe("0px");

    const up = c.snapTo(1);
    await rest(c);
    await up;

    expect(el.body.style.overflowY).toBe("auto");
    expect(el.body.style.flex).toBe("1 1 auto");

    const down = c.snapTo(0);
    await rest(c);
    await down;

    expect(el.body.style.overflow).toBe("hidden");
    expect(el.body.style.flex).toBe("0 0 auto");
  });

  it("steps(3) produces three evenly spaced snaps", async () => {
    const points = steps(3);
    expect(points).toHaveLength(3);
    expect(points[0]).toBeCloseTo(1 / 3, 10);
    expect(points[1]).toBeCloseTo(2 / 3, 10);
    expect(points[2]).toBe(1);

    const el = fixture();
    const c = make(el, { snapPoints: points });

    await opened(c);
    expect(yOf(el.content)).toBe(667);

    const snap = c.snapTo(2);
    await rest(c);
    await snap;
    expect(yOf(el.content)).toBe(0);
    expect(c.getState().progress).toBe(1);
  });

  it("Escape closes a modal, dismissible sheet", async () => {
    const el = fixture();
    const onOpenChange = vi.fn();
    const c = make(el, { snapPoints: [0.5], onOpenChange });

    await opened(c);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await rest(c);
    expect(el.content.getAttribute("data-state")).toBe("closed");
    expect(yOf(el.content)).toBe(ViewHeight);
    expect(document.body.style.overflow).toBe("");
  });

  it("destroy() gives the page back and is idempotent", async () => {
    const el = fixture();
    const c = make(el, { snapPoints: [0.5] });

    await opened(c);
    expect(document.body.style.overflow).toBe("hidden");
    expect(isInert(el.sibling)).toBe(true);

    c.destroy();

    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(isInert(el.sibling)).toBe(false);
    expect(el.content.style.position).toBe("");
    expect(el.content.style.transform).toBe("");
    expect(el.content.style.getPropertyValue("--snap-sheet-y")).toBe("");
    expect(el.content.getAttribute("role")).toBeNull();
    expect(el.content.getAttribute("data-state")).toBeNull();
    expect(el.content.getAttribute("data-snap-index")).toBeNull();
    expect(el.overlay.getAttribute("data-state")).toBeNull();

    expect(() => c.destroy()).not.toThrow();

    // Every listener is gone: a drag no longer moves the panel.
    drag(el.content, 200, 700);
    expect(el.content.style.transform).toBe("");
  });
});
