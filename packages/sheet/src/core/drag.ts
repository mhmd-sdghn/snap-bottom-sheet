import { attachDrag } from "@snap-bottom-sheet/gesture";
import type { Spring } from "@snap-bottom-sheet/spring";
import { SheetPartAttr } from "./dom.ts";
import { clamp, isBrowser } from "./env.ts";
import { topmostY } from "./position.ts";
import { startScrollMomentum } from "./scroll-momentum.ts";
import { decideRelease, type ResolvedSnap } from "./snap.ts";

const BlurredTags = new Set(["INPUT", "TEXTAREA"]);

/** px of slack when comparing scroll offsets and snap positions. */
const Epsilon = 0.5;
/** ms of scroll history kept for the release velocity. */
const SampleWindowMs = 100;

/** Which half of the gesture the finger is currently moving. */
type Mode = "sheet" | "scroll";

/** `[timeStamp, position]`, oldest first. */
type Sample = [number, number];

/** Record a position, dropping anything older than the sample window. */
function pushSample(samples: Sample[], time: number, value: number): void {
  samples.push([time, value]);
  while (samples.length > 1 && (samples[0]?.[0] ?? 0) < time - SampleWindowMs) {
    samples.shift();
  }
}

/** px/ms across the samples held, or 0 when there is nothing to measure. */
function velocityOf(samples: Sample[]): number {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return 0;
  const elapsed = last[0] - first[0];
  return elapsed === 0 ? 0 : (last[1] - first[1]) / elapsed;
}

/** The controller's side of the drag layer. */
export interface DragDeps {
  content: HTMLElement;
  /** Read lazily: `setElements` can swap the body after attach. */
  body(): HTMLElement | null | undefined;
  spring: Spring;
  activeSnap(): ResolvedSnap | undefined;
  isOpen(): boolean;
  resolved(): ResolvedSnap[];
  viewHeight(): number;
  /** Last measured natural height of the panel's content wrapper. */
  contentHeight(): number;
  snapIndex(): number;
  dismissible(): boolean;
  reducedMotion(): boolean;
  snapTo(index: number, opts?: { velocity?: number }): void;
  /**
   * The sheet reached `snap` mid-gesture and the content takes over from here:
   * make that snap the active one and lay the body out as its scroller.
   */
  enterScrollSnap(snap: ResolvedSnap): void;
  dismiss(): void;
  notify(): void;
  onDragStart?(): void;
  onDragEnd?(targetIndex: number): void;
}

/** Mobile ghost caret: a focused field inside the sheet loses focus on drag. */
function blurInside(content: HTMLElement) {
  const active = isBrowser() ? document.activeElement : null;
  if (
    active instanceof HTMLElement &&
    content.contains(active) &&
    BlurredTags.has(active.tagName)
  ) {
    active.blur();
  }
}

/**
 * The same lock `onMove` applies to the sheet, applied to the release velocity.
 * The panel does not move in a locked direction, so a fling that way must not
 * project past a snap either — otherwise a fast flick down dismisses a sheet
 * whose active snap sets `drag: { down: false }`.
 */
function lockVelocity(snap: ResolvedSnap | undefined, vy: number): number {
  if (!snap) return vy;
  if (!snap.drag.up && vy < 0) return 0;
  if (!snap.drag.down && vy > 0) return 0;
  return vy;
}

/**
 * PLAN §3.4 rule 1: regions and situations that never start a drag.
 *
 * Nested sheets are part of that rule. Without a portal the inner panel (and
 * its overlay) sit *inside* the outer panel, so both sheets capture the pointer
 * and the outer one, capturing last, wins. The nearest marked part owns the
 * gesture; `stopPropagation` in `onStart` is too late to help, it only runs
 * once the threshold is crossed.
 */
function dragFilter(content: HTMLElement, target: Element): boolean {
  if (target.closest("[data-snap-sheet-no-drag]")) return false;
  if (target.closest("select")) return false;
  if (isBrowser() && document.getSelection()?.type === "Range") return false;
  const owner = target.closest(`[${SheetPartAttr}]`);
  if (owner && owner !== content) return false;
  return true;
}

