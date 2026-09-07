import { vi } from "vitest";

/** The view height every test assumes unless it overrides it. */
export const ViewHeight = 1000;

type ResizeEntryLike = { target: Element };
type ResizeCallback = (entries: ResizeEntryLike[]) => void;

/**
 * measure.ts creates ONE ResizeObserver the first time it is used and keeps it
 * for the module's lifetime, so this list must never be cleared between tests —
 * clearing it orphans the only callback that reaches the shared observer.
 */
const observerCallbacks: ResizeCallback[] = [];

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
      constructor(cb: ResizeCallback) {
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

/** Set a height and fire every live ResizeObserver callback for that element. */
export function resizeTo(el: HTMLElement, height: number): void {
  setHeight(el, height);
  for (const cb of [...observerCallbacks]) cb([{ target: el }]);
}

/** Change the window height and fire the resize listener measure.ts installs. */
export function resizeView(height: number): void {
  Object.defineProperty(window, "innerHeight", {
    value: height,
    configurable: true,
  });
  window.dispatchEvent(new Event("resize"));
}

/**
 * Advance virtual time in frames until `done()` reports the spring is at rest,
 * capped at 5 s so a stuck animation fails the test instead of hanging it.
 * With no argument it simply burns 3 s of frames, which outlasts any spring.
 */
export async function settle(done?: () => boolean): Promise<void> {
  const StepMs = 16;
  const CapMs = 5000;
  for (let elapsed = 0; elapsed < CapMs; elapsed += StepMs) {
    if (done?.()) return;
    await vi.advanceTimersByTimeAsync(StepMs);
  }
  if (done && !done()) {
    throw new Error("settle(): still animating after 5s of virtual time");
  }
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
