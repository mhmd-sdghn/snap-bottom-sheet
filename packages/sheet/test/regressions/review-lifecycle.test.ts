import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isBodyScrollLocked } from "../../src/core/scroll-lock.ts";
import {
  createSheet,
  type SheetController,
  type SheetElements,
  type SheetOptions,
} from "../../src/core/sheet.ts";
import { installTestEnv, settle, ViewHeight, yOf } from "../helpers/env.ts";
import { fire } from "../helpers/pointer.ts";

/**
 * Task 13, section B/C: lifecycle and input review fixes. Every test here fails
 * on the code as it was before the fix named in its title.
 */

interface Fixture extends SheetElements {
  wrapper: HTMLElement;
  inner: HTMLElement;
  overlay: HTMLElement;
  handle: HTMLElement;
  header: HTMLElement;
  body: HTMLElement;
}

function fixture(): Fixture {
  const wrapper = document.createElement("div");
  const overlay = document.createElement("div");
  const content = document.createElement("div");
  const inner = document.createElement("div");
  inner.setAttribute("data-snap-sheet-inner", "");
  const handle = document.createElement("button");
  const header = document.createElement("div");
  const body = document.createElement("div");

  inner.append(handle, header, body);
  content.append(inner);
  wrapper.append(overlay, content);
  document.body.append(wrapper);

  return { wrapper, content, inner, overlay, handle, header, body };
}

const controllers: SheetController[] = [];
const make = (elements: SheetElements, options: SheetOptions = {}) => {
  const controller = createSheet(elements, options);
  controllers.push(controller);
  return controller;
};

/** One frame of the fake rAF loop. */
const frame = () => vi.advanceTimersByTimeAsync(16);

/** open() only settles once the frames run, and the frames are fake here. */
const opened = async (controller: SheetController) => {
  const done = controller.open();
  await settle(controller);
  await done;
};

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

describe("B.1 — a drag that outlives the close animation", () => {
  it("resumes the close on release instead of stranding the panel", async () => {
    const el = fixture();
    const ends: boolean[] = [];
    const controller = make(el, {
      snapPoints: [0.5],
      onAnimationEnd: (open) => ends.push(open),
    });
    await settle(controller);
    await opened(controller);
    expect(isBodyScrollLocked()).toBe(true);

    // Drag first, close underneath it, then release.
    fire(el.content, "pointerdown", { clientY: 600, timeStamp: 0 });
    fire(el.content, "pointermove", { clientY: 606, timeStamp: 10 });
    fire(el.content, "pointermove", { clientY: 640, timeStamp: 20 });
    void controller.close();
    fire(el.content, "pointermove", { clientY: 660, timeStamp: 30 });
    fire(el.content, "pointerup", { clientY: 660, timeStamp: 40 });

    await settle(controller);
    expect(yOf(el.content)).toBe(ViewHeight);
    expect(el.content.getAttribute("data-state")).toBe("closed");
    expect(isBodyScrollLocked()).toBe(false);
    expect(ends).toEqual([true, false]);
  });

  it("ignores a drag that starts while the panel is already closing", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });
    await settle(controller);
    await opened(controller);
    const closing = controller.close();
    await frame();

    fire(el.content, "pointerdown", { clientY: 600, timeStamp: 0 });
    fire(el.content, "pointermove", { clientY: 560, timeStamp: 10 });
    fire(el.content, "pointermove", { clientY: 400, timeStamp: 20 });
    fire(el.content, "pointerup", { clientY: 400, timeStamp: 30 });

    await settle(controller);
    await closing;
    expect(yOf(el.content)).toBe(ViewHeight);
    expect(controller.getState().open).toBe(false);
  });
});

describe("B.2 — refresh() during a pending close", () => {
  it("does not jump-cut the panel to the bottom", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });
    await settle(controller);
    await opened(controller);
    void controller.close();
    await frame();
    const mid = yOf(el.content);
    expect(mid).toBeLessThan(ViewHeight);

    // A measurement landing mid-close (here: a view resize) used to retarget
    // the spring with `immediate: true`.
    controller.update({ snapPoints: [0.5] });
    Object.defineProperty(window, "innerHeight", {
      value: ViewHeight,
      configurable: true,
    });
    window.dispatchEvent(new Event("resize"));
    expect(yOf(el.content)).toBeLessThan(ViewHeight);

    await settle(controller);
    expect(yOf(el.content)).toBe(ViewHeight);
  });
});

