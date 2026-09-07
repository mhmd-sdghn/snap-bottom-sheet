import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isBodyScrollLocked,
  lockBodyScroll,
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
});
