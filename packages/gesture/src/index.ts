/**
 * Vertical drag recogniser on Pointer Events. Zero dependencies, no framework,
 * no DOM writes: it reports deltas and velocity, the caller decides what to do
 * with them. `touch-action` is deliberately left alone — the caller owns the
 * CSS that decides whether the browser scrolls or we drag (PLAN §3.2).
 */

export interface DragState {
  /** px since pointerdown (+ = right) */
  dx: number;
  /** px since pointerdown (+ = down) */
  dy: number;
  /** px/ms, from the samples of the last 100 ms (0 on start) */
  vy: number;
  /** true when the browser ended the drag (pointercancel / lost capture) */
  cancelled: boolean;
  /** the original pointerdown target */
  target: EventTarget | null;
  /** the event that produced this state */
  event: PointerEvent;
  /** abandon this drag: no further onMove/onEnd for this pointer */
  cancel(): void;
}

export interface DragHandlers {
  /** fired once the threshold is passed (not on pointerdown) */
  onStart?(state: DragState): void;
  onMove?(state: DragState): void;
  /** pointerup after onStart, or a browser cancel (`cancelled: true`) */
  onEnd?(state: DragState): void;
}

export interface DragOptions {
  /** px of movement before onStart; default 3 */
  threshold?: number;
  /** "y" (default) ignores gestures that are horizontal at the threshold */
  axis?: "y" | "any";
  /** return false on pointerdown to ignore that pointer */
  filter?(target: Element, event: PointerEvent): boolean;
}

const DEFAULT_THRESHOLD = 3;
const SAMPLE_WINDOW = 100; // ms of pointer history kept for velocity
const NO_POINTER = -1;

type Sample = [timeStamp: number, clientY: number];
type Phase = "idle" | "pending" | "dragging";

/**
 * Attach to an element. Returns a detach function that removes every listener
 * and drops any in-flight pointer.
 */
export function attachDrag(
  el: HTMLElement,
  handlers: DragHandlers,
  options: DragOptions = {},
): () => void {
  const { threshold = DEFAULT_THRESHOLD, axis = "y", filter } = options;

  let phase: Phase = "idle";
  let pointerId = NO_POINTER;
  let startX = 0;
  let startY = 0;
  let target: EventTarget | null = null;
  let samples: Sample[] = [];

  // Releasing capture before clearing the id means the resulting
  // `lostpointercapture` arrives unrecognised — that is how our own releases
  // are told apart from the browser's.
  const reset = () => {
    if (phase !== "idle") {
      try {
        el.releasePointerCapture?.(pointerId);
      } catch {
        // nothing captured (jsdom, or the pointer is already gone)
      }
    }
    phase = "idle";
    pointerId = NO_POINTER;
    target = null;
    samples = [];
  };

  const track = (event: PointerEvent) => {
    const now = event.timeStamp;
    samples.push([now, event.clientY]);
    const cutoff = now - SAMPLE_WINDOW;
    while (samples.length > 1 && (samples[0]?.[0] ?? cutoff) < cutoff) {
      samples.shift();
    }
  };

  const velocity = () => {
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (!first || !last) return 0;
    const dt = last[0] - first[0];
    return dt === 0 ? 0 : (last[1] - first[1]) / dt;
  };

  const makeState = (
    event: PointerEvent,
    vy: number,
    cancelled: boolean,
  ): DragState => {
    const id = pointerId;
    return {
      dx: event.clientX - startX,
      dy: event.clientY - startY,
      vy,
      cancelled,
      target,
      event,
      // no-op once the pointer is over: a stale state cannot kill a new drag
      cancel: () => {
        if (pointerId === id) reset();
      },
    };
  };

  const onPointerDown = (event: PointerEvent) => {
    // a second pointer while one is active is ignored
    if (phase !== "idle") return;
    if (event.button !== 0 || !event.isPrimary) return;
    const from = event.target;
    if (filter && from instanceof Element && filter(from, event) === false) {
      return;
    }

    phase = "pending";
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    target = from;
    samples = [];
    track(event);
    try {
      el.setPointerCapture?.(event.pointerId);
    } catch {
      // jsdom has no pointer capture; drags outside `el` are then lost
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId || phase === "idle") return;

    track(event);
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (phase === "pending") {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
      // horizontal-dominant at the threshold: drop the pointer, and with it
      // every later move of the same gesture
      if (axis === "y" && Math.abs(dx) > Math.abs(dy)) {
        reset();
        return;
      }
      phase = "dragging";
      handlers.onStart?.(makeState(event, 0, false));
      return;
    }

    handlers.onMove?.(makeState(event, velocity(), false));
  };

  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    if (phase === "dragging") {
      track(event);
      handlers.onEnd?.(makeState(event, velocity(), false));
    }
    reset();
  };

  /** pointercancel, or capture lost to something other than our own release */
  const onPointerAbort = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    if (phase === "dragging") {
      handlers.onEnd?.(makeState(event, velocity(), true));
    }
    reset();
  };

  const listen = { passive: true } as const;
  el.addEventListener("pointerdown", onPointerDown, listen);
  el.addEventListener("pointermove", onPointerMove, listen);
  el.addEventListener("pointerup", onPointerUp, listen);
  el.addEventListener("pointercancel", onPointerAbort, listen);
  el.addEventListener("lostpointercapture", onPointerAbort, listen);

  return () => {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerAbort);
    el.removeEventListener("lostpointercapture", onPointerAbort);
    reset();
  };
}
