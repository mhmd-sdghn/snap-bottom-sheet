import { createSpring } from "@snap-bottom-sheet/spring";
import {
  applySnapLayout,
  bodyBaseStyles,
  contentBaseStyles,
  findContentInner,
  innerBaseStyles,
  overlayBaseStyles,
  rememberBodyScroll,
  rememberSnapLayout,
  SheetPartAttr,
  setAttrs,
  setStyles,
  writeFrame,
  writeRest,
} from "./dom.ts";
import { attachSheetDrag } from "./drag.ts";
import { isBrowser, warnOnce } from "./env.ts";
import { attachHandleKeys } from "./keyboard.ts";
import { observeHeight, observeViewHeight } from "./measure.ts";
import { createModalGuard } from "./modal.ts";
import { cycleFrom, pickIndex, progressOf, stepFrom } from "./position.ts";
import {
  isContentMode,
  normalize,
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

/** How long after a drag a click on the handle is treated as its tail. */
const ClickAfterDragMs = 300;

/**
 * A container that is none of these is not a containing block, so the panel's
 * `position: absolute` would escape it. Tested by exclusion because jsdom
 * reports "" rather than "static" for an unstyled element.
 */
const PositionedValues = new Set(["relative", "absolute", "fixed", "sticky"]);

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
  /**
   * Set while the observers wired during attach are firing. They call back
   * synchronously, and every one of them would re-resolve and re-snap a sheet
   * that is not wired up yet; attach resolves once, at the end.
   */
  let attaching = true;
  /** When the last drag ended, so the click it produces can be ignored. */
  let draggedAt = 0;

  /**
   * Which transition is waiting to be finalised. Completion is a function of
   * "the spring finally rested while this was pending", never of which
   * `spring.set()` call happened to resolve — a measurement or resize landing
   * mid-animation supersedes that call, and the transition still has to finish.
   */
  let pending: "open" | "close" | null = null;
  /**
   * Kept per direction: one shared list let a `close()` promise resolve on a
   * later `open()` completing. A superseded direction is settled when the new
   * transition takes over, so nothing hangs either.
   */
  const resolvers: Record<"open" | "close", (() => void)[]> = {
    open: [],
    close: [],
  };
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
   *
   * One rule for detection and resolution: whatever `isContentMode` calls
   * content mode resolves to exactly one snap, keeping the first entry's
   * `scroll`/`drag` — nothing else can express them.
   */
  const effectivePoints = (): SnapPoint[] => {
    if (!contentMode()) return points();
    const first = points()[0];
    return [first ? normalize(first) : "content"];
  };

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

  /** The drag layer owns the flag; this is the only reader side. */
  const dragging = (): boolean => drag.isDragging();

  const computeState = (): SheetState => {
    const y = spring.get();
    return {
      open: isOpen,
      snapIndex,
      y,
      progress: progressOf(y, viewHeight, resolved),
      dragging: dragging(),
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

  // Assigned once the drag layer exists (computeState reads its flag); nothing
  // reads `state` before then.
  let state: SheetState;

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
    applySnapLayout(contentInner, parts.body, snap.scroll);
    content.setAttribute("data-snap-index", String(snap.index));
  };

  /**
   * Restore-then-reapply, through the same `setAttrs` bookkeeping every other
   * attribute uses: a consumer who wrote their own `aria-labelledby` on the
   * panel gets it back when the option is cleared and when the sheet is
   * destroyed, instead of having it deleted.
   */
  let restoreAria: (() => void) | null = null;
  const applyAria = () => {
    restoreAria?.();
    const attrs: Record<string, string> = {};
    if (modal()) attrs["aria-modal"] = "true";
    if (opts.labelledBy) attrs["aria-labelledby"] = opts.labelledBy;
    if (opts.describedBy) attrs["aria-describedby"] = opts.describedBy;
    if (contentMode()) attrs["data-content-mode"] = "";
    restoreAria = setAttrs(content, attrs);
  };

  // -------------------------------------------------------- transition end

  const settlePending = (which: "open" | "close") => {
    const waiting = resolvers[which];
    resolvers[which] = [];
    for (const resolve of waiting) resolve();
  };

  /** Everyone waiting on either direction: teardown and cancellation paths. */
  const settleAll = () => {
    settlePending("open");
    settlePending("close");
  };

  /**
   * Start a transition. A direction that was pending and is now replaced can
   * never complete, so its waiters are released here rather than left hanging.
   */
  const beginTransition = (which: "open" | "close"): Promise<void> => {
    if (pending && pending !== which) settlePending(pending);
    pending = which;
    return new Promise<void>((resolve) => resolvers[which].push(resolve));
  };

  /**
   * Run the tail of an open/close once the spring is at rest. Called after
   * every rest, from whichever code path got there.
   */
  const maybeFinalize = () => {
    if (!pending || destroyed || dragging() || spring.animating) return;
    const which = pending;
    pending = null;
    if (which === "open") {
      const snap = activeSnap();
      if (snap) applyRest(snap);
      notify();
      settlePending("open");
      opts.onAnimationEnd?.(true);
      return;
    }
    setDataState(false);
    guard.disengage();
    if (modal()) guard.restoreFocus();
    notify();
    settlePending("close");
    opts.onAnimationEnd?.(false);
  };

  // ---------------------------------------------------------------- position

  /**
   * Bumped by every snapTo that gets past its guards. A later call supersedes
   * an earlier one, including one made *from inside* `onSnapIndexChange` — the
   * outer call would otherwise carry on and animate to its own stale target.
   */
  let snapSeq = 0;

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
    const seq = ++snapSeq;
    if (target.index !== snapIndex) {
      snapIndex = target.index;
      notify();
      // Content mode synthesizes its single position, so there is no index the
      // consumer gave us to report a change against.
      if (!contentMode()) opts.onSnapIndexChange?.(target.index, target.point);
      // The callback may have called snapTo again; that call owns the target.
      if (seq !== snapSeq) return;
    }
    // Closed: record the index the next open() will use, but leave the panel
    // where it is — animating behind `data-state="closed"` is invisible work.
    if (!isOpen) return;
    const immediate = o.immediate === true || immediateByPreference();
    // The at-rest DOM is written from the rest notification, not from this
    // promise: a snapTo superseded by a re-snap resolves `false` and would
    // otherwise leave data-snap-index and the padding stale until the churn
    // stopped, even though the panel did come to rest.
    await spring.set(target.y, { immediate, velocity: o.velocity });
    if (destroyed || seq !== snapSeq) return;
    notify();
    maybeFinalize();
  };

  // ------------------------------------------------------------ open / close

  const guard = createModalGuard({
    content,
    overlay: () => parts.overlay,
    container,
    dismissible,
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
        // The waiter goes on the open list, not into the closure alone: a
        // close() or destroy() that cancels the deferral has to settle it, or
        // the caller (and React's handle.open() deferred) waits forever.
        const held = beginTransition("open");
        deferredOpen = () => {
          deferredOpen = null;
          void open();
        };
        return held;
      }
      warnOnce(
        "open:no-snaps",
        "open() ignored — no usable snap point. Is the container measurable?",
      );
      return Promise.resolve();
    }
    isOpen = true;
    // Focus is remembered *before* engage(): engage() marks the siblings
    // `inert`, and a browser blurs the focused element when its subtree becomes
    // inert — so afterwards the trigger is gone and <body> is all there is to
    // remember. PLAN §3.6 scopes focus management to modal: a non-modal sheet
    // is a persistent panel and must not steal focus from whatever the user
    // is on.
    if (modal()) guard.captureFocus();
    if (modal()) guard.engage();
    // Re-arm separately from engage(): a dismissal that the consumer vetoes by
    // re-opening from inside onOpenChange gets here while the close animation
    // has not disengaged yet, so the idempotent engage() early-returns — but
    // closeWith() has already popped this sheet off the Escape stack.
    if (modal()) guard.ensureEscape();
    setDataState(true);
    notify();

    const done = beginTransition("open");
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
    if (destroyed || !isOpen) {
      // Nothing open, but a deferral may still be queued: cancel it, drop the
      // open transition it opened, and settle its waiters.
      if (deferredOpen) {
        deferredOpen = null;
        // `pending` too, not just the waiters: left at "open", the next spring
        // notification would finalise an open that never happened — writing
        // data-snap-index and firing onAnimationEnd(true) on a closed sheet.
        pending = null;
        settlePending("open");
        // The transition ended, in the closed state. Reported even though no
        // animation ran, so a consumer (React's presence gate above all) that
        // waits for the close to finish is not left waiting for a frame that
        // will never come.
        opts.onAnimationEnd?.(false);
      }
      return Promise.resolve();
    }
    isOpen = false;
    // Cancels a still-deferred open, whose waiter beginTransition settles.
    deferredOpen = null;
    const done = beginTransition("close");
    guard.releaseEscape();
    notify();
    // Reported as soon as the close is under way: a controlled parent needs it
    // to mirror state, and unmounting waits for onAnimationEnd(false) anyway.
    if (dismissed) opts.onOpenChange?.(false);
    // A controlled parent vetoes a dismissal by calling open() from inside that
    // callback; that call owns `pending` now, so leave its animation alone.
    if (isOpen || destroyed) return Promise.resolve();

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
    if (destroyed || attaching) return;
    const before = activeSnap()?.y;
    resolve();
    const after = activeSnap();
    if (!after) return;
    if (deferredOpen) {
      deferredOpen();
      return;
    }
    if (!isOpen) {
      // Parked at the bottom — except while a close is still running, where a
      // jump to viewHeight would teleport the panel instead of letting it
      // slide. A measurement landing mid-close only updates the target.
      void spring.set(viewHeight, { immediate: pending !== "close" });
      return;
    }
    if (before !== after.y) {
      void snapTo(after.index, {
        immediate: dragging() || viewHeightChanged,
      });
    }
  };

  const drag = attachSheetDrag({
    content,
    body: () => parts.body,
    spring,
    activeSnap,
    isOpen: () => isOpen,
    resolved: () => resolved,
    viewHeight: () => viewHeight,
    snapIndex: () => snapIndex,
    dismissible,
    snapTo: (index, o) => void snapTo(index, o),
    dismiss: () => dismiss(),
    notify,
    onDragStart: () => opts.onDragStart?.(),
    onDragEnd: (index) => {
      draggedAt = Date.now();
      opts.onDragEnd?.(index);
    },
  });

  state = Object.freeze(computeState());

  // ------------------------------------------------------------ part wiring

  const onOverlayClick = () => {
    if (dismissible()) dismiss();
  };

  /** The current frame, written to whatever parts exist right now. */
  const paint = () => {
    const y = spring.get();
    writeFrame(content, parts.overlay, y, progressOf(y, viewHeight, resolved));
  };

  /**
   * A non-modal sheet is a panel, not a dialog: its overlay would be an
   * invisible full-viewport click-catcher that dismisses on any outside click.
   * React renders `Sheet.Overlay` unconditionally, so the controller is the one
   * that has to hide it — restorably, and re-checked on every `update`.
   */
  let restoreOverlayDisplay: (() => void) | null = null;
  const syncOverlayDisplay = () => {
    const el = parts.overlay;
    if (!el) return;
    if (modal()) {
      restoreOverlayDisplay?.();
      restoreOverlayDisplay = null;
    } else if (!restoreOverlayDisplay) {
      restoreOverlayDisplay = setStyles(el, { display: "none" });
    }
  };

  /** Everything one optional part owns, and how to give it all back. */
  const wirers: Record<PartKey, (el: HTMLElement) => () => void> = {
    header: (el) =>
      observeHeight(el, (height) => {
        headerHeight = height;
        refresh(false);
      }),
    body: (el) => {
      const restoreBase = setStyles(el, bodyBaseStyles());
      // applySnapLayout writes overflow/overflowY/flex outside setStyles's
      // bookkeeping, so they need their own snapshot or destroy() leaves them.
      const restoreScroll = rememberBodyScroll(el);
      const snap = activeSnap();
      if (snap) applySnapLayout(contentInner, el, snap.scroll);
      return () => {
        restoreScroll();
        restoreBase();
      };
    },
    overlay: (el) => {
      const restoreStyles = setStyles(
        el,
        overlayBaseStyles(Boolean(container)),
      );
      const restore = setAttrs(el, {
        "aria-hidden": "true",
        "data-state": isOpen ? "open" : "closed",
        [SheetPartAttr]: "overlay",
      });
      el.addEventListener("click", onOverlayClick);
      syncOverlayDisplay();
      return () => {
        el.removeEventListener("click", onOverlayClick);
        el.style.removeProperty("--snap-sheet-progress");
        restoreOverlayDisplay?.();
        restoreOverlayDisplay = null;
        restore();
        restoreStyles();
      };
    },
    handle: (el) => {
      const restore = setAttrs(el, { "aria-label": "Resize sheet" }, true);
      const cycle = () => {
        const target = cycleFrom(resolved, snapIndex);
        if (target) void snapTo(target.index);
      };
      // A drag that ends on the handle also produces a click; cycling then
      // would fight the release the user just made.
      // ponytail: a time window, not the pointer distance — the gesture layer
      // already rejects taps, so only the tail of a real drag lands here.
      const onClick = () => {
        if (Date.now() - draggedAt < ClickAfterDragMs) return;
        cycle();
      };
      const detach = attachHandleKeys(el, {
        step(delta) {
          const target = stepFrom(resolved, snapIndex, delta);
          if (target) void snapTo(target.index);
        },
        cycle,
      });
      el.addEventListener("click", onClick);
      return () => {
        el.removeEventListener("click", onClick);
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
    // A part handed over between frames has none of the state-dependent DOM
    // the frame writer puts there — an overlay mounted at rest
    // (`{modal && <Sheet.Overlay/>}` flipped on) would carry no
    // `--snap-sheet-progress` at all until something moved next.
    paint();
    const snap = activeSnap();
    if (snap && isOpen && !spring.animating && !dragging()) applyRest(snap);
    notify();
  };

  // --------------------------------------------------------------- attach

  // `viewHeight` is measured from the container and the panel is positioned
  // against it, so a static container is measured as one box and painted in
  // another. Making it a containing block is the smallest correct fix.
  if (
    container &&
    isBrowser() &&
    !PositionedValues.has(getComputedStyle(container).position)
  ) {
    warnOnce(
      "container:static",
      "The sheet container is `position: static` — set `position: relative` " +
        "on it. The sheet positions itself against the container, so it is " +
        "being made relative for you.",
    );
    restores.push(setStyles(container, { position: "relative" }));
  }

  restores.push(setStyles(content, contentBaseStyles(Boolean(container))));
  restores.push(
    setAttrs(content, {
      role: "dialog",
      "data-state": "closed",
      [SheetPartAttr]: "content",
    }),
    setAttrs(content, { tabindex: "-1" }, true),
  );
  applyAria();
  restores.push(() => restoreAria?.());

  const unsubscribeSpring = spring.subscribe((y) => {
    writeFrame(content, parts.overlay, y, progressOf(y, viewHeight, resolved));
    // Rest is where the at-rest DOM belongs, whichever `set()` got us here —
    // including a superseded one, whose promise resolves `false` (B.17).
    if (!spring.animating && !dragging() && isOpen) {
      const snap = activeSnap();
      if (snap && snap.y === y) applyRest(snap);
    }
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
    restores.push(setStyles(contentInner, innerBaseStyles()));
  }
  // applySnapLayout writes `flex` per snap, outside setStyles's bookkeeping.
  restores.push(rememberSnapLayout(contentInner));
  const unobserveContent = observeHeight(contentInner, (height) => {
    // Paused at a scrolling snap: Body is a scroller there, so its height is
    // no longer the natural content height (PLAN §3.3).
    if (activeSnap()?.scroll && contentHeight > 0) return;
    contentHeight = height;
    refresh(false);
  });

  for (const key of PartKeys) wirePart(key, parts[key]);

  // Every observer above called back synchronously while `attaching` held them
  // off; this is the one resolve of the attach.
  attaching = false;
  resolve();
  // The body wirer above ran before anything was resolved, so the per-snap
  // layout it would have written is written here instead — once.
  const initial = activeSnap();
  if (initial) applySnapLayout(contentInner, parts.body, initial.scroll);
  // `defaultSnapIndex` is stored before anything is resolved, so an out-of-range
  // one would name a missing snap for the controller's whole life: every read
  // falls back to the nearest snap, while `snapIndex` keeps reporting the index
  // that is not there — and the first ArrowUp would step from it, not from
  // where the panel is.
  if (initial && initial.index !== snapIndex) {
    warnOnce(
      `defaultSnapIndex:${snapIndex}`,
      `defaultSnapIndex ${snapIndex} is not a snap point — using ${initial.index}.`,
    );
    snapIndex = initial.index;
    // No subscriber can exist yet; this only refreshes the cached snapshot.
    notify();
  }
  writeFrame(content, parts.overlay, viewHeight, 0);
  void spring.set(viewHeight, { immediate: true });

  // -------------------------------------------------------------- lifecycle

  const update = (next: Partial<SheetOptions>) => {
    if (destroyed) return;
    const wasModal = modal();
    const before = activeSnap();
    const beforeY = before?.y;
    const beforeScroll = before?.scroll;
    opts = { ...opts, ...next };
    applyAria();
    syncOverlayDisplay();
    resolve();
    // A.11: the two directions must be symmetric, focus included.
    if (isOpen && wasModal !== modal()) {
      if (modal()) {
        // Capture first, engage second — see open().
        guard.captureFocus();
        guard.engage();
      } else {
        guard.disengage();
        guard.restoreFocus();
      }
    }
    // Dismissibility is read live by the Escape handler, so membership of the
    // stack follows `modal` alone — a non-dismissible modal still swallows it.
    if (isOpen && modal()) guard.ensureEscape();
    const target = pickIndex(resolved, snapIndex);
    if (!target) {
      notify();
      return;
    }
    if (target.index !== snapIndex || target.y !== beforeY) {
      void snapTo(target.index, { immediate: dragging() });
      return;
    }
    // Same index, same y, but the snap's own config may have changed — a
    // `scroll` flip alone never reached applyRest, so Body stayed clipped while
    // the drag logic yielded to a scroll that could not happen.
    if (target.scroll !== beforeScroll && !spring.animating && isOpen) {
      applyRest(target);
    }
    notify();
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    drag.detach();
    for (const key of PartKeys) {
      unwire[key]?.();
      delete unwire[key];
    }
    unobserveView();
    unobserveContent();
    // Unsubscribe first: stop() notifies, and the frame writer would put
    // --snap-sheet-progress back on an overlay the part unwire just cleaned.
    unsubscribeSpring();
    spring.stop();
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
    // data-content-mode and the aria refs come back through `restoreAria`.
    for (const attr of ["data-snap-index", "data-dragging"]) {
      content.removeAttribute(attr);
    }
    parts.overlay?.removeAttribute("data-state");
    pending = null;
    deferredOpen = null;
    // Teardown, not a transition: promises settle so nothing awaits a
    // destroyed controller, but no consumer callback fires from destroy().
    settleAll();
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
