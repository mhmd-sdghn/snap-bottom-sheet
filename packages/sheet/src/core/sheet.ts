import { createSpring } from "@snap-bottom-sheet/spring";
import {
  applyBodyScroll,
  bodyBaseStyles,
  contentBaseStyles,
  findContentInner,
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
import {
  cycleFrom,
  pickIndex,
  progressOf,
  stepFrom,
  topmostY,
} from "./position.ts";
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

  const applyAria = () => {
    if (modal()) content.setAttribute("aria-modal", "true");
    else content.removeAttribute("aria-modal");
    if (opts.labelledBy)
      content.setAttribute("aria-labelledby", opts.labelledBy);
    if (opts.describedBy) {
      content.setAttribute("aria-describedby", opts.describedBy);
    }
    if (contentMode()) content.setAttribute("data-content-mode", "");
    else content.removeAttribute("data-content-mode");
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
    const immediate = o.immediate === true || immediateByPreference();
    const rested = await spring.set(target.y, {
      immediate,
      velocity: o.velocity,
    });
    if (!rested || destroyed) return;
    applyRest(target);
    notify();
  };

  // ------------------------------------------------------------ open / close

  const guard = createModalGuard({
    content,
    overlay: () => parts.overlay,
    container,
    onEscape: () => dismiss(),
  });

  const open = async (): Promise<void> => {
    if (destroyed || isOpen) return;
    isOpen = true;
    if (modal()) guard.engage(dismissible());
    guard.captureFocus();
    setDataState(true);
    notify();

    const snap = activeSnap();
    const immediate =
      opts.skipInitialAnimation === true || immediateByPreference();
    const rested = await spring.set(snap ? snap.y : topmostY(resolved), {
      immediate,
    });
    if (!rested || destroyed || !isOpen) return;
    if (snap) applyRest(snap);
    notify();
    opts.onAnimationEnd?.(true);
  };

  const closeWith = async (dismissed: boolean): Promise<void> => {
    if (destroyed || !isOpen) return;
    isOpen = false;
    guard.releaseEscape();
    notify();
    // Reported as soon as the close is under way: a controlled parent needs it
    // to mirror state, and unmounting waits for onAnimationEnd(false) anyway.
    if (dismissed) opts.onOpenChange?.(false);
    // A controlled parent vetoes a dismissal by calling open() from inside that
    // callback; its animation must not be clobbered by the close we started.
    if (isOpen || destroyed) return;

    const rested = await spring.set(viewHeight, {
      immediate: immediateByPreference(),
    });
    if (destroyed || !rested || isOpen) return;
    setDataState(false);
    guard.disengage();
    guard.restoreFocus();
    notify();
    opts.onAnimationEnd?.(false);
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
      const restore = setAttrs(el, {
        "aria-hidden": "true",
        "data-state": isOpen ? "open" : "closed",
      });
      el.addEventListener("click", onOverlayClick);
      return () => {
        el.removeEventListener("click", onOverlayClick);
        el.style.removeProperty("--snap-sheet-progress");
        restore();
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
  });

  const unobserveView = observeViewHeight(container ?? null, (height) => {
    const changed = height !== viewHeight;
    viewHeight = height;
    refresh(changed);
  });
  const unobserveContent = observeHeight(
    findContentInner(content),
    (height) => {
      // Paused at a scrolling snap: Body is a scroller there, so its height is
      // no longer the natural content height (PLAN §3.3).
      if (activeSnap()?.scroll && contentHeight > 0) return;
      contentHeight = height;
      refresh(false);
    },
  );

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
    if (isOpen && modal() && !dismissible()) guard.releaseEscape();
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
