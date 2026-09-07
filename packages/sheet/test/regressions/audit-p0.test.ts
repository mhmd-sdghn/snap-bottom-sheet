/**
 * One named test per audit P0, using the repro numbers from
 * docs/internal/AUDIT.md. Each name states the 0.x failure it locks out, so a
 * regression reads as "P0-n came back" rather than "some test broke".
 *
 * Public entry points only — these have to survive refactors of src/core.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SheetController, SheetOptions } from "../../src/index.ts";
import { createSheet } from "../../src/index.ts";
import {
  installTestEnv,
  isInert,
  resizeTo,
  settle,
  yOf,
} from "../helpers/env.ts";
import { fire } from "../helpers/pointer.ts";

interface Fixture {
  wrapper: HTMLElement;
  content: HTMLElement;
  inner: HTMLElement;
  overlay: HTMLElement;
  handle: HTMLElement;
  header: HTMLElement;
  body: HTMLElement;
  sibling: HTMLElement;
}

/** The DOM shape the React layer renders: one marked wrapper inside content. */
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

  return { wrapper, content, inner, overlay, handle, header, body, sibling };
}

const controllers: SheetController[] = [];

function attach(el: Fixture, options: SheetOptions = {}): SheetController {
  const controller = createSheet(
    {
      content: el.content,
      header: el.header,
      body: el.body,
      overlay: el.overlay,
      handle: el.handle,
    },
    options,
  );
  controllers.push(controller);
  return controller;
}

/** Open and wait for the spring to rest. */
async function opened(controller: SheetController): Promise<void> {
  const promise = controller.open();
  await settle();
  await promise;
}

