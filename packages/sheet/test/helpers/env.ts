import { vi } from "vitest";

/** The view height every test assumes unless it overrides it. */
export const ViewHeight = 1000;

type ResizeEntryLike = { target: Element };
type ResizeCallback = (entries: ResizeEntryLike[]) => void;

/**
 * measure.ts creates ONE ResizeObserver the first time it is used and keeps it
 * for the module's lifetime, so this list must never be cleared between tests —
 * clearing it orphans the only callback that reaches the shared observer.
 *
 * Each entry tracks what it is actually observing, so `unobserve`/`disconnect`
 * mean something: a fake that fires every callback for every element cannot
 * fail when the library forgets to stop observing a detached node.
 */
interface FakeObserver {
  callback: ResizeCallback;
  observed: Set<Element>;
}
const observers: FakeObserver[] = [];

/**
 * Install the fake environment a sheet needs under jsdom: rAF driven by timers,
 * a ResizeObserver we can fire by hand, matchMedia, and a fixed view height.
 * Call from `beforeEach`, with `vi.useFakeTimers()` already active.
 */
export function installTestEnv(
  options: { viewHeight?: number; reducedMotion?: boolean } = {},
): void {
  const { viewHeight = ViewHeight, reducedMotion = false } = options;

  Object.defineProperty(window, "innerHeight", {
    value: viewHeight,
    configurable: true,
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private readonly self: FakeObserver;
      constructor(cb: ResizeCallback) {
        this.self = { callback: cb, observed: new Set() };
        observers.push(this.self);
      }
      observe(el: Element) {
        this.self.observed.add(el);
      }
      unobserve(el: Element) {
        this.self.observed.delete(el);
      }
      disconnect() {
        this.self.observed.clear();
      }
    },
  );
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("matchMedia", (media: string) => ({
    media,
    matches: reducedMotion,
    addEventListener() {},
    removeEventListener() {},
  }));
}

/** Give an element a height jsdom would otherwise report as 0. */
export function setHeight(el: HTMLElement, height: number): void {
  Object.defineProperty(el, "offsetHeight", {
    value: height,
    configurable: true,
  });
}

/**
 * Set a height and notify only the observers actually watching this element —
 * the way a real ResizeObserver behaves.
 */
export function resizeTo(el: HTMLElement, height: number): void {
  setHeight(el, height);
  for (const observer of [...observers]) {
    if (observer.observed.has(el)) observer.callback([{ target: el }]);
  }
}

/** Is anything still observing this element? Used to catch leaked observers. */
export function isObserved(el: Element): boolean {
  return observers.some((observer) => observer.observed.has(el));
}

/** Change the window height and fire the resize listener measure.ts installs. */
export function resizeView(height: number): void {
  Object.defineProperty(window, "innerHeight", {
    value: height,
    configurable: true,
  });
  window.dispatchEvent(new Event("resize"));
}

/** Anything that can say whether it is still moving. */
interface Animatable {
  getState(): { animating: boolean };
}

/**
 * Advance virtual time in frames until the animation is at rest, then stop.
 *
 * Always predicated, never a blind burn: pass a controller (or a predicate) and
 * it returns on the first frame that reports rest, and **throws** if 5 s of
 * virtual time pass without one. A blind burn cannot tell "finished correctly"
 * from "finished on frame 1 and then sat still", which is exactly how the
 * frame-1 finalisation bug (A.1) hid from the whole suite.
 *
 * With no argument it waits for every pending timer to drain instead, which is
 * the honest equivalent for a caller that has no controller in hand.
 */
export async function settle(
  until?: Animatable | (() => boolean),
): Promise<void> {
  const StepMs = 16;
  const CapMs = 5000;
  const done =
    typeof until === "function"
      ? until
      : until
        ? () => !until.getState().animating
        : undefined;

  // Nothing to predicate on: drain the timer queue and return.
  if (!done) {
    for (let elapsed = 0; elapsed < CapMs; elapsed += StepMs) {
      if (vi.getTimerCount() === 0) return;
      await vi.advanceTimersByTimeAsync(StepMs);
    }
    throw new Error("settle(): timers still pending after 5s of virtual time");
  }

  // One frame first: a transition that has only just started still reports
  // "not animating" on the frame it was requested.
  await vi.advanceTimersByTimeAsync(StepMs);
  for (let elapsed = StepMs; elapsed < CapMs; elapsed += StepMs) {
    if (done()) return;
    await vi.advanceTimersByTimeAsync(StepMs);
  }
  throw new Error("settle(): still animating after 5s of virtual time");
}

/** The y the panel is translated to, parsed back out of its transform. */
export function yOf(content: HTMLElement): number {
  const match = /translate3d\(0, (-?[\d.]+)px, 0\)/.exec(
    content.style.transform,
  );
  return match ? Number(match[1]) : Number.NaN;
}

/** jsdom 26 has no `inert` property, so the library falls back to the attribute. */
export function isInert(el: HTMLElement): boolean {
  return el.hasAttribute("inert") || el.inert === true;
}
