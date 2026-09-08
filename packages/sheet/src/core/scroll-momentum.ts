/**
 * The tail of a content fling. The drag layer scrolls `Sheet.Body` itself
 * while the finger is down (PLAN §3.4), so the browser's own momentum never
 * runs and we have to provide it.
 *
 * Exponential decay, iOS-like: the velocity loses a fixed fraction per
 * millisecond, so a flick coasts for about 1.5 s. It stops dead at both ends
 * of the list — no rubber-band, and never any movement of the sheet itself.
 */

import { clamp } from "./env.ts";

/** ms for the velocity to fall to 1/e. */
const DecayMs = 325;
/** px/ms below which the fling is over. */
const MinVelocity = 0.02;
/** Frames longer than this (tab switch, breakpoint) are clamped. */
const MaxFrameMs = 64;

/**
 * Coast `el.scrollTop` from `velocity` (px/ms, positive = the content moves
 * up, as `scrollTop` grows). Returns the canceller; calling it after the fling
 * has finished by itself is safe.
 */
export function startScrollMomentum(
  el: HTMLElement,
  velocity: number,
): () => void {
  if (typeof requestAnimationFrame !== "function") return () => {};
  if (!(Math.abs(velocity) >= MinVelocity)) return () => {};

  let v = velocity;
  let last = 0;
  let handle: number | null = null;

  const tick = (time: number) => {
    handle = null;
    // The first frame has nothing to measure against; one frame's worth of
    // decay is closer than the whole time origin would be.
    const elapsed = last === 0 ? 16 : Math.min(time - last, MaxFrameMs);
    last = time;

    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    const next = el.scrollTop + v * elapsed;
    if (next <= 0 || next >= max) {
      el.scrollTop = clamp(next, 0, max);
      return;
    }
    el.scrollTop = next;
    v *= Math.exp(-elapsed / DecayMs);
    if (Math.abs(v) < MinVelocity) return;
    handle = requestAnimationFrame(tick);
  };

  handle = requestAnimationFrame(tick);

  return () => {
    if (handle === null) return;
    cancelAnimationFrame(handle);
    handle = null;
  };
}