/** The drag layer: `detach` tears it down, `isDragging` is the flag itself. */
export interface SheetDrag {
  detach(): void;
  isDragging(): boolean;
  /** Cancel a running momentum fling (a snap change, a close, teardown). */
  stopScroll(): void;
}

/**
 * Wire the gesture recogniser to the controller.
 *
 * PLAN §3.4 rule 2: one finger, two phases. Every move is arbitrated on its
 * *incremental* delta, so the frame that crosses from one phase to the other
 * splits its movement between them and nothing jumps.
 */
export function attachSheetDrag(deps: DragDeps): SheetDrag {
  const { content, spring } = deps;
  let dragging = false;
  let mode: Mode = "sheet";
  /** The pointer started inside Body, so the content can claim the gesture. */
  let inBody = false;
  /** Where the finger was on the previous frame; deltas are read from it. */
  let lastClientY = 0;
  /** `[timeStamp, scrollTop]`, cleared whenever the mode changes. */
  let scrollSamples: Sample[] = [];
  /**
   * `[timeStamp, clientY]` for the frames the *sheet* moved, cleared whenever
   * the mode changes. The recogniser's own `vy` spans the last 100 ms of
   * pointer movement whatever it was doing, so after a scroll phase it
   * describes the content's speed, not the panel's. Releasing on that would
   * fling the sheet at a velocity the panel never had.
   */
  let sheetSamples: Sample[] = [];
  let cancelMomentum: (() => void) | null = null;

  const stopScroll = () => {
    cancelMomentum?.();
    cancelMomentum = null;
  };

  const setMode = (next: Mode) => {
    if (next === mode) return;
    mode = next;
    scrollSamples = [];
    sheetSamples = [];
    writeModeAttrs();
  };

  const writeModeAttrs = () => {
    const scrolling = dragging && mode === "scroll";
    content.toggleAttribute("data-dragging", dragging && !scrolling);
    content.toggleAttribute("data-scrolling", scrolling);
  };

  // --------------------------------------------------------------- scrolling

  /** px the content can still travel, or 0 when the body is not a scroller. */
  const scrollMax = (body: HTMLElement) =>
    Math.max(0, body.scrollHeight - body.clientHeight);

  /**
   * Would the body scroll at `snap`? It is only a real scroller at a
   * `scroll: true` snap; anywhere else it has its natural height and
   * `scrollHeight === clientHeight` no matter how long the list is, so the
   * measured content height is what answers the question there.
   */
  const willScroll = (snap: ResolvedSnap, body: HTMLElement) =>
    deps.activeSnap()?.scroll
      ? scrollMax(body) > 1
      : deps.contentHeight() > snap.height;

  /**
   * The nearest `scroll: true` snap at or above `y`: the highest the sheet may
   * go on this gesture before the content takes over. Null when the pointer is
   * outside Body, when there is no such snap, or when there is nothing to
   * scroll there — a list shorter than the body must not block the drag.
   */
  const scrollCeiling = (y: number): ResolvedSnap | null => {
    const body = deps.body();
    if (!inBody || !body) return null;
    let best: ResolvedSnap | null = null;
    for (const snap of deps.resolved()) {
      if (!snap.scroll || snap.y > y + Epsilon) continue;
      if (!best || snap.y > best.y) best = snap;
    }
    if (!best) return null;
    return willScroll(best, body) ? best : null;
  };

  /** Room left in the finger's direction (negative delta = finger up). */
  const scrollRoom = (delta: number): boolean => {
    const body = deps.body();
    if (!body) return false;
    const max = scrollMax(body);
    if (max <= 1) return false;
    return delta < 0
      ? body.scrollTop < max - Epsilon
      : body.scrollTop > Epsilon;
  };

  /**
   * Scroll the content by a finger delta (finger up = content up = a bigger
   * `scrollTop`). Returns the part of the delta the content could not take,
   * which only ever happens at the top: the end of the list absorbs the rest
   * rather than overscrolling or pushing the sheet up past its ceiling.
   */
  const scrollBy = (delta: number, time: number): number => {
    const body = deps.body();
    if (!body) return delta;
    const next = body.scrollTop - delta;
    let left = 0;
    if (next < 0) {
      body.scrollTop = 0;
      left = -next;
    } else {
      body.scrollTop = Math.min(next, scrollMax(body));
    }
    pushSample(scrollSamples, time, body.scrollTop);
    return left;
  };

  /**
   * px/ms of `scrollTop` over the last ~100 ms. Positive means the content is
   * travelling upwards under the finger, which is the direction a fling
   * continues in.
   */
  const scrollVelocity = (): number => velocityOf(scrollSamples);

  /**
   * px/ms the panel travelled over the last ~100 ms of the sheet phase, from
   * the finger positions that actually moved it. Positive is downwards, the
   * same sign `decideRelease` projects with.
   */
  const sheetVelocity = (): number => velocityOf(sheetSamples);

  // ------------------------------------------------------------- the arbiter

  /**
   * A gesture the sheet consumed still ends in a `click`: the browser only
   * suppresses that one when *the browser* scrolled, and here we did the
   * scrolling ourselves. Without this, dragging a list of links by touch
   * follows whichever link the finger happened to lift over.
   */
  const swallowClick = (event: Event) => {
    event.stopPropagation();
    event.preventDefault();
  };
  const armClickGuard = () => {
    content.addEventListener("click", swallowClick, { capture: true });
    // The click, if any, is dispatched in the task right after pointerup.
    setTimeout(() => {
      content.removeEventListener("click", swallowClick, { capture: true });
    }, 0);
  };

  /**
   * Move the sheet by a finger delta. Returns the remainder the sheet refused,
   * which the caller offers to the content.
   *
   * A direction lock refuses the whole delta, but refusing it is not the same
   * as swallowing it. `drag: { up: false }` means "this panel does not rise",
   * not "this gesture is over": where there is something to scroll, the
   * movement belongs to the content, and a locked snap that is also
   * `scroll: true` would otherwise be impossible to touch-scroll at all. With
   * no scroll ceiling there is nowhere for it to go, so it is dropped. The
   * topmost clamp still swallows its movement — the sheet is simply at the end
   * of its travel there.
   */
  const moveSheet = (delta: number): number => {
    const snap = deps.activeSnap();
    if (snap && !snap.drag.up && delta < 0) {
      return scrollCeiling(spring.get()) ? delta : 0;
    }
    if (snap && !snap.drag.down && delta > 0) {
      return scrollCeiling(spring.get()) ? delta : 0;
    }

    const y = spring.get();
    let next = y + delta;
    let left = 0;
    const ceiling = delta < 0 ? scrollCeiling(y) : null;
    if (ceiling && next < ceiling.y) {
      left = next - ceiling.y;
      next = ceiling.y;
    }
    void spring.set(clamp(next, topmostY(deps.resolved()), deps.viewHeight()), {
      immediate: true,
    });
    if (left !== 0 && ceiling && ceiling.index !== deps.snapIndex()) {
      // The body is the scroller of *that* snap, and it is not laid out as one
      // yet — the sheet has only just arrived. Hand the snap over before the
      // remainder is measured against a body that still has its natural height.
      deps.enterScrollSnap(ceiling);
    }
    return left;
  };

  const detach = attachDrag(
    content,
    {
      onStart(state) {
        // Nested sheets: the inner panel swallows the gesture (P0-5).
        state.event.stopPropagation();
        // A closed panel is still in the DOM through the close animation.
        if (!deps.isOpen()) {
          state.cancel();
          return;
        }
        blurInside(content);
        const body = deps.body();
        inBody =
          state.target instanceof Node && !!body && body.contains(state.target);
        // A list that is already scrolled owns the gesture until it is back at
        // its top, whichever way the finger goes first.
        mode =
          inBody && body && body.scrollTop > Epsilon && scrollRoom(1)
            ? "scroll"
            : "sheet";
        scrollSamples = [];
        sheetSamples = [];
        // The threshold the recogniser swallowed is part of the gesture: the
        // first move must carry it, so the finger's own start is the origin.
        lastClientY = state.event.clientY - state.dy;
        // Set before stop(): a spring that stops mid-open would otherwise let
        // the controller finalise the transition here, one grab too early.
        dragging = true;
        // Freeze under the finger. A running spring keeps flying until the
        // first onMove, so a drag that starts during an animation would fight
        // an animation that is still writing frames.
        spring.stop();
        writeModeAttrs();
        deps.onDragStart?.();
        deps.notify();
      },
      onMove(state) {
        if (!dragging) return;
        const time = state.event.timeStamp;
        const clientY = state.event.clientY;
        let delta = clientY - lastClientY;
        lastClientY = clientY;

        if (delta !== 0) {
          if (mode === "scroll") {
            delta = scrollBy(delta, time);
            // The list is back at its top and the finger is still going down.
            if (delta !== 0) setMode("sheet");
          }
          if (delta !== 0) {
            const left = moveSheet(delta);
            if (left !== 0 && scrollRoom(left)) {
              setMode("scroll");
              scrollBy(left, time);
            }
          }
        }

        // The finger's path for as long as the sheet phase owns the gesture,
        // recorded after any crossing this frame so a sample never lands in the
        // wrong phase. Frames the finger rested on count too: they are what
        // makes a slow release slow.
        if (mode === "sheet") pushSample(sheetSamples, time, clientY);
        deps.notify();
      },
      onEnd(state) {
        if (!dragging) return;
        dragging = false;
        writeModeAttrs();
        if (!state.cancelled) armClickGuard();
        // Closed while this drag ran: onMove killed the close animation with
        // its immediate sets, and snapTo/dismiss are no-ops on a closed sheet,
        // so nothing else would finalise the pending close — the panel would
        // freeze mid-screen with the lock and inert still on. Resume it.
        if (!deps.isOpen()) {
          deps.onDragEnd?.(deps.snapIndex());
          void spring.set(deps.viewHeight());
          deps.notify();
          return;
        }
        if (state.cancelled) {
          // A drag that started must always end: onDragStart already fired.
          deps.onDragEnd?.(deps.snapIndex());
          deps.snapTo(deps.snapIndex());
          deps.notify();
          return;
        }
        if (mode === "scroll") {
          const velocity = scrollVelocity();
          deps.onDragEnd?.(deps.snapIndex());
          // The sheet is resting at its snap; this re-applies that snap's
          // at-rest DOM, which the drag suppressed, and moves nothing.
          deps.snapTo(deps.snapIndex());
          deps.notify();
          const body = deps.body();
          if (body && !deps.reducedMotion()) {
            cancelMomentum = startScrollMomentum(body, velocity);
          }
          return;
        }
        const vy = lockVelocity(deps.activeSnap(), sheetVelocity());
        const decision = decideRelease({
          y: spring.get(),
          vy,
          resolved: deps.resolved(),
          dismissible: deps.dismissible(),
        });
        if (decision.close) {
          deps.onDragEnd?.(-1);
          deps.dismiss();
        } else {
          deps.onDragEnd?.(decision.snap.index);
          deps.snapTo(decision.snap.index, { velocity: vy });
        }
        deps.notify();
      },
    },
    { filter: (target) => dragFilter(content, target) },
  );

  // A tap anywhere on the panel stops a fling, the way a native scroller does.
  // On pointerdown, not on the drag threshold: catching the list mid-flight is
  // a tap, not a drag.
  const onPointerDown = () => stopScroll();
  content.addEventListener("pointerdown", onPointerDown, { passive: true });

  return {
    detach() {
      content.removeEventListener("pointerdown", onPointerDown);
      stopScroll();
      detach();
    },
    isDragging: () => dragging,
    stopScroll,
  };
}