/** pointerdown → threshold move → move → pointerup, with explicit timestamps. */
function drag(
  el: HTMLElement,
  from: number,
  to: number,
  opts: { upAt?: number } = {},
) {
  fire(el, "pointerdown", { clientY: from, timeStamp: 0 });
  fire(el, "pointermove", {
    clientY: from + (to >= from ? 4 : -4),
    timeStamp: 10,
  });
  fire(el, "pointermove", { clientY: to, timeStamp: 200 });
  fire(el, "pointerup", { clientY: to, timeStamp: opts.upAt ?? 210 });
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
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("audit P0 regressions", () => {
  it("P0-1 — an index read from the sorted array against the unsorted one", async () => {
    // 0.x: snapPoints [0.9, 0.3] with activeSnapPointIndex 0 animated to the
    // 0.3 position while scroll/drag config came from 0.9.
    const el = fixture();
    const onSnapIndexChange = vi.fn();
    const controller = attach(el, {
      snapPoints: [0.9, { value: 0.3, scroll: true }],
      defaultSnapIndex: 0,
      onSnapIndexChange,
    });

    await opened(controller);

    // index 0 is the consumer's first entry (0.9) → y = 1000 - 900
    expect(yOf(el.content)).toBe(100);
    // and its config travels with it: 0.9 declares no scroll
    expect(el.body.style.overflow).toBe("hidden");

    await controller.snapTo(1, { immediate: true });
    expect(yOf(el.content)).toBe(700);
    expect(el.body.style.overflowY).toBe("auto");
    expect(onSnapIndexChange).toHaveBeenLastCalledWith(1, {
      value: 0.3,
      scroll: true,
    });
  });

  it("P0-2 — a dynamic snap measured at viewHeight instead of its own y", async () => {
    // 0.x repro, rescaled to this fixture: ["content", 0.5], view 800,
    // content 200 → true content y = 600. A release at y 550 compared 550 to
    // viewHeight (800) rather than 600, so it snapped to 0.5. 550 is nearer 600.
    const el = fixture();
    installTestEnv({ viewHeight: 800 });
    const controller = attach(el, {
      snapPoints: ["content", 0.5],
      defaultSnapIndex: 0,
    });
    resizeTo(el.inner, 200);
    await opened(controller);
    expect(yOf(el.content)).toBe(600);

    // drag down to y 550 is impossible from 600; come from the 0.5 snap (400)
    await controller.snapTo(1, { immediate: true });
    expect(yOf(el.content)).toBe(400);

    drag(el.content, 0, 150); // 400 + 150 = 550, released slowly
    await settle();

    // nearest to 550 is the content snap at 600, not 0.5 at 400
    expect(controller.getState().snapIndex).toBe(0);
    expect(yOf(el.content)).toBe(600);
  });

  it("P0-3 — the animation clamp that let the panel fly above the viewport", async () => {
    // 0.x: `y.get() + _y > 0 ? _y : 0` — from y 500, animate(-100) targeted
    // -100 and the sheet left the viewport. No snap may ever resolve above 0.
    const el = fixture();
    const controller = attach(el, { snapPoints: [0.5, 1] });
    await opened(controller);
    expect(yOf(el.content)).toBe(500);

    await controller.snapTo(1, { immediate: true });
    expect(yOf(el.content)).toBe(0);

    // dragging up hard past the topmost snap must clamp at 0, never go negative
    drag(el.content, 500, 0);
    await settle();
    expect(yOf(el.content)).toBeGreaterThanOrEqual(0);
    expect(controller.getState().y).toBeGreaterThanOrEqual(0);
  });

  it("P0-4 — a SnapPoint compared to a pixel offset, firing onSnap in content mode", async () => {
    // 0.x: `snapPoints[0] === viewHeight - dynamicHeightContent` is never true
    // for "dynamic" or a config object, so single-dynamic sheets that should be
    // content mode reported snap changes.
    const el = fixture();
    const onSnapIndexChange = vi.fn();
    const controller = attach(el, {
      snapPoints: ["content"],
      onSnapIndexChange,
    });
    resizeTo(el.inner, 250);
    await opened(controller);

    expect(controller.getState().contentMode).toBe(true);
    expect(el.content.hasAttribute("data-content-mode")).toBe(true);
    expect(yOf(el.content)).toBe(750);

    drag(el.content, 0, 60);
    await settle();

    // content mode has one synthesized position: no index change to report
    expect(onSnapIndexChange).not.toHaveBeenCalled();
    expect(controller.getState().snapIndex).toBe(0);

    // the 0.x comparison was `snapPoints[0] === viewHeight - height`, which is
    // never true for a config object either — that form must reach content mode
    // just the same.
    const objEl = fixture();
    const objController = attach(objEl, {
      snapPoints: [{ value: "content", scroll: false }],
    });
    resizeTo(objEl.inner, 250);
    await opened(objController);

    expect(objController.getState().contentMode).toBe(true);
    expect(objEl.content.hasAttribute("data-content-mode")).toBe(true);
    expect(yOf(objEl.content)).toBe(750);
  });

  it("P0-5 — nested sheets sharing one overlay id, resolved by querySelector", async () => {
    // 0.x: OverlayElementId was a constant, so two open sheets produced
    // duplicate ids and querySelector could return the wrong sheet's overlay.
    const outerEl = fixture();
    const innerEl = fixture();
    const outer = attach(outerEl, { snapPoints: [0.5] });
    const inner = attach(innerEl, { snapPoints: [0.5] });

    await opened(outer);
    await opened(inner);

    // no ids at all, so nothing to collide
    expect(outerEl.overlay.id).toBe("");
    expect(innerEl.overlay.id).toBe("");
    expect(document.querySelectorAll("[id]").length).toBe(0);

    // Escape reaches the innermost sheet only
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();
    expect(inner.getState().open).toBe(false);
    expect(outer.getState().open).toBe(true);

    // each sheet drives its own overlay
    expect(innerEl.overlay.getAttribute("data-state")).toBe("closed");
    expect(outerEl.overlay.getAttribute("data-state")).toBe("open");
  });

  it("P0-6 — a scroll lock that destroyed the host page's inline styles", async () => {
    // 0.x: set overflow without saving, cleared it to "" on unmount, and the
    // inner of two nested sheets unlocked the page while the outer was open.
    document.documentElement.style.overflow = "scroll";
    document.body.style.overflow = "auto";
    document.body.style.paddingRight = "7px";

    const outerEl = fixture();
    const innerEl = fixture();
    const outer = attach(outerEl, { snapPoints: [0.5] });
    const inner = attach(innerEl, { snapPoints: [0.5] });

    await opened(outer);
    expect(document.body.style.overflow).toBe("hidden");

    await opened(inner);
    const closedInner = inner.close();
    await settle();
    await closedInner;

    // refcounted: the outer sheet is still open, so the page stays locked
    expect(document.body.style.overflow).toBe("hidden");

    const closedOuter = outer.close();
    await settle();
    await closedOuter;

    // and the page's own values come back, not ""
    expect(document.documentElement.style.overflow).toBe("scroll");
    expect(document.body.style.overflow).toBe("auto");
    expect(document.body.style.paddingRight).toBe("7px");
  });

  it("P0-6b — a non-modal sheet never locks the page", async () => {
    // 0.x locked unconditionally, even for a wrapper-scoped sheet.
    const el = fixture();
    const controller = attach(el, { snapPoints: [0.5], modal: false });
    await opened(controller);

    expect(document.body.style.overflow).toBe("");
    expect(isInert(el.sibling)).toBe(false);
  });

  it("P0-7 — public types the README promised but the entry never exported", async () => {
    // 0.x: `import type { SnapPoint, ... }` from the package failed outright.
    const core = await import("../../src/index.ts");
    const react = await import("../../src/react/index.ts");

    expect(Object.keys(core).sort()).toEqual(["createSheet", "steps"]);
    expect(Object.keys(react).sort()).toEqual(["Sheet", "useSheetState"]);

    // The compound parts are the other half of the promise.
    for (const part of [
      "Portal",
      "Overlay",
      "Content",
      "Handle",
      "Header",
      "Body",
      "Title",
      "Description",
      "Close",
    ]) {
      expect(react.Sheet).toHaveProperty(part);
    }

    // Type-only exports have no runtime footprint, so `satisfies` is what
    // actually asserts them — a removed or renamed type fails `pnpm typecheck`
    // rather than silently passing the way `expect(null).toBeNull()` did.
    const point = 0.5 satisfies import("../../src/index.ts").SnapPoint;
    const value = "50%" satisfies import("../../src/index.ts").SnapValue;
    const config = {
      value: "content",
      scroll: true,
    } satisfies import("../../src/index.ts").SnapPointConfig;
    const options = {
      snapPoints: [point, value, config],
      modal: false,
    } satisfies import("../../src/index.ts").SheetOptions;
    expect(options.snapPoints).toHaveLength(3);

    const state: import("../../src/index.ts").SheetState = {
      open: false,
      snapIndex: 0,
      y: 0,
      progress: 0,
      dragging: false,
      animating: false,
      contentMode: false,
    };
    expect(state.open).toBe(false);

    // and the React-side types the docs name
    const props = {
      snapPoints: [point],
      onDragEnd: (index: number) => index,
    } satisfies import("../../src/react/index.ts").SheetProps;
    expect(props.snapPoints).toHaveLength(1);
  });

  it("P0-8 — content unreachable at a partial snap when scroll is on", async () => {
    // 0.x: the panel itself scrolled, so at a 50% snap the last y pixels of
    // content sat below the viewport and could never be scrolled into view.
    const el = fixture();
    const controller = attach(el, {
      snapPoints: [{ value: 0.5, scroll: true }],
    });
    await opened(controller);

    const y = 500;
    expect(yOf(el.content)).toBe(y);

    // the panel is not the scroller; a dedicated region is
    expect(el.content.style.overflow).toBe("");
    expect(el.body.style.overflowY).toBe("auto");

    // and the panel's content box stops at the viewport bottom, so the scroll
    // region ends where the user can see it
    expect(el.content.style.paddingBottom).toBe(`${y}px`);
    expect(el.content.style.getPropertyValue("--snap-sheet-offset")).toBe(
      `${y}px`,
    );
  });

  it("P0-9 — focus left inside a closed sheet when nothing was focused before", async () => {
    // Found in task 04b: restoreFocus only called previousFocus.focus(), and
    // document.body (the usual holder when nothing was focused) silently
    // ignores focus() — so focus stayed inside a dialog that had closed.
    const el = fixture();
    const controller = attach(el, { snapPoints: [0.5] });

    await opened(controller);
    expect(el.content.contains(document.activeElement)).toBe(true);

    const closed = controller.close();
    await settle();
    await closed;

    expect(el.content.contains(document.activeElement)).toBe(false);
  });

  it("BUG-fling — a fast flick defeated drag: { down: false }", async () => {
    // Found in task 08: onMove zeroed dy for a locked direction but onEnd
    // passed the raw vy to decideRelease, so the projection landed below the
    // lowest snap and dismissed a sheet that must not be draggable downward.
    const el = fixture();
    const onOpenChange = vi.fn();
    const controller = attach(el, {
      snapPoints: [{ value: 0.3, drag: { down: false } }, 0.9],
      defaultSnapIndex: 0,
      onOpenChange,
    });
    await opened(controller);
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

  it("BUG-inner-flex — a 'content' snap that could never grow", async () => {
    // Found in task 08: the measured wrapper is a flex item of a panel whose
    // content box is only the visible strip, so it was shrunk to that strip and
    // the measurement fed back into itself — the height froze.
    const el = fixture();
    const controller = attach(el, { snapPoints: ["content"] });

    resizeTo(el.inner, 200);
    await opened(controller);
    expect(yOf(el.content)).toBe(800);

    // the library writes the styles that keep the measurement honest
    expect(el.inner.style.flex).toBe("0 0 auto");

    resizeTo(el.inner, 400);
    await settle();
    expect(yOf(el.content)).toBe(600);

    resizeTo(el.inner, 150);
    await settle();
    expect(yOf(el.content)).toBe(850);
  });

  /**
   * BUG-escape-veto — a vetoed dismissal permanently unsubscribes the sheet
   * from Escape. Introduced by task 11's `engage()` idempotency guard.
   *
   * `closeWith()` calls `guard.releaseEscape()` (popping the keyboard stack)
   * before `onOpenChange(false)`. A consumer that vetoes by re-opening from
   * inside that callback reaches `guard.engage()`, but `engaged` is still true
   * — the close animation never got to `disengage()` — so `engage` early-returns
   * and never calls `ensureEscape()`. The sheet stays open, modal and
   * dismissible, but off the Escape stack for good. Overlay click still works,
   * so it is Escape-specific.
   *
   * Candidate fix: call `ensureEscape()` unconditionally in `open()` when
   * `modal() && dismissible()`, rather than only via the guarded `engage()`
   * (src/core/sheet.ts `open()` / src/core/modal.ts `engage()`).
   *
   * Fixed in task 12: `open()` calls `guard.ensureEscape()` whenever the sheet
   * is modal and dismissible, independently of the idempotent `engage()`.
   */
  it("BUG-escape-veto — Escape still works after a vetoed dismissal", async () => {
    const el = fixture();
    let controller: SheetController;
    const onOpenChange = vi.fn((open: boolean) => {
      if (!open) void controller.open();
    });
    controller = attach(el, { snapPoints: [0.5], onOpenChange });

    await opened(controller);

    const pressEscape = () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );

    // dismissed, then vetoed by the consumer re-opening
    pressEscape();
    await settle();
    expect(controller.getState().open).toBe(true);
    expect(onOpenChange).toHaveBeenCalledTimes(1);

    // the sheet must still be on the Escape stack
    pressEscape();
    await settle();
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(controller.getState().open).toBe(true);
  });
});
