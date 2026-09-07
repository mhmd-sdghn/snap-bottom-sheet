/**
 * The only module that writes styles and attributes. Holds no controller
 * state: every function takes the elements it touches and, where it mutates,
 * returns the closure that puts things back.
 */

/** The string-valued (i.e. settable) properties of CSSStyleDeclaration. */
type StyleKey = keyof {
  [K in keyof CSSStyleDeclaration as CSSStyleDeclaration[K] extends string
    ? K
    : never]: string;
};

/** camelCase inline styles, assignable straight onto `el.style`. */
export type Styles = Partial<Record<StyleKey, string>>;

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
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
 * Base styles for the measured wrapper. `flex: 0 0 auto` is load-bearing: the
 * panel's content box is only the visible strip (its `padding-bottom` is the
 * resting `y`), so as an ordinary flex item this element would be shrunk to
 * that strip and a `"content"` snap could never measure taller than it already
 * is — the height would freeze.
 */
export function innerBaseStyles(positioned: boolean): Styles {
  return {
    flex: "0 0 auto",
    maxHeight: positioned ? "100%" : "100dvh",
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
 * Body overflow/flex for the active snap. The caller owns restoring these —
 * see `rememberBodyScroll`, which snapshots them once at attach so `destroy()`
 * and `setElements({ body: null })` can put the consumer's own values back.
 */
export function applyBodyScroll(body: HTMLElement, scroll: boolean): void {
  // The shorthand and the longhand must never both be set, or toggling snaps
  // leaves the loser behind. Clear the other one before writing ours.
  if (scroll) {
    body.style.removeProperty("overflow");
    body.style.overflowY = "auto";
    body.style.flex = "1 1 auto";
  } else {
    body.style.removeProperty("overflow-y");
    body.style.overflow = "hidden";
    body.style.flex = "0 0 auto";
  }
}

/**
 * Snapshot the three properties `applyBodyScroll` writes, so they can be put
 * back exactly as the consumer left them. Returns the restore closure.
 */
export function rememberBodyScroll(body: HTMLElement): () => void {
  const previous = {
    overflow: body.style.overflow,
    overflowY: body.style.overflowY,
    flex: body.style.flex,
  };
  return () => {
    body.style.overflow = previous.overflow;
    body.style.overflowY = previous.overflowY;
    body.style.flex = previous.flex;
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

/** Focus the first focusable descendant of `el`, falling back to `el` itself. */
export function focusFirst(el: HTMLElement): void {
  const target = el.querySelector<HTMLElement>(FOCUSABLE) ?? el;
  if (typeof target.focus === "function") target.focus();
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
  return only instanceof HTMLElement ? only : content;
}
