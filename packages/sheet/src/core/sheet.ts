import { createSpring } from "@snap-bottom-sheet/spring";
import {
  applyBodyScroll,
  bodyBaseStyles,
  contentBaseStyles,
  findContentInner,
  innerBaseStyles,
  overlayBaseStyles,
  setAttrs,
  setStyles,
  writeFrame,
  writeRest,
} from "./dom.ts";
import { attachSheetDrag } from "./drag.ts";
import { warnOnce } from "./env.ts";
import { attachHandleKeys } from "./keyboard.ts";
import { observeHeight, observeViewHeight } from "./measure.ts";
import { createModalGuard } from "./modal.ts";
import { cycleFrom, pickIndex, progressOf, stepFrom } from "./position.ts";
import {
  isContentMode,
  type ResolvedSnap,
  resolveSnapPoints,
  type SnapPoint,
} from "./snap.ts";
import type {
  SheetController,
  SheetElements,
  SheetOptions,
  SheetState,
} from "./types.ts";

export type {
  SheetController,
  SheetElements,
  SheetOptions,
  SheetState,
} from "./types.ts";

/** The parts `setElements` can swap; `content` and `container` are fixed. */
type PartKey = "header" | "body" | "overlay" | "handle";
const PartKeys: PartKey[] = ["header", "body", "overlay", "handle"];

/**
 * Attach the engine to elements the consumer already rendered. Starts closed:
 * the panel is translated to the bottom of the view and `data-state="closed"`.
 */
