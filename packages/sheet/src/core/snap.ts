import { warnOnce } from "./env.ts";

export type SnapValue =
  | number
  | `${number}%`
  | `${number}px`
  | "header"
  | "content";

export interface SnapPointConfig {
  value: SnapValue;
  scroll?: boolean;
  drag?: boolean | { up?: boolean; down?: boolean };
}

export type SnapPoint = SnapValue | SnapPointConfig;

export interface MeasureContext {
  /** px available to the sheet (window.innerHeight or container height). */
  viewHeight: number;
  /** measured <Sheet.Header>; 0 if absent or not yet measured. */
  headerHeight: number;
  /** measured natural content height; 0 if not yet measured. */
  contentHeight: number;
}

export interface ResolvedSnap {
  /** Position in the consumer's array — the public index. */
  index: number;
  point: SnapPoint;
  /** px of sheet visible at this snap, 0 < height <= viewHeight. */
  height: number;
  /** viewHeight - height (0 = fully open). */
  y: number;
  scroll: boolean;
  drag: { up: boolean; down: boolean };
}

export interface NormalizedSnap {
  value: SnapValue;
  scroll: boolean;
  drag: { up: boolean; down: boolean };
}

const DEFAULT_PROJECTION_MS = 200;
const CLOSE_THRESHOLD_PX = 80;
const CLOSE_THRESHOLD_RATIO = 0.25;
/** Height used for a "header"/"content" snap that has not been measured yet. */
const UNMEASURED_RATIO = 0.5;

const PERCENT = /^\d*\.?\d+%$/;
const PIXELS = /^\d*\.?\d+px$/;

const isConfig = (point: SnapPoint): point is SnapPointConfig =>
  typeof point === "object" && point !== null && "value" in point;

/**
 * Evenly spaced fractions: steps(3) → [1/3, 2/3, 1];
 * steps(4, { from: 0.25, to: 1 }) → [0.25, 0.5, 0.75, 1]. count < 1 → [].
 */
export function steps(
  count: number,
  opts?: { from?: number; to?: number },
): number[] {
  if (!Number.isFinite(count) || count < 1) return [];
  const n = Math.floor(count);
  const to = opts?.to ?? 1;
  const from = opts?.from ?? to / n;
  if (n === 1) return [from];
  const stride = (to - from) / (n - 1);
  return Array.from({ length: n }, (_, i) => from + i * stride);
}

export function normalize(point: SnapPoint): NormalizedSnap {
  if (!isConfig(point)) {
    return { value: point, scroll: false, drag: { up: true, down: true } };
  }
  const { drag } = point;
  return {
    value: point.value,
    scroll: point.scroll ?? false,
    drag:
      typeof drag === "object" && drag !== null
        ? { up: drag.up ?? true, down: drag.down ?? true }
        : { up: drag ?? true, down: drag ?? true },
  };
}

/**
 * px height for one value, or NaN when invalid. Fractions/percent are relative
 * to viewHeight; "header"/"content" read ctx. The result is capped to viewHeight.
 */
export function toHeight(value: SnapValue, ctx: MeasureContext): number {
  const { viewHeight } = ctx;
  if (!Number.isFinite(viewHeight) || viewHeight <= 0) return Number.NaN;

  let height: number;

  // "header"/"content" may legitimately be 0 (not measured yet); every other
  // value must resolve to a positive height to be usable.
  if (value === "header" || value === "content") {
    height = value === "header" ? ctx.headerHeight : ctx.contentHeight;
    if (!Number.isFinite(height) || height < 0) return Number.NaN;
    return Math.min(Math.round(height), viewHeight);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return Number.NaN;
    height = value <= 1 ? value * viewHeight : value;
  } else if (typeof value === "string" && PERCENT.test(value)) {
    height = (Number.parseFloat(value) / 100) * viewHeight;
  } else if (typeof value === "string" && PIXELS.test(value)) {
    height = Number.parseFloat(value);
  } else {
    return Number.NaN;
  }

  if (!Number.isFinite(height) || height <= 0) return Number.NaN;
  return Math.min(Math.round(height), viewHeight);
}

/**
 * Resolve in consumer order. Entries whose height is NaN or <= 0 are dropped
 * with a dev warning — except that an unmeasured "header"/"content" resolves to
 * viewHeight * 0.5 as a placeholder so the sheet has a position on first paint
 * (the real value replaces it on the next measurement).
 *
 * The result may be shorter than `points` and non-contiguous in `index`:
 * public indices never shift because a neighbour was invalid. Duplicate heights
 * are kept.
 */
export function resolveSnapPoints(
  points: SnapPoint[],
  ctx: MeasureContext,
): ResolvedSnap[] {
  const { viewHeight } = ctx;
  const resolved: ResolvedSnap[] = [];

  points.forEach((point, index) => {
    const { value, scroll, drag } = normalize(point);
    let height = toHeight(value, ctx);

    const measured = value === "header" || value === "content";
    if (measured && !(height > 0) && viewHeight > 0) {
      height = Math.round(viewHeight * UNMEASURED_RATIO);
    }

    if (!(height > 0)) {
      warnOnce(
        `snap:${String(value)}`,
        `Invalid snap point ${JSON.stringify(value)} — dropped.`,
      );
      return;
    }

    resolved.push({
      index,
      point,
      height,
      y: viewHeight - height,
      scroll,
      drag,
    });
  });

  return resolved;
}

/** Copy sorted by y descending (lowest sheet first). */
export function byY(resolved: ResolvedSnap[]): ResolvedSnap[] {
  return [...resolved].sort((a, b) => b.y - a.y);
}

/** Nearest by |y - target|; undefined for []. Ties → the smaller height. */
export function closest(
  resolved: ResolvedSnap[],
  y: number,
): ResolvedSnap | undefined {
  let best: ResolvedSnap | undefined;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (const snap of resolved) {
    const diff = Math.abs(snap.y - y);
    if (diff < bestDiff || (diff === bestDiff && best && snap.y > best.y)) {
      best = snap;
      bestDiff = diff;
    }
  }

  return best;
}

/** y + vy * projectionMs. vy in px/ms. */
export function project(
  y: number,
  vy: number,
  projectionMs: number = DEFAULT_PROJECTION_MS,
): number {
  return y + vy * projectionMs;
}

/** True when points is empty or every entry's value is "content". */
export function isContentMode(points: SnapPoint[]): boolean {
  return points.every((point) => normalize(point).value === "content");
}

/**
 * Release decision. Closes when dismissible and the projected position falls
 * below the lowest snap by more than min(80, 25% of its height).
 * resolved.length === 0 → { close: true } regardless of dismissible.
 */
export function decideRelease(args: {
  y: number;
  vy: number;
  resolved: ResolvedSnap[];
  dismissible: boolean;
  projectionMs?: number;
}): { close: true } | { close: false; snap: ResolvedSnap } {
  const { y, vy, resolved, dismissible, projectionMs } = args;

  const lowest = byY(resolved)[0];
  if (!lowest) return { close: true };

  const projected = project(y, vy, projectionMs);
  const threshold = Math.min(
    CLOSE_THRESHOLD_PX,
    lowest.height * CLOSE_THRESHOLD_RATIO,
  );

  if (dismissible && projected - lowest.y > threshold) return { close: true };

  return { close: false, snap: closest(resolved, projected) ?? lowest };
}
