import { isBrowser } from "./env.ts";

interface SavedStyles {
  htmlOverflow: string;
  htmlOverscroll: string;
  bodyOverflow: string;
  bodyOverscroll: string;
  bodyPaddingRight: string;
}

const noop = () => {};

let count = 0;
let saved: SavedStyles | null = null;

function apply(): void {
  const html = document.documentElement;
  const { body } = document;

  saved = {
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyOverscroll: body.style.overscrollBehavior,
    bodyPaddingRight: body.style.paddingRight,
  };

  const gap = window.innerWidth - html.clientWidth;

  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";
  if (gap > 0) body.style.paddingRight = `${gap}px`;
}

function restore(): void {
  if (!saved) return;
  const html = document.documentElement;
  const { body } = document;

  html.style.overflow = saved.htmlOverflow;
  html.style.overscrollBehavior = saved.htmlOverscroll;
  body.style.overflow = saved.bodyOverflow;
  body.style.overscrollBehavior = saved.bodyOverscroll;
  body.style.paddingRight = saved.bodyPaddingRight;

  saved = null;
}

/**
 * Reference-counted body scroll lock. The first call saves the current inline
 * styles of <html>/<body> and replaces them; the returned release restores
 * exactly those values once the last lock is released. Releasing twice is a
 * no-op. No-op entirely outside the browser.
 *
 * ponytail: no iOS touchmove prevention; add react-aria-style usePreventScroll
 * if iOS rubber-band reports come in.
 */
export function lockBodyScroll(): () => void {
  if (!isBrowser()) return noop;

  if (count === 0) apply();
  count += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    count -= 1;
    if (count === 0) restore();
  };
}

export function isBodyScrollLocked(): boolean {
  return count > 0;
}