describe("B.5 — the overlay of a non-modal sheet", () => {
  it("is display:none, and update({ modal }) toggles it back", async () => {
    const el = fixture();
    el.overlay.style.display = "grid";
    const controller = make(el, { snapPoints: [0.5], modal: false });
    await settle(controller);
    expect(el.overlay.style.display).toBe("none");

    controller.update({ modal: true });
    expect(el.overlay.style.display).toBe("grid");

    controller.update({ modal: false });
    expect(el.overlay.style.display).toBe("none");
    controller.destroy();
    expect(el.overlay.style.display).toBe("grid");
  });

  it("is hidden when a non-modal sheet is handed an overlay later", async () => {
    const el = fixture();
    el.overlay.remove();
    const controller = make(
      { content: el.content },
      { snapPoints: [0.5], modal: false },
    );
    await settle(controller);
    controller.setElements({ overlay: el.overlay });
    expect(el.overlay.style.display).toBe("none");
  });
});

describe("B.7 — nested sheets without a portal", () => {
  /**
   * The symptom is pointer *capture*, not the deltas: both panels take the
   * pointer on pointerdown and the outer one, capturing last, wins every later
   * move. jsdom implements no capture, so the assertion is that the outer sheet
   * never claims the pointer at all.
   */
  const captureSpy = (el: HTMLElement) => {
    const spy = vi.fn();
    Object.defineProperty(el, "setPointerCapture", {
      value: spy,
      configurable: true,
    });
    return spy;
  };

  const nested = async () => {
    const outer = fixture();
    const inner = fixture();
    // The inner sheet lives inside the outer panel: no portal.
    outer.inner.append(inner.overlay, inner.content);
    const outerController = make(outer, { snapPoints: [0.5] });
    const innerController = make(inner, { snapPoints: [0.5] });
    await settle(outerController);
    await opened(outerController);
    await opened(innerController);
    return { outer, inner };
  };

  it("leaves the outer panel alone while the inner one is dragged", async () => {
    const { outer, inner } = await nested();
    const outerCapture = captureSpy(outer.content);
    const innerCapture = captureSpy(inner.content);

    const outerY = yOf(outer.content);
    fire(inner.content, "pointerdown", { clientY: 600, timeStamp: 0 });
    fire(inner.content, "pointermove", { clientY: 610, timeStamp: 10 });
    fire(inner.content, "pointermove", { clientY: 700, timeStamp: 20 });

    expect(innerCapture).toHaveBeenCalled();
    expect(outerCapture).not.toHaveBeenCalled();
    expect(yOf(inner.content)).toBeGreaterThan(500);
    expect(yOf(outer.content)).toBe(outerY);
    fire(inner.content, "pointerup", { clientY: 700, timeStamp: 30 });
  });

  it("ignores a pointer that starts on a nested sheet's overlay", async () => {
    const { outer, inner } = await nested();
    const outerCapture = captureSpy(outer.content);

    const outerY = yOf(outer.content);
    fire(inner.overlay, "pointerdown", {
      clientY: 200,
      timeStamp: 0,
    });
    fire(inner.overlay, "pointermove", {
      clientY: 260,
      timeStamp: 20,
    });
    expect(outerCapture).not.toHaveBeenCalled();
    expect(yOf(outer.content)).toBe(outerY);
  });
});

describe("B.8 — a drag that starts mid-animation", () => {
  it("freezes the panel under the finger instead of snapping back", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.3, 0.9] });
    await settle(controller);
    await opened(controller);

    void controller.snapTo(1);
    await frame();
    await frame();
    const grabbed = yOf(el.content);
    expect(grabbed).toBeLessThan(ViewHeight * 0.7);
    expect(grabbed).toBeGreaterThan(ViewHeight * 0.1);

    fire(el.content, "pointerdown", { clientY: 500, timeStamp: 0 });
    fire(el.content, "pointermove", { clientY: 504, timeStamp: 10 });
    const frozen = yOf(el.content);
    // A held finger: the panel stops dead. Without the freeze the spring keeps
    // flying to the 0.9 snap underneath the drag, and the first real move
    // yanks the panel back to where the finger landed.
    await frame();
    await frame();
    expect(yOf(el.content)).toBe(frozen);
    expect(frozen).toBeGreaterThan(ViewHeight * 0.2);
    fire(el.content, "pointerup", { clientY: 504, timeStamp: 20 });
  });
});

describe("B.9 — destroy() cleans the overlay for good", () => {
  it("leaves no --snap-sheet-progress behind", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.5] });
    await settle(controller);
    await opened(controller);
    expect(el.overlay.style.getPropertyValue("--snap-sheet-progress")).not.toBe(
      "",
    );
    controller.destroy();
    expect(el.overlay.style.getPropertyValue("--snap-sheet-progress")).toBe("");
  });
});

describe("B.10 — a part handed over at rest", () => {
  it("gets the current frame written to it immediately", async () => {
    const el = fixture();
    el.overlay?.remove();
    const controller = make(
      { content: el.content, body: el.body },
      { snapPoints: [0.5] },
    );
    await settle(controller);
    await opened(controller);

    const overlay = el.overlay;
    controller.setElements({ overlay });
    expect(overlay.style.getPropertyValue("--snap-sheet-progress")).toBe("1");
    expect(overlay.getAttribute("data-state")).toBe("open");
  });
});

