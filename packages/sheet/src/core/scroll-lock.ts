import { isBrowser, noop, once } from "./env.ts";

interface SavedStyles {
  htmlOverflow: string;
  htmlOverscroll: string;
  bodyOverflow: string;
  bodyOverscroll: string;
  bodyPaddingRight: string;
}

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

  return once(() => {
    count -= 1;
    if (count === 0) restore();
  });
}

/** @internal test seam — no `src` callers. */
export function isBodyScrollLocked(): boolean {
  return count > 0;
}

interface SavedContainerStyles {
  overflow: string;
  overscrollBehavior: string;
  scrollTop: number;
}

interface ContainerLock {
  count: number;
  saved: SavedContainerStyles;
}

/** Per-container refcounts, so two sheets in one container behave like two
 * sheets on the page: the last release restores. */
const containerLocks = new WeakMap<HTMLElement, ContainerLock>();

/**
 * The container-scoped counterpart of `lockBodyScroll`. An embedded sheet — a
 * docs demo, a split pane, a phone-frame preview — is modal within its own
 * box, so it must not freeze the whole page. No scrollbar-gap compensation:
 * the container's own layout decides that, not the viewport.
 *
 * Releasing twice is a no-op. No-op entirely outside the browser.
 */
export function lockContainerScroll(container: HTMLElement): () => void {
  if (!isBrowser()) return noop;

  const existing = containerLocks.get(container);
  if (existing) {
    existing.count += 1;
  } else {
    containerLocks.set(container, {
      count: 1,
      saved: {
        overflow: container.style.overflow,
        overscrollBehavior: container.style.overscrollBehavior,
        scrollTop: container.scrollTop,
      },
    });
    container.style.overflow = "hidden";
    container.style.overscrollBehavior = "none";
    // The panel is absolutely positioned and translated down by `y`, so it
    // overflows the container and leaves it scrollable however hidden the
    // overflow is. Any scroll — focus reveal, Tab navigation, a consumer's
    // autofocus — shifts the overlay out of the container with it, so the
    // scroll position is pinned for as long as the sheet owns the container.
    container.scrollTop = 0;
  }

  return once(() => {
    const lock = containerLocks.get(container);
    if (!lock) return;
    lock.count -= 1;
    if (lock.count > 0) return;
    container.style.overflow = lock.saved.overflow;
    container.style.overscrollBehavior = lock.saved.overscrollBehavior;
    container.scrollTop = lock.saved.scrollTop;
    containerLocks.delete(container);
  });
}

/** Test/debug helper: is this container currently locked by a sheet? */
export function isContainerScrollLocked(container: HTMLElement): boolean {
  return (containerLocks.get(container)?.count ?? 0) > 0;
}
