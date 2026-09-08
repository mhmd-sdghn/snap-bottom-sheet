/**
 * The only module that writes styles and attributes. Holds no controller
 * state: every function takes the elements it touches and, where it mutates,
 * returns the closure that puts things back.
 */

import { isBrowser, warnOnce } from "./env.ts";

/** The string-valued (i.e. settable) properties of CSSStyleDeclaration. */
type StyleKey = keyof {
  [K in keyof CSSStyleDeclaration as CSSStyleDeclaration[K] extends string
    ? K
    : never]: string;
};

/** camelCase inline styles, assignable straight onto `el.style`. */
export type Styles = Partial<Record<StyleKey, string>>;

/**
 * Marks the two elements a sheet owns as pointer targets: the panel and the
 * overlay. The drag layer reads it to tell its own parts from a nested sheet's
 * (which, without a portal, are descendants of the outer panel).
 */
export const SheetPartAttr = "data-snap-sheet-part";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  // A hidden input matches every "focusable" selector and focuses nothing.
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/** Set inline styles; the returned restore puts the previous inline values back. */
export function setStyles(el: HTMLElement, styles: Styles): () => void {
  const previous: Styles = {};

  for (const key of Object.keys(styles) as StyleKey[]) {
    const value = styles[key];
    if (value === undefined) continue;
    previous[key] = el.style[key];
    el.style[key] = value;
  }

  return () => {
    for (const key of Object.keys(previous) as StyleKey[]) {
      el.style[key] = previous[key] ?? "";
    }
  };
}

/**
 * Set attributes; the returned restore removes the ones that were absent and
 * puts back the ones that were present. With onlyIfAbsent, an attribute the
 * element already carries is left alone (and not restored).
 */
export function setAttrs(
  el: HTMLElement,
  attrs: Record<string, string>,
  onlyIfAbsent = false,
): () => void {
  const previous: [name: string, value: string | null][] = [];

  for (const [name, value] of Object.entries(attrs)) {
    const had = el.hasAttribute(name);
    if (onlyIfAbsent && had) continue;
    previous.push([name, had ? el.getAttribute(name) : null]);
    el.setAttribute(name, value);
  }

  return () => {
    for (const [name, value] of previous) {
      if (value === null) el.removeAttribute(name);
      else el.setAttribute(name, value);
    }
  };
}

/**
 * Base layout styles for the panel, written once at attach.
 * positioned = a container element was given.
 */
export function contentBaseStyles(positioned: boolean): Styles {
  return {
    position: positioned ? "absolute" : "fixed",
    top: "0",
    left: "0",
    right: "0",
    height: positioned ? "100%" : "100dvh",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    touchAction: "none",
    overscrollBehavior: "none",
  };
}

/**
 * Base styles for the scrim. Only geometry — colour, `z-index` and
 * `pointer-events` stay the consumer's.
 */
export function overlayBaseStyles(positioned: boolean): Styles {
  return {
    position: positioned ? "absolute" : "fixed",
    inset: "0",
  };
}

/**
 * Base styles for the measured wrapper.
 *
 * It has to be a flex column itself, or `Sheet.Body`'s `flex`/`min-height` are
 * inert inside it and the body never becomes a real scroller without the
 * consumer writing that CSS by hand.
 *
 * No height cap: the panel's content box (`100dvh` minus the resting
 * `padding-bottom`) already bounds it. A `100dvh` cap ignores the padding, so
 * at a partial `scroll: true` snap the bottom `y` px of the body sat below the
 * viewport with no way to scroll them up — audit P0-8, returning by the back
 * door. The per-snap `flex` in `applySnapLayout` does the rest.
 */
export function innerBaseStyles(): Styles {
  return {
    display: "flex",
    flexDirection: "column",
    minHeight: "0",
  };
}

/** Base styles for the scroll region, written once at attach. */
export function bodyBaseStyles(): Styles {
  return { minHeight: "0", overscrollBehavior: "contain" };
}

/** Per-frame writer: transform + --snap-sheet-y on content, --snap-sheet-progress on content and overlay. */
export function writeFrame(
  content: HTMLElement,
  overlay: HTMLElement | null | undefined,
  y: number,
  progress: number,
): void {
  content.style.transform = `translate3d(0, ${y}px, 0)`;
  content.style.setProperty("--snap-sheet-y", `${y}px`);
  content.style.setProperty("--snap-sheet-progress", String(progress));
  overlay?.style.setProperty("--snap-sheet-progress", String(progress));
}

/** At-rest writer: padding-bottom + --snap-sheet-offset on content. */
export function writeRest(content: HTMLElement, y: number): void {
  content.style.paddingBottom = `${y}px`;
  content.style.setProperty("--snap-sheet-offset", `${y}px`);
}

/**
 * Lay the panel out for the active snap. Both elements move together:
 *
 * - `scroll: true` — the wrapper fills the panel's content box and the body is
 *   the scroller inside it, so the scrollable area ends exactly where the
 *   viewport does.
 * - otherwise — the wrapper takes its natural height (which is what a
 *   `"content"` snap measures) and the body is clipped rather than scrollable.
 *
 * The caller owns restoring these; see `rememberSnapLayout` and
 * `rememberBodyScroll`.
 */
