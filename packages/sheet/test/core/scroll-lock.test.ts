import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isBodyScrollLocked,
  isContainerScrollLocked,
  lockBodyScroll,
  lockContainerScroll,
} from "../../src/core/scroll-lock.ts";

const html = () => document.documentElement;
const body = () => document.body;

/** jsdom has no layout, so the scrollbar gap is faked. */
function setClientWidth(width: number) {
  Object.defineProperty(html(), "clientWidth", {
    value: width,
    configurable: true,
  });
}

beforeEach(() => {
  html().style.cssText = "";
  body().style.cssText = "";
  setClientWidth(window.innerWidth);
});

afterEach(() => {
  // Guard against a leaked lock poisoning the next test.
  expect(isBodyScrollLocked()).toBe(false);
});

describe("lockBodyScroll", () => {
  it("locks until the last release (nested sheets)", () => {
    const releaseOuter = lockBodyScroll();
    const releaseInner = lockBodyScroll();

    expect(isBodyScrollLocked()).toBe(true);
    expect(body().style.overflow).toBe("hidden");

    releaseInner();
    expect(isBodyScrollLocked()).toBe(true);
    expect(body().style.overflow).toBe("hidden");
    expect(html().style.overflow).toBe("hidden");

    releaseOuter();
    expect(isBodyScrollLocked()).toBe(false);
  });

  it("restores the host page's pre-existing inline styles (P0-6)", () => {
    html().style.overflow = "scroll";
    body().style.overflow = "scroll";
    body().style.paddingRight = "12px";

    const release = lockBodyScroll();
    expect(html().style.overflow).toBe("hidden");
    expect(body().style.overscrollBehavior).toBe("none");

    release();

    expect(html().style.overflow).toBe("scroll");
    expect(body().style.overflow).toBe("scroll");
    expect(body().style.paddingRight).toBe("12px");
    expect(html().style.overscrollBehavior).toBe("");
  });

  it("restores empty inline values as empty", () => {
    const release = lockBodyScroll();
    release();

    expect(html().style.overflow).toBe("");
    expect(body().style.overflow).toBe("");
    expect(body().style.paddingRight).toBe("");
  });

  it("compensates for the scrollbar gap", () => {
    setClientWidth(window.innerWidth - 15);

    const release = lockBodyScroll();
    expect(body().style.paddingRight).toBe("15px");

    release();
    expect(body().style.paddingRight).toBe("");
  });

  it("adds no padding when there is no gap", () => {
    const release = lockBodyScroll();
    expect(body().style.paddingRight).toBe("");
    release();
  });

  it("ignores a repeated release", () => {
    const release = lockBodyScroll();
    release();
    release();

    expect(isBodyScrollLocked()).toBe(false);

    // A stale double-release must not unlock a later, unrelated lock.
    const other = lockBodyScroll();
    release();
    expect(isBodyScrollLocked()).toBe(true);
    other();
  });

  describe("container-scoped lock", () => {
    it("pins the container's scroll position while it is locked", () => {
      const container = document.createElement("div");
      document.body.append(container);
      Object.defineProperty(container, "scrollTop", {
        value: 0,
        writable: true,
        configurable: true,
      });
      container.scrollTop = 42;

      const release = lockContainerScroll(container);

      // `overflow: hidden` stops the user scrolling but not focus reveal or Tab
      // navigation, and any scroll shifts the overlay out of the container.
      expect(container.scrollTop).toBe(0);

      release();

      // and the consumer's own scroll position comes back
      expect(container.scrollTop).toBe(42);
    });

    it("locks the container and leaves the document alone", () => {
      const container = document.createElement("div");
      container.style.overflow = "auto";
      document.body.append(container);
      document.documentElement.style.overflow = "scroll";

      const release = lockContainerScroll(container);

      expect(container.style.overflow).toBe("hidden");
      expect(container.style.overscrollBehavior).toBe("none");
      // the page is untouched, and the document refcount never moved
      expect(document.documentElement.style.overflow).toBe("scroll");
      expect(isBodyScrollLocked()).toBe(false);
      expect(isContainerScrollLocked(container)).toBe(true);

      release();

      expect(container.style.overflow).toBe("auto");
      expect(isContainerScrollLocked(container)).toBe(false);
    });

    it("refcounts per container and restores on the last release", () => {
      const a = document.createElement("div");
      const b = document.createElement("div");
      a.style.overflow = "scroll";
      document.body.append(a, b);

      const first = lockContainerScroll(a);
      const second = lockContainerScroll(a);
      const other = lockContainerScroll(b);

      first();
      // a second sheet in the same container still holds it
      expect(a.style.overflow).toBe("hidden");
      expect(isContainerScrollLocked(a)).toBe(true);

      second();
      expect(a.style.overflow).toBe("scroll");
      expect(isContainerScrollLocked(a)).toBe(false);
      // an unrelated container is unaffected throughout
      expect(isContainerScrollLocked(b)).toBe(true);
      other();
      expect(isContainerScrollLocked(b)).toBe(false);
    });

    it("ignores a double release", () => {
      const container = document.createElement("div");
      document.body.append(container);
      const release = lockContainerScroll(container);
      const other = lockContainerScroll(container);

      release();
      release();

      // the stale second call must not have decremented past the live lock
      expect(isContainerScrollLocked(container)).toBe(true);
      other();
      expect(isContainerScrollLocked(container)).toBe(false);
    });
  });
});
