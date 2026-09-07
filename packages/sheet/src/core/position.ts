import { clamp } from "./env.ts";
import { byY, type ResolvedSnap } from "./snap.ts";

/** y of the tallest snap (0 = fully open). 0 when nothing resolved. */
export function topmostY(resolved: ResolvedSnap[]): number {
  let top = Number.POSITIVE_INFINITY;
  for (const snap of resolved) top = Math.min(top, snap.y);
  return Number.isFinite(top) ? top : 0;
}

/**
 * 0 when the sheet is fully closed, 1 at the tallest snap. Degenerate spans
 * (no snaps, or a snap that fills the view) report 0 only when fully closed.
 */
export function progressOf(
  y: number,
  viewHeight: number,
  resolved: ResolvedSnap[],
): number {
  const span = viewHeight - topmostY(resolved);
  if (span <= 0) return y >= viewHeight ? 0 : 1;
  return clamp((viewHeight - y) / span, 0, 1);
}

/**
 * The snap for a public index. Missing indices (dropped as invalid, or simply
 * out of range) fall back to the nearest surviving index — public indices never
 * shift, so `resolved` can be sparse.
 */
export function pickIndex(
  resolved: ResolvedSnap[],
  index: number,
): ResolvedSnap | undefined {
  const exact = resolved.find((snap) => snap.index === index);
  if (exact) return exact;

  let nearest: ResolvedSnap | undefined;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const snap of resolved) {
    const diff = Math.abs(snap.index - index);
    if (diff < bestDiff) {
      nearest = snap;
      bestDiff = diff;
    }
  }
  return nearest;
}

/**
 * One snap up (delta -1, taller sheet) or down (delta +1) in *height* order,
 * clamped at both ends. `byY` is y-descending, so the tallest snap is last.
 */
export function stepFrom(
  resolved: ResolvedSnap[],
  index: number,
  delta: number,
): ResolvedSnap | undefined {
  const order = byY(resolved);
  if (order.length === 0) return undefined;
  const at = order.findIndex((snap) => snap.index === index);
  if (at === -1) return order[0];
  return order[clamp(at - delta, 0, order.length - 1)];
}

/** Next snap in height order, wrapping back to the lowest. */
export function cycleFrom(
  resolved: ResolvedSnap[],
  index: number,
): ResolvedSnap | undefined {
  const order = byY(resolved);
  if (order.length === 0) return undefined;
  const at = order.findIndex((snap) => snap.index === index);
  return order[(at + 1) % order.length];
}
