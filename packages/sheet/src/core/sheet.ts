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

/**
 * Attach the engine to elements the consumer already rendered. Starts closed:
 * the panel is translated to the bottom of the view and `data-state="closed"`.
 */
export function createSheet(
  elements: SheetElements,
  options: SheetOptions = {},
): SheetController {
  const { content, header, body, overlay, handle, container } = elements;
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
  let snapIndex = opts.defaultSnapIndex ?? 0;

  const restores: (() => void)[] = [];
  const listeners = new Set<(state: SheetState) => void>();
  const spring = createSpring(0);

  const modal = () => opts.modal ?? true;
  const dismissible = () => opts.dismissible ?? true;
  const points = () => opts.snapPoints ?? [];
  const contentMode = () => isContentMode(points());

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

  const getState = (): SheetState => {
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

  const notify = () => {
    const state = getState();
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
    overlay?.setAttribute("data-state", value);
  };

  const applyRest = (snap: ResolvedSnap) => {
    writeRest(content, snap.y);
    if (body) applyBodyScroll(body, snap.scroll);
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
      opts.onSnapIndexChange?.(target.index, target.point);
      notify();
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
    overlay,
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
    if (!rested || destroyed) return;
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

    const rested = await spring.set(viewHeight, {
      immediate: immediateByPreference(),
    });
    if (destroyed || !rested) return;
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
    body,
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

  // --------------------------------------------------------------- attach

  restores.push(setStyles(content, contentBaseStyles(Boolean(container))));
  restores.push(
    setAttrs(content, { role: "dialog", "data-state": "closed" }),
    setAttrs(content, { tabindex: "-1" }, true),
  );
  if (body) restores.push(setStyles(body, bodyBaseStyles()));
  if (overlay) {
    restores.push(
      setAttrs(overlay, { "aria-hidden": "true", "data-state": "closed" }),
    );
  }
  if (handle) {
    restores.push(setAttrs(handle, { "aria-label": "Resize sheet" }, true));
  }
  applyAria();

  const onOverlayClick = () => {
    if (dismissible()) dismiss();
  };
  overlay?.addEventListener("click", onOverlayClick);

  const detachHandle = handle
    ? attachHandleKeys(handle, {
        step(delta) {
          const target = stepFrom(resolved, snapIndex, delta);
          if (target) void snapTo(target.index);
        },
        cycle() {
          const target = cycleFrom(resolved, snapIndex);
          if (target) void snapTo(target.index);
        },
      })
    : null;

  const unsubscribeSpring = spring.subscribe((y) => {
    writeFrame(content, overlay, y, progressOf(y, viewHeight, resolved));
    notify();
  });

  const unobserveView = observeViewHeight(container ?? null, (height) => {
    const changed = height !== viewHeight;
    viewHeight = height;
    refresh(changed);
  });
  const unobserveHeader = header
    ? observeHeight(header, (height) => {
        headerHeight = height;
        refresh(false);
      })
    : null;
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

  resolve();
  writeFrame(content, overlay, viewHeight, 0);
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
    detachHandle?.();
    overlay?.removeEventListener("click", onOverlayClick);
    unobserveView();
    unobserveHeader?.();
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
      overlay?.style.removeProperty(`--snap-sheet-${prop}`);
    }
    for (const attr of [
      "data-snap-index",
      "data-dragging",
      "data-content-mode",
    ]) {
      content.removeAttribute(attr);
    }
    overlay?.removeAttribute("data-state");
    listeners.clear();
  };

  return {
    open,
    close,
    snapTo: (index, o) => snapTo(index, o),
    update,
    getState,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    destroy,
  };
}