export function createSheet(
  elements: SheetElements,
  options: SheetOptions = {},
): SheetController {
  const { content, container } = elements;
  if (!content) {
    throw new TypeError("createSheet: elements.content is required");
  }

  let opts: SheetOptions = { ...options };
  let destroyed = false;
  let isOpen = false;
  let dragging = false;

  /**
   * Which transition is waiting to be finalised. Completion is a function of
   * "the spring finally rested while this was pending", never of which
   * `spring.set()` call happened to resolve — a measurement or resize landing
   * mid-animation supersedes that call, and the transition still has to finish.
   */
  let pending: "open" | "close" | null = null;
  let pendingResolvers: (() => void)[] = [];
  /** `skipInitialAnimation` is spent by the first open of this instance. */
  let hasOpened = false;
  /** An open() that arrived before anything was measurable (item 10). */
  let deferredOpen: (() => void) | null = null;

  let viewHeight = 0;
  let headerHeight = 0;
  let contentHeight = 0;
  let resolved: ResolvedSnap[] = [];

  const parts: Record<PartKey, HTMLElement | null> = {
    header: elements.header ?? null,
    body: elements.body ?? null,
    overlay: elements.overlay ?? null,
    handle: elements.handle ?? null,
  };
  const unwire: Partial<Record<PartKey, () => void>> = {};

  const restores: (() => void)[] = [];
  const listeners = new Set<(state: SheetState) => void>();
  const spring = createSpring(0);

  const modal = () => opts.modal ?? true;
  const dismissible = () => opts.dismissible ?? true;
  const points = () => opts.snapPoints ?? [];
  const contentMode = () => isContentMode(points());

  // Content mode never exposes indices, so it always sits at 0.
  let snapIndex = contentMode() ? 0 : (opts.defaultSnapIndex ?? 0);

  /**
   * Content mode has no snap points of its own, but the controller still needs
   * one resolved position to rest at — otherwise `decideRelease` sees an empty
   * list and closes on every release, `dismissible: false` included.
   */
  const effectivePoints = (): SnapPoint[] =>
    points().length === 0 ? ["content"] : points();

  const resolve = () => {
    resolved = resolveSnapPoints(effectivePoints(), {
      viewHeight,
      headerHeight,
      contentHeight,
    });
  };

  const activeSnap = (): ResolvedSnap | undefined =>
    pickIndex(resolved, snapIndex);

  // ------------------------------------------------------------------- state

  const computeState = (): SheetState => {
    const y = spring.get();
    return {
      open: isOpen,
      snapIndex,
      y,
      progress: progressOf(y, viewHeight, resolved),
      dragging,
      animating: spring.animating,
      contentMode: contentMode(),
    };
  };

  const unchanged = (a: SheetState, b: SheetState) =>
    a.open === b.open &&
    a.snapIndex === b.snapIndex &&
    a.y === b.y &&
    a.progress === b.progress &&
    a.dragging === b.dragging &&
    a.animating === b.animating &&
    a.contentMode === b.contentMode;

  let state: SheetState = Object.freeze(computeState());

  /** Replaces the cached snapshot only when a field actually moved. */
  const syncState = (): boolean => {
    const next = computeState();
    if (unchanged(state, next)) return false;
    state = Object.freeze(next);
    return true;
  };

  // A stable reference between changes is what useSyncExternalStore needs.
  const getState = (): SheetState => {
    syncState();
    return state;
  };

  const notify = () => {
    if (!syncState()) return;
    for (const fn of [...listeners]) fn(state);
  };

  const immediateByPreference = (): boolean => {
    if (opts.reducedMotion === true) return true;
    if ((opts.reducedMotion ?? "system") !== "system") return false;
    return (
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  };

  const setDataState = (open: boolean) => {
    const value = open ? "open" : "closed";
    content.setAttribute("data-state", value);
    parts.overlay?.setAttribute("data-state", value);
  };

  const applyRest = (snap: ResolvedSnap) => {
    writeRest(content, snap.y);
    if (parts.body) applyBodyScroll(parts.body, snap.scroll);
    content.setAttribute("data-snap-index", String(snap.index));
  };

  // Only attributes we wrote get removed again — a consumer who put
  // aria-labelledby in their own markup keeps it.
  const ariaWritten = new Set<string>();
  const applyAriaRef = (attr: string, value: string | undefined) => {
    if (value) {
      content.setAttribute(attr, value);
      ariaWritten.add(attr);
    } else if (ariaWritten.delete(attr)) {
      content.removeAttribute(attr);
    }
  };

  const applyAria = () => {
    if (modal()) content.setAttribute("aria-modal", "true");
    else content.removeAttribute("aria-modal");
    applyAriaRef("aria-labelledby", opts.labelledBy);
    applyAriaRef("aria-describedby", opts.describedBy);
    if (contentMode()) content.setAttribute("data-content-mode", "");
    else content.removeAttribute("data-content-mode");
  };

  // -------------------------------------------------------- transition end

  const settlePending = () => {
    const resolvers = pendingResolvers;
    pendingResolvers = [];
    for (const resolve of resolvers) resolve();
  };

  /**
   * Run the tail of an open/close once the spring is at rest. Called after
   * every rest, from whichever code path got there.
   */
  const maybeFinalize = () => {
    if (!pending || destroyed || dragging || spring.animating) return;
    const which = pending;
    pending = null;
    if (which === "open") {
      const snap = activeSnap();
      if (snap) applyRest(snap);
      notify();
      settlePending();
      opts.onAnimationEnd?.(true);
      return;
    }
    setDataState(false);
    guard.disengage();
    guard.restoreFocus();
    notify();
    settlePending();
    opts.onAnimationEnd?.(false);
  };

  // ---------------------------------------------------------------- position

  const snapTo = async (
    index: number,
    o: { immediate?: boolean; velocity?: number } = {},
  ): Promise<void> => {
    if (destroyed) return;
    const target = pickIndex(resolved, index);
    if (!target) return;
    if (target.index !== index) {
      warnOnce(
        `snapIndex:${index}`,
        `Snap index ${index} is not available — using ${target.index}.`,
      );
    }
    if (target.index !== snapIndex) {
      snapIndex = target.index;
      notify();
      // Content mode synthesizes its single position, so there is no index the
      // consumer gave us to report a change against.
      if (!contentMode()) opts.onSnapIndexChange?.(target.index, target.point);
    }
    // Closed: record the index the next open() will use, but leave the panel
    // where it is — animating behind `data-state="closed"` is invisible work.
    if (!isOpen) return;
    const immediate = o.immediate === true || immediateByPreference();
    const rested = await spring.set(target.y, {
      immediate,
      velocity: o.velocity,
    });
    if (destroyed) return;
    if (rested) {
      applyRest(target);
      notify();
    }
    maybeFinalize();
  };

  // ------------------------------------------------------------ open / close

  const guard = createModalGuard({
    content,
    overlay: () => parts.overlay,
    container,
    onEscape: () => dismiss(),
  });

  const open = (): Promise<void> => {
    if (destroyed || isOpen) return Promise.resolve();
    const snap = activeSnap();
    if (!snap) {
      // Nothing resolved yet — a hidden iframe, a `display: none` host, or a
      // container that has not been laid out. Hold the request and run it on
      // the first refresh() that produces a snap, rather than dropping it.
      if (viewHeight <= 0) {
        return new Promise<void>((resolve) => {
          deferredOpen = () => {
            deferredOpen = null;
            open().then(resolve);
          };
        });
      }
      warnOnce(
        "open:no-snaps",
        "open() ignored — no usable snap point. Is the container measurable?",
      );
      return Promise.resolve();
    }
    isOpen = true;
    pending = "open";
    if (modal()) guard.engage(dismissible());
    // Re-arm separately from engage(): a dismissal that the consumer vetoes by
    // re-opening from inside onOpenChange gets here while the close animation
    // has not disengaged yet, so the idempotent engage() early-returns — but
    // closeWith() has already popped this sheet off the Escape stack.
    if (modal() && dismissible()) guard.ensureEscape();
    guard.captureFocus();
    setDataState(true);
    notify();

    const done = new Promise<void>((resolve) => pendingResolvers.push(resolve));
    // skipInitialAnimation is about mounting at position, so it applies to the
    // first open of this controller only; later opens animate.
    const immediate =
      (opts.skipInitialAnimation === true && !hasOpened) ||
      immediateByPreference();
    hasOpened = true;
    void spring.set(snap.y, { immediate });
    maybeFinalize();
    return done;
  };

  const closeWith = (dismissed: boolean): Promise<void> => {
    deferredOpen = null;
    if (destroyed || !isOpen) return Promise.resolve();
    isOpen = false;
    pending = "close";
    guard.releaseEscape();
    notify();
    // Reported as soon as the close is under way: a controlled parent needs it
    // to mirror state, and unmounting waits for onAnimationEnd(false) anyway.
    if (dismissed) opts.onOpenChange?.(false);
    // A controlled parent vetoes a dismissal by calling open() from inside that
    // callback; that call owns `pending` now, so leave its animation alone.
    if (isOpen || destroyed) return Promise.resolve();

    const done = new Promise<void>((resolve) => pendingResolvers.push(resolve));
    void spring.set(viewHeight, { immediate: immediateByPreference() });
    maybeFinalize();
    return done;
  };

  const close = () => closeWith(false);
  function dismiss() {
    void closeWith(true);
  }

  // ------------------------------------------------------------ measurement

  const refresh = (viewHeightChanged: boolean) => {
    if (destroyed) return;
    const before = activeSnap()?.y;
    resolve();
    const after = activeSnap();
    if (!after) return;
    if (deferredOpen) {
      deferredOpen();
      return;
    }
    if (!isOpen) {
      void spring.set(viewHeight, { immediate: true });
      return;
    }
    if (before !== after.y) {
      void snapTo(after.index, {
        immediate: dragging || viewHeightChanged,
      });
    }
  };

  const detachDrag = attachSheetDrag({
    content,
    body: () => parts.body,
    spring,
    activeSnap,
    resolved: () => resolved,
    viewHeight: () => viewHeight,
    snapIndex: () => snapIndex,
    dismissible,
    setDragging: (next) => {
      dragging = next;
    },
    snapTo: (index, o) => void snapTo(index, o),
    dismiss: () => dismiss(),
    notify,
    onDragStart: () => opts.onDragStart?.(),
    onDragEnd: (index) => opts.onDragEnd?.(index),
  });

  // ------------------------------------------------------------ part wiring

  const onOverlayClick = () => {
    if (dismissible()) dismiss();
  };

  /** Everything one optional part owns, and how to give it all back. */
  const wirers: Record<PartKey, (el: HTMLElement) => () => void> = {
    header: (el) =>
      observeHeight(el, (height) => {
        headerHeight = height;
        refresh(false);
      }),
    body: (el) => {
      const restore = setStyles(el, bodyBaseStyles());
      const snap = activeSnap();
      if (snap) applyBodyScroll(el, snap.scroll);
      return restore;
    },
    overlay: (el) => {
      const restoreStyles = setStyles(
        el,
        overlayBaseStyles(Boolean(container)),
      );
      const restore = setAttrs(el, {
        "aria-hidden": "true",
        "data-state": isOpen ? "open" : "closed",
      });
      el.addEventListener("click", onOverlayClick);
      return () => {
        el.removeEventListener("click", onOverlayClick);
        el.style.removeProperty("--snap-sheet-progress");
        restore();
        restoreStyles();
      };
    },
    handle: (el) => {
      const restore = setAttrs(el, { "aria-label": "Resize sheet" }, true);
      const detach = attachHandleKeys(el, {
        step(delta) {
          const target = stepFrom(resolved, snapIndex, delta);
          if (target) void snapTo(target.index);
        },
        cycle() {
          const target = cycleFrom(resolved, snapIndex);
          if (target) void snapTo(target.index);
        },
      });
      return () => {
        detach();
        restore();
      };
    },
  };

  const wirePart = (key: PartKey, el: HTMLElement | null) => {
    unwire[key]?.();
    delete unwire[key];
    parts[key] = el;
    if (el) unwire[key] = wirers[key](el);
  };

  const setElements = (next: Partial<SheetElements>) => {
    if (destroyed) return;
    if ("content" in next && next.content !== content) {
      throw new TypeError(
        "setElements: `content` cannot change — recreate the sheet",
      );
    }
    if (
      "container" in next &&
      (next.container ?? null) !== (container ?? null)
    ) {
      throw new TypeError(
        "setElements: `container` cannot change — recreate the sheet",
      );
    }
    for (const key of PartKeys) {
      if (!(key in next)) continue;
      const el = next[key] ?? null;
      // A removed header leaves a stale measurement behind.
      if (key === "header" && !el) headerHeight = 0;
      wirePart(key, el);
    }
    if ("overlay" in next) setDataState(isOpen);
    refresh(false);
    notify();
  };

  // --------------------------------------------------------------- attach

  restores.push(setStyles(content, contentBaseStyles(Boolean(container))));
  restores.push(
    setAttrs(content, { role: "dialog", "data-state": "closed" }),
    setAttrs(content, { tabindex: "-1" }, true),
  );
  applyAria();

  const unsubscribeSpring = spring.subscribe((y) => {
    writeFrame(content, parts.overlay, y, progressOf(y, viewHeight, resolved));
    notify();
    maybeFinalize();
  });

  const unobserveView = observeViewHeight(container ?? null, (height) => {
    const changed = height !== viewHeight;
    viewHeight = height;
    refresh(changed);
  });
  // The wrapper the "content" snap is measured from. It gets base styles of its
  // own: as a plain flex item of the panel it would be shrunk to the visible
  // strip and the measurement would feed back into itself (item 8).
  const contentInner = findContentInner(content);
  if (contentInner !== content) {
    restores.push(setStyles(contentInner, innerBaseStyles(Boolean(container))));
  }
  const unobserveContent = observeHeight(contentInner, (height) => {
    // Paused at a scrolling snap: Body is a scroller there, so its height is
    // no longer the natural content height (PLAN §3.3).
    if (activeSnap()?.scroll && contentHeight > 0) return;
    contentHeight = height;
    refresh(false);
  });

  for (const key of PartKeys) wirePart(key, parts[key]);

  resolve();
  writeFrame(content, parts.overlay, viewHeight, 0);
  void spring.set(viewHeight, { immediate: true });

  // -------------------------------------------------------------- lifecycle

  const update = (next: Partial<SheetOptions>) => {
    if (destroyed) return;
    const wasModal = modal();
    const beforeY = activeSnap()?.y;
    opts = { ...opts, ...next };
    applyAria();
    resolve();
    if (isOpen && wasModal !== modal()) {
      if (modal()) guard.engage(dismissible());
      else guard.disengage();
    }
    if (isOpen && modal()) {
      if (dismissible()) guard.ensureEscape();
      else guard.releaseEscape();
    }
    const target = pickIndex(resolved, snapIndex);
    if (!target) {
      notify();
      return;
    }
    if (target.index !== snapIndex || target.y !== beforeY) {
      void snapTo(target.index, { immediate: dragging });
    } else {
      notify();
    }
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    detachDrag();
    for (const key of PartKeys) {
      unwire[key]?.();
      delete unwire[key];
    }
    unobserveView();
    unobserveContent();
    spring.stop();
    unsubscribeSpring();
    // Unconditional: a close whose animation never rested (or was superseded)
    // still holds the lock, and `isOpen` already flipped false when it started.
    guard.disengage();
    guard.restoreFocus();
    isOpen = false;
    for (const restore of restores.reverse()) restore();
    restores.length = 0;
    content.style.removeProperty("transform");
    content.style.removeProperty("padding-bottom");
    for (const prop of ["y", "progress", "offset"]) {
      content.style.removeProperty(`--snap-sheet-${prop}`);
    }
    for (const attr of [
      "data-snap-index",
      "data-dragging",
      "data-content-mode",
    ]) {
      content.removeAttribute(attr);
    }
    parts.overlay?.removeAttribute("data-state");
    pending = null;
    settlePending();
    listeners.clear();
  };

  return {
    open,
    close,
    snapTo: (index, o) => snapTo(index, o),
    update,
    setElements,
    getState,
    subscribe(fn) {
      if (destroyed) return () => {};
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    destroy,
  };
}
