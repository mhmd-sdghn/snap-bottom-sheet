/**
 * The drag ↔ scroll handoff (PLAN §3.4 rule 2, task 19): one finger, two
 * phases, no lift in between.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  stubScroller,
  ViewHeight,
} from "../helpers/env.ts";
import { fire } from "../helpers/pointer.ts";

interface Fixture extends SheetElements {
  inner: HTMLElement;
  body: HTMLElement;
  handle: HTMLElement;
  header: HTMLElement;
}

/** The shape the React layer renders. */
function fixture(): Fixture {
  const content = document.createElement("div");
  const inner = document.createElement("div");
  inner.setAttribute("data-snap-sheet-inner", "");
  const handle = document.createElement("button");
  const header = document.createElement("div");
  const body = document.createElement("div");

  inner.append(handle, header, body);
  content.append(inner);
  document.body.append(content);

  return { content, inner, handle, header, body };
}

const controllers: SheetController[] = [];
const make = (elements: SheetElements, options: SheetOptions = {}) => {
  const controller = createSheet(elements, options);
  controllers.push(controller);
  return controller;
};

const yOf = (content: HTMLElement) =>
  Number(
    /translate3d\(0, (-?[\d.]+)px, 0\)/.exec(content.style.transform)?.[1] ??
      Number.NaN,
  );

const HeaderHeight = 120;
/** ["header", scrollable half, full]: y = 880, 500, 0. */
const Snaps: SheetOptions["snapPoints"] = [
  "header",
  { value: 0.5, scroll: true },
  1,
];

/**
 * A measured, open sheet with a long list inside Body. `contentHeight` is what
 * tells the arbiter the list will overflow a snap it has not reached yet, so it
 * is measured here the way a ResizeObserver would report it.
 */
async function open(
  el: Fixture,
  options: SheetOptions = {},
  sizes: { scrollHeight?: number; contentHeight?: number } = {},
) {
  // Measured before attach: the observers read the elements as they are, and a
  // header of 0 would resolve to the placeholder half-view snap with a warning.
  setHeight(el.header, HeaderHeight);
  setHeight(el.inner, sizes.contentHeight ?? 3000);
  const controller = make(el, { snapPoints: Snaps, ...options });
  resizeTo(el.header, HeaderHeight);
  resizeTo(el.inner, sizes.contentHeight ?? 3000);
  stubScroller(el.body, {
    scrollHeight: sizes.scrollHeight ?? 3000,
    clientHeight: 400,
  });
  const opened = controller.open();
  await settle(controller);
  await opened;
  return controller;
}

/**
 * One unbroken finger: pointerdown, the 4 px that crosses the recogniser's
 * threshold, then `count` moves of `step` px (negative = upwards), `stepMs`
 * apart. The threshold movement is not lost — the first move carries it.
 */
function swipe(
  el: HTMLElement,
  from: number,
  step: number,
  count: number,
  stepMs = 16,
) {
  fire(el, "pointerdown", { clientY: from, timeStamp: 0 });
  fire(el, "pointermove", {
    clientY: from + Math.sign(step) * 4,
    timeStamp: stepMs,
  });
  let y = from;
  let time = stepMs;
  for (let i = 0; i < count; i += 1) {
    y += step;
    time += stepMs;
    fire(el, "pointermove", { clientY: y, timeStamp: time });
  }
  return {
    y,
    release: () => fire(el, "pointerup", { clientY: y, timeStamp: time + 10 }),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  installTestEnv();
});

afterEach(() => {
  for (const controller of controllers) controller.destroy();
  controllers.length = 0;
  vi.useRealTimers();
});