describe("B.14 — a static container", () => {
  it("is made relative, restorably, with a dev warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = fixture();
    const container = el.wrapper;
    const controller = make(
      { content: el.content, container },
      { snapPoints: [0.5] },
    );
    await settle(controller);
    expect(container.style.position).toBe("relative");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("position: static"),
    );
    controller.destroy();
    expect(container.style.position).toBe("");
    warn.mockRestore();
  });
});

describe("B.16 — content mode with explicit entries", () => {
  it("synthesizes exactly one snap and keeps its scroll flag", async () => {
    const el = fixture();
    const controller = make(el, {
      snapPoints: [{ value: "content", scroll: true }, { value: "content" }],
    });
    Object.defineProperty(el.inner, "offsetHeight", {
      value: 400,
      configurable: true,
    });
    await settle(controller);
    await opened(controller);
    await settle(controller);

    expect(controller.getState().contentMode).toBe(true);
    expect(controller.getState().snapIndex).toBe(0);
    expect(el.content.getAttribute("data-snap-index")).toBe("0");
    // The first entry's config survives the synthesis.
    expect(el.body.style.overflowY).toBe("auto");

    // Two entries used to resolve to two indices while still reporting
    // contentMode, so index 1 existed and the sheet could sit on it.
    void controller.snapTo(1);
    await settle(controller);
    expect(controller.getState().snapIndex).toBe(0);
  });
});

describe("B.17 — a snapTo superseded by a re-snap", () => {
  it("still writes the at-rest attributes once the panel lands", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.3, 0.9] });
    await settle(controller);
    await opened(controller);
    await settle(controller);

    void controller.snapTo(1);
    await frame();
    // update() re-snaps to the same index: the snapTo above resolves `false`.
    controller.update({ snapPoints: [0.3, 0.9] });
    void controller.snapTo(1);
    await settle(controller);

    expect(el.content.getAttribute("data-snap-index")).toBe("1");
    expect(el.content.style.paddingBottom).toBe(`${ViewHeight * 0.1}px`);
  });
});

describe("C.3 — focusFirst picks a candidate that cannot take focus", () => {
  it("falls back to the panel when the focus did not land", async () => {
    const el = fixture();
    const button = el.handle as HTMLButtonElement;
    // A `display: none` button matches the selector and swallows focus().
    Object.defineProperty(button, "focus", {
      value: () => {},
      configurable: true,
    });
    const controller = make(el, { snapPoints: [0.5] });
    await settle(controller);
    await opened(controller);
    expect(document.activeElement).toBe(el.content);
  });

  it("skips a hidden input in the selector", async () => {
    const el = fixture();
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    el.inner.prepend(hidden);
    el.handle.remove();
    const controller = make(el, { snapPoints: [0.5] });
    await settle(controller);
    await opened(controller);
    expect(document.activeElement).toBe(el.content);
  });
});

describe("C.5 — clicking the handle", () => {
  it("cycles to the next snap", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.3, 0.9] });
    await settle(controller);
    await opened(controller);
    await settle(controller);
    expect(controller.getState().snapIndex).toBe(0);

    el.handle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle(controller);
    expect(controller.getState().snapIndex).toBe(1);
  });

  it("ignores the click that ends a drag", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.3, 0.9] });
    await settle(controller);
    await opened(controller);
    await settle(controller);

    const handle = el.handle;
    fire(handle, "pointerdown", { clientY: 700, timeStamp: 0 });
    fire(handle, "pointermove", { clientY: 694, timeStamp: 10 });
    fire(handle, "pointermove", { clientY: 690, timeStamp: 20 });
    fire(handle, "pointerup", { clientY: 690, timeStamp: 30 });
    handle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle(controller);

    expect(controller.getState().snapIndex).toBe(0);
  });

  it("cycles again once the 300 ms window has passed", async () => {
    const el = fixture();
    const controller = make(el, { snapPoints: [0.3, 0.9] });
    await settle(controller);
    await opened(controller);
    await settle(controller);

    const handle = el.handle;
    fire(handle, "pointerdown", { clientY: 700, timeStamp: 0 });
    fire(handle, "pointermove", { clientY: 694, timeStamp: 10 });
    fire(handle, "pointermove", { clientY: 690, timeStamp: 20 });
    fire(handle, "pointerup", { clientY: 690, timeStamp: 30 });
    await settle(controller);
    expect(controller.getState().snapIndex).toBe(0);

    // The window is measured against the clock, which the fake timers own.
    await vi.advanceTimersByTimeAsync(301);
    handle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle(controller);

    expect(controller.getState().snapIndex).toBe(1);
  });
});