export function applySnapLayout(
  inner: HTMLElement,
  body: HTMLElement | null | undefined,
  scroll: boolean,
): void {
  inner.style.flex = scroll ? "1 1 auto" : "0 0 auto";
  if (!body) return;

  // The shorthand and the longhand must never both be set, or toggling snaps
  // leaves the loser behind. Clear the other one before writing ours.
  if (scroll) {
    body.style.removeProperty("overflow");
    body.style.overflowY = "auto";
    body.style.flex = "1 1 auto";
    body.style.minHeight = "0";
  } else {
    body.style.removeProperty("overflow-y");
    body.style.overflow = "hidden";
    body.style.flex = "0 0 auto";
    // Leaving a scrolled body clipped puts the top of the list out of reach.
    body.scrollTop = 0;
  }
}

/**
 * Freeze the body's own scrolling for the duration of a gesture the sheet has
 * taken over, so a reversal mid-drag scrolls the list instead of moving the
 * sheet. Returns the release.
 */
export function suspendBodyScroll(body: HTMLElement): () => void {
  // `?? ""`: a property never set reads back undefined in some DOM
  // implementations, and restoring that would write `undefined` into the style.
  const previous = {
    overflow: body.style.overflow ?? "",
    overflowY: body.style.overflowY ?? "",
    touchAction: body.style.touchAction ?? "",
  };
  body.style.removeProperty("overflow-y");
  body.style.overflow = "hidden";
  body.style.touchAction = "none";
  return () => {
    body.style.overflow = previous.overflow;
    body.style.overflowY = previous.overflowY;
    body.style.touchAction = previous.touchAction;
  };
}

/** Snapshot the one property `applySnapLayout` writes on the wrapper. */
export function rememberSnapLayout(inner: HTMLElement): () => void {
  const previous = inner.style.flex;
  return () => {
    inner.style.flex = previous;
  };
}

/**
 * Snapshot every property `applySnapLayout` and `suspendBodyScroll` write on
 * Body, so they can be put back exactly as the consumer left them. Returns the
 * restore closure.
 */
export function rememberBodyScroll(body: HTMLElement): () => void {
  const previous = {
    overflow: body.style.overflow ?? "",
    overflowY: body.style.overflowY ?? "",
    flex: body.style.flex ?? "",
    minHeight: body.style.minHeight ?? "",
    touchAction: body.style.touchAction ?? "",
  };
  return () => {
    body.style.overflow = previous.overflow;
    body.style.overflowY = previous.overflowY;
    body.style.flex = previous.flex;
    body.style.minHeight = previous.minHeight;
    body.style.touchAction = previous.touchAction;
  };
}

/**
 * jsdom 26 may not implement the `inert` property; fall back to the attribute.
 * The check is a function call so TypeScript does not narrow the miss to
 * `never` — lib.dom always declares `inert`, the runtime does not always have it.
 */
const hasInertProp = (el: HTMLElement): boolean => "inert" in el;

const isInert = (el: HTMLElement): boolean =>
  hasInertProp(el) ? el.inert : el.hasAttribute("inert");

function writeInert(el: HTMLElement, on: boolean): void {
  if (hasInertProp(el)) {
    el.inert = on;
  } else if (on) {
    el.setAttribute("inert", "");
  } else {
    el.removeAttribute("inert");
  }
}

/**
 * Set `inert` on every element child of `scope` that does not contain (or equal)
 * one of `keep`. Children that already had `inert` are skipped, and the returned
 * restore only clears the ones we set.
 */
export function applyInert(
  scope: HTMLElement,
  keep: (HTMLElement | null | undefined)[],
): () => void {
  const kept = keep.filter((el): el is HTMLElement => el != null);
  const ours: HTMLElement[] = [];

  for (const child of Array.from(scope.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (kept.some((el) => child.contains(el))) continue;
    if (isInert(child)) continue;
    writeInert(child, true);
    ours.push(child);
  }

  return () => {
    for (const el of ours) writeInert(el, false);
  };
}

/**
 * Focus the first focusable descendant of `el`, falling back to `el` itself.
 * The selector is a guess — a `display: none` button matches it and takes no
 * focus — so the result is verified, and the panel takes the focus otherwise.
 * A modal dialog must never open with focus left on `<body>`.
 */
export function focusFirst(el: HTMLElement): void {
  const target = el.querySelector<HTMLElement>(FOCUSABLE) ?? el;
  // `preventScroll` matters most in container mode: the panel is absolutely
  // positioned and translated down by `y`, so it overflows the container and
  // makes it scrollable. Focus lands while the panel is still at its closed
  // position, and without this the browser scrolls the container to reveal it —
  // dragging the overlay (and everything else) up out of the frame with it.
  target.focus?.({ preventScroll: true });
  if (target !== el && isBrowser() && document.activeElement !== target) {
    el.focus?.({ preventScroll: true });
  }
}

/**
 * The element whose height is the natural content height: an explicitly marked
 * `[data-snap-sheet-inner]` child first, then the single element child when
 * there is exactly one, and `content` itself as the last resort. React's
 * Sheet.Content always renders the marked wrapper; vanilla consumers add the
 * attribute themselves.
 */
export function findContentInner(content: HTMLElement): HTMLElement {
  const marked = content.querySelector(":scope > [data-snap-sheet-inner]");
  if (marked instanceof HTMLElement) return marked;
  const only = content.children.length === 1 ? content.children[0] : null;
  if (only instanceof HTMLElement) return only;
  // Last resort: the panel is full-height by design, so a "content" snap would
  // measure the viewport and hug nothing. Say so rather than look broken.
  warnOnce(
    "content-inner:missing",
    'The sheet panel has no single wrapper to measure, so a "content" snap ' +
      "would measure the whole view. Please wrap the panel's children in one " +
      "element and mark it with `data-snap-sheet-inner`.",
  );
  return content;
}