describe("drag ↔ scroll handoff", () => {
  it("1. hands a drag up over to the content at the scrolling snap", async () => {
    const el = fixture();
    const controller = await open(el);
    expect(yOf(el.content)).toBe(ViewHeight - HeaderHeight);

    // 30 × 20 px upwards: 380 px of sheet, then 220 px of content
    const gesture = swipe(el.body, 800, -20, 30);

    expect(yOf(el.content)).toBe(500);
    expect(el.body.scrollTop).toBe(220);
    // the snap the sheet stopped at is the active one from the crossing on
    expect(controller.getState().snapIndex).toBe(1);
    expect(el.content.getAttribute("data-snap-index")).toBe("1");
    expect(el.body.style.overflowY).toBe("auto");
    expect(el.content.hasAttribute("data-scrolling")).toBe(true);
    expect(el.content.hasAttribute("data-dragging")).toBe(false);

    gesture.release();
    expect(el.content.hasAttribute("data-scrolling")).toBe(false);
  });

  it("1b. drags the sheet, not the content, before the crossing", async () => {
    const el = fixture();
    await open(el);

    swipe(el.body, 800, -20, 5);

    expect(yOf(el.content)).toBe(780);
    expect(el.body.scrollTop).toBe(0);
    expect(el.content.hasAttribute("data-dragging")).toBe(true);
    expect(el.content.hasAttribute("data-scrolling")).toBe(false);
  });

  it("2. hands the top of the content back to the sheet", async () => {
    const el = fixture();
    const controller = await open(el, { defaultSnapIndex: 1 });
    el.body.scrollTop = 300;

    // 25 × 20 px down: 300 px of content, then 200 px of sheet, slowly enough
    // that the release projects nowhere in particular
    const gesture = swipe(el.body, 100, 20, 25, 100);

    expect(el.body.scrollTop).toBe(0);
    expect(yOf(el.content)).toBe(700);
    expect(el.content.hasAttribute("data-dragging")).toBe(true);

    gesture.release();
    await settle(controller);

    // the sheet released like any other drag: nearest snap to the projection
    expect(controller.getState().snapIndex).toBe(0);
    expect(yOf(el.content)).toBe(ViewHeight - HeaderHeight);
  });

  it("3. has no ceiling outside Body: the handle reaches the top snap", async () => {
    const el = fixture();
    const controller = await open(el, { defaultSnapIndex: 1 });

    const gesture = swipe(el.handle, 600, -20, 20);
    // straight past the scrolling snap it started at
    expect(yOf(el.content)).toBe(100);
    expect(el.body.scrollTop).toBe(0);

    gesture.release();
    await settle(controller);
    expect(controller.getState().snapIndex).toBe(2);
  });

  it("4. keeps dragging when the content is shorter than the body", async () => {
    const el = fixture();
    const controller = await open(
      el,
      {},
      { scrollHeight: 300, contentHeight: 300 },
    );

    const gesture = swipe(el.body, 900, -20, 43);
    expect(yOf(el.content)).toBe(20);
    expect(el.body.scrollTop).toBe(0);

    gesture.release();
    await settle(controller);
    expect(controller.getState().snapIndex).toBe(2);
  });

  it("5. flings the content after a release, and stops at both ends", async () => {
    const el = fixture();
    await open(el, { defaultSnapIndex: 1 });
    el.body.scrollTop = 500;

    swipe(el.body, 800, -20, 5).release();
    const atRelease = el.body.scrollTop;
    expect(atRelease).toBe(600);

    await vi.advanceTimersByTimeAsync(32);
    const coasting = el.body.scrollTop;
    expect(coasting).toBeGreaterThan(atRelease);

    await settle();
    const stopped = el.body.scrollTop;
    expect(stopped).toBeGreaterThan(coasting);
    // decelerated rather than run to the end of the list
    expect(stopped).toBeLessThan(3000 - 400);
    // and the sheet never moved
    expect(yOf(el.content)).toBe(500);

    // downward: it stops exactly at the top, without moving the sheet
    el.body.scrollTop = 100;
    swipe(el.body, 100, 20, 2).release();
    expect(el.body.scrollTop).toBe(60);
    await settle();
    expect(el.body.scrollTop).toBe(0);
    expect(yOf(el.content)).toBe(500);
  });

  it("6. does not fling under reducedMotion", async () => {
    const el = fixture();
    await open(el, { defaultSnapIndex: 1, reducedMotion: true });
    el.body.scrollTop = 500;

    swipe(el.body, 800, -20, 5).release();
    expect(el.body.scrollTop).toBe(600);

    await settle();
    expect(el.body.scrollTop).toBe(600);
  });

  it("7. respects a downward lock after the content reaches its top", async () => {
    const el = fixture();
    await open(el, {
      snapPoints: [
        "header",
        { value: 0.5, scroll: true, drag: { down: false } },
        1,
      ],
      defaultSnapIndex: 1,
    });
    el.body.scrollTop = 200;

    swipe(el.body, 100, 20, 20);

    expect(el.body.scrollTop).toBe(0);
    // the remaining 200 px have nowhere to go: the snap refuses to be dragged down
    expect(yOf(el.content)).toBe(500);
  });

  it("7b. a locked direction still hands the gesture to the content", async () => {
    const el = fixture();
    await open(el, {
      snapPoints: [
        "header",
        { value: 0.5, scroll: true, drag: { up: false } },
        1,
      ],
      defaultSnapIndex: 1,
    });

    // The snap refuses to be dragged up, but the list under the finger is not
    // refusing anything: the movement is the content's.
    swipe(el.body, 800, -20, 10);

    expect(el.body.scrollTop).toBe(200);
    expect(yOf(el.content)).toBe(500);
  });

  it("9. releases the sheet at the speed the sheet was moving", async () => {
    const el = fixture();
    const sheet = await open(el, { defaultSnapIndex: 1 });
    el.body.scrollTop = 60;

    // Two fast frames clear the last 60 px of scroll, and only the tail of the
    // second one reaches the sheet, moving it 20 px. The pointer was travelling
    // at 2.5 px/ms throughout, so releasing on the recogniser's own velocity
    // projects far below the lowest snap and dismisses the sheet.
    fire(el.body, "pointerdown", { clientY: 100, timeStamp: 0 });
    fire(el.body, "pointermove", { clientY: 104, timeStamp: 16 });
    fire(el.body, "pointermove", { clientY: 144, timeStamp: 32 });
    fire(el.body, "pointermove", { clientY: 184, timeStamp: 48 });
    fire(el.body, "pointerup", { clientY: 184, timeStamp: 58 });
    await settle();

    expect(el.body.scrollTop).toBe(0);
    expect(sheet.getState().open).toBe(true);
    expect(sheet.getState().snapIndex).toBe(1);
    expect(yOf(el.content)).toBe(500);
  });

  it("10. swapping Body stops a fling on the old one", async () => {
    const el = fixture();
    const sheet = await open(el, { defaultSnapIndex: 1 });
    el.body.scrollTop = 500;

    swipe(el.body, 800, -20, 5).release();
    await vi.advanceTimersByTimeAsync(32);
    const caught = el.body.scrollTop;
    expect(caught).toBeGreaterThan(600);

    const next = document.createElement("div");
    el.inner.append(next);
    stubScroller(next, { scrollHeight: 3000, clientHeight: 400 });
    sheet.setElements({ body: next });

    await settle();
    expect(el.body.scrollTop).toBe(caught);
  });

  it("11. reports the mid-gesture snap change only once the finger lifts", async () => {
    const el = fixture();
    const onSnapIndexChange = vi.fn();
    const onDragEnd = vi.fn(() => {
      expect(onSnapIndexChange).not.toHaveBeenCalled();
    });
    await open(el, { defaultSnapIndex: 0, onSnapIndexChange, onDragEnd });

    // Up from the header snap: the sheet rises to the scrolling snap and the
    // content takes the rest of the gesture.
    const gesture = swipe(el.body, 800, -30, 20);
    expect(el.body.scrollTop).toBeGreaterThan(0);
    expect(onSnapIndexChange).not.toHaveBeenCalled();

    gesture.release();
    await settle();

    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onSnapIndexChange).toHaveBeenCalledTimes(1);
    expect(onSnapIndexChange).toHaveBeenCalledWith(1, Snaps?.[1]);
  });

  it("8. a new pointer cancels a running fling", async () => {
    const el = fixture();
    await open(el, { defaultSnapIndex: 1 });
    el.body.scrollTop = 500;

    swipe(el.body, 800, -20, 5).release();
    await vi.advanceTimersByTimeAsync(32);
    const caught = el.body.scrollTop;
    expect(caught).toBeGreaterThan(600);

    fire(el.body, "pointerdown", { clientY: 400, timeStamp: 0 });
    await settle();
    expect(el.body.scrollTop).toBe(caught);
  });
  /**
   * The body becomes a scroller only when `applyRest` runs, at the end of a
   * transition. These model both layouts from one stub: the natural height
   * until the controller writes `overflow-y: auto`, a clipped strip after.
   */
  function stubTwoLayouts(
    body: HTMLElement,
    sizes: { scrollHeight: number; strip: number; top?: number },
  ) {
    Object.defineProperty(body, "scrollHeight", {
      value: sizes.scrollHeight,
      configurable: true,
    });
    Object.defineProperty(body, "clientHeight", {
      configurable: true,
      get: () =>
        body.style.overflowY === "auto" ? sizes.strip : sizes.scrollHeight,
    });
    let scrollTop = 0;
    Object.defineProperty(body, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (next: number) => {
        scrollTop = next;
      },
    });
    // jsdom has no layout, so the body's offset inside the panel — the other
    // half of the predicate — has to be stated.
    body.getBoundingClientRect = () => ({ top: sizes.top ?? 0 }) as DOMRect;
  }

  it("9. scrolls when the sheet has arrived but the body is not laid out yet", async () => {
    const el = fixture();
    const controller = await open(el);
    // Heading for the scroll snap, spring still settling: `snapIndex` is
    // already 1 while the body keeps its natural height, which is the window
    // the owner's gesture landed in.
    void controller.snapTo(1);
    await vi.advanceTimersByTimeAsync(80);
    stubTwoLayouts(el.body, { scrollHeight: 3000, strip: 400 });
    expect(el.body.clientHeight).toBe(3000);
    expect(el.content.getAttribute("data-snap-index")).not.toBe("1");

    const gesture = swipe(el.body, 800, -30, 12);

    expect(yOf(el.content)).toBeCloseTo(500, 0);
    expect(el.content.hasAttribute("data-scrolling")).toBe(true);
    expect(el.body.scrollTop).toBeGreaterThan(0);
    // `enterScrollSnap` laid the body out on the way through.
    expect(el.content.getAttribute("data-snap-index")).toBe("1");

    gesture.release();
    await settle(controller);
    expect(yOf(el.content)).toBeCloseTo(500, 0);
  });

  it("10. a list shorter than the snap leaves the drag alone", async () => {
    const el = fixture();
    const controller = await open(el, {}, { contentHeight: 300 });
    void controller.snapTo(1);
    await vi.advanceTimersByTimeAsync(80);
    // 300 + 60 stays under the 500 px snap: nothing to scroll there, so the
    // ceiling must not block the sheet.
    stubTwoLayouts(el.body, { scrollHeight: 300, strip: 300, top: 60 });

    swipe(el.body, 800, -30, 12);

    expect(el.body.scrollTop).toBe(0);
    expect(el.content.hasAttribute("data-scrolling")).toBe(false);
    expect(yOf(el.content)).toBeLessThan(500);
  });

  it('11. finds the ceiling with no "content" snap to measure', async () => {
    const el = fixture();
    // `contentHeight` is 0 whenever no snap asks for it, which used to be the
    // only thing the arbiter consulted before the sheet reached a scroll snap.
    await open(el, {}, { contentHeight: 0 });
    stubTwoLayouts(el.body, { scrollHeight: 3000, strip: 400, top: 60 });

    const gesture = swipe(el.body, 800, -40, 15);

    expect(yOf(el.content)).toBeCloseTo(500, 0);
    expect(el.body.scrollTop).toBeGreaterThan(0);

    gesture.release();
    await settle(controller_of(el));
  });

  /** The controller `open` pushed for this fixture. */
  function controller_of(_el: Fixture) {
    return controllers[controllers.length - 1] as SheetController;
  }
});
