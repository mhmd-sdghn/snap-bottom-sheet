# Task 03 — core pure modules (snap math, scroll lock, measurement) + React state hooks

Worker: W3. Branch: `w3/03-core-pure` off `v1` (after task 00 is merged). Plan sections: §2.1, §3.3–3.5. Audit items fixed here: P0-1, P0-2, P0-3, P0-4, P0-6, P1-1, P1-6, P1-9, P1-10.

## Goal

The pure half of the framework-agnostic core (PLAN §2.2): everything that can be unit-tested without a sheet controller or rendering, plus two React hooks the bindings will need. Task 04 (core controller) and task 07 (React bindings) build on these exact exports, so **the signatures below are a contract** — implement them as written; record any deviation in the report's Assumptions. `src/core/**` must not import React.

## Scope

New files only, inside `packages/sheet/`:

```
src/core/snap.ts
src/core/scroll-lock.ts
src/core/measure.ts
src/core/env.ts
src/react/use-controllable-state.ts
src/react/use-isomorphic-layout-effect.ts
test/core/snap.test.ts
test/core/scroll-lock.test.ts
test/core/measure.test.ts
test/react/use-controllable-state.test.tsx
```

Do not modify or import the legacy files (`utils.ts`, `types.ts`, `constants.ts`, `components/**`, `hooks/**`, `events/**`, `context/**`) — they are deleted in task 04. Do not touch `src/index.ts` yet.

## Contracts

### `src/core/env.ts`

```ts
export const isBrowser = (): boolean => typeof document !== "undefined";   // replaces the fragile isSSR() (P1-6)
export const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));
export function warnOnce(key: string, message: string): void;              // dev-only (process.env.NODE_ENV !== "production"), console.warn once per key
```

### `src/core/snap.ts` (no DOM, no React)

```ts
export type SnapValue = number | `${number}%` | `${number}px` | "header" | "content";
export interface SnapPointConfig {
  value: SnapValue;
  scroll?: boolean;
  drag?: boolean | { up?: boolean; down?: boolean };
}
export type SnapPoint = SnapValue | SnapPointConfig;

export interface MeasureContext {
  viewHeight: number;     // px available to the sheet (window.innerHeight or container height)
  headerHeight: number;   // measured <Sheet.Header>; 0 if absent/unmeasured
  contentHeight: number;  // measured natural content height; 0 if unmeasured
}

export interface ResolvedSnap {
  index: number;          // position in the consumer's array — the public index
  point: SnapPoint;       // the original entry
  height: number;         // px of sheet visible at this snap, 0 < height <= viewHeight
  y: number;              // viewHeight - height (0 = fully open)
  scroll: boolean;
  drag: { up: boolean; down: boolean };
}

/** steps(3) → [1/3, 2/3, 1]; steps(4, { from: 0.25, to: 1 }) → [0.25, 0.5, 0.75, 1]. count < 1 → []. */
export function steps(count: number, opts?: { from?: number; to?: number }): number[];

export function normalize(point: SnapPoint): Required<Pick<SnapPointConfig, "value">> & { scroll: boolean; drag: { up: boolean; down: boolean } };

/** px height for one value, or NaN when invalid. Fractions/percent use viewHeight; "header"/"content" read ctx. Result capped to viewHeight. */
export function toHeight(value: SnapValue, ctx: MeasureContext): number;

/**
 * Resolve in consumer order. Entries whose height is NaN, <= 0, or (for "header"/"content") still unmeasured (0)
 * are dropped with warnOnce — EXCEPT that an unmeasured "header"/"content" resolves to height = viewHeight * 0.5 as a
 * placeholder so the sheet has a position on first paint (the real value replaces it on the next measurement).
 * Duplicate heights are kept (indices must stay stable).
 */
export function resolveSnapPoints(points: SnapPoint[], ctx: MeasureContext): ResolvedSnap[];

/** Copy sorted by y descending (lowest sheet first). */
export function byY(resolved: ResolvedSnap[]): ResolvedSnap[];

/** Nearest by |y - target|; undefined for []. Ties → the smaller height (closer to closed). */
export function closest(resolved: ResolvedSnap[], y: number): ResolvedSnap | undefined;

/** y + vy * projectionMs. vy in px/ms. */
export function project(y: number, vy: number, projectionMs?: number /* 200 */): number;

/** true when points is empty or every entry's value is "content". */
export function isContentMode(points: SnapPoint[]): boolean;

/**
 * Release decision. lowest = byY(resolved)[0]. Returns { close: true } when dismissible and projectedY exceeds
 * lowest.y by more than min(80, lowest.height * 0.25); otherwise { close: false, snap: closest(...) }.
 */
export function decideRelease(args: {
  y: number; vy: number; resolved: ResolvedSnap[]; dismissible: boolean; projectionMs?: number;
}): { close: true } | { close: false; snap: ResolvedSnap };
```

Value parsing rules (P1-9, P1-10): number `0 < n <= 1` → fraction; `n > 1` → px; `n <= 0`, `NaN`, `Infinity` → invalid. `"50%"` → fraction (strings are parsed with `parseFloat` and a suffix check; `"abc"`, `"50"`, `"50 %"` → invalid). `"200px"` → px. Every result is `Math.min(Math.round(h), viewHeight)`, and `viewHeight <= 0` makes everything invalid.

### `src/core/scroll-lock.ts` (fixes P0-6)

```ts
/** Reference-counted. First call saves + sets styles on <html> and <body>; the returned release restores them when the count reaches 0. Calling a release twice is a no-op. */
export function lockBodyScroll(): () => void;
export function isBodyScrollLocked(): boolean;   // for tests
```

Sets `overflow: hidden`, `overscroll-behavior: none` on both elements and `padding-right: <scrollbar gap>px` on `body` (gap = `window.innerWidth - document.documentElement.clientWidth`, only if > 0). Saves the *previous inline values* and restores exactly those (including empty string). No-op when `!isBrowser()`.

### `src/core/measure.ts`

```ts
/** Shared ResizeObserver (one per document). Calls cb(el.offsetHeight) immediately and on every resize. Returns unobserve. */
export function observeHeight(el: Element, cb: (height: number) => void): () => void;
/** View height: container ? container.offsetHeight (observed) : window.innerHeight (resize + visualViewport resize when available). Immediate first call. */
export function observeViewHeight(container: HTMLElement | null, cb: (height: number) => void): () => void;
```

Port the singleton logic from the legacy `hooks/useWatchHeight.ts` (one observer, `Map<Element, Set<cb>>`), drop the classes for plain module-level state, and add a `ResizeObserver`-missing fallback (call once, no observation). Never touch `window` at import time.

### `src/react/use-controllable-state.ts` (Radix pattern)

```ts
export function useControllableState<T>(args: {
  prop: T | undefined;
  defaultProp: T;
  onChange?: (next: T) => void;
}): [T, (next: T | ((prev: T) => T)) => void];
```

Controlled when `prop !== undefined`: setter only calls `onChange` (no internal state change). Uncontrolled: internal state + `onChange`. `onChange` is not called when the value is unchanged. Setter identity is stable. Uses a ref for the latest `onChange` (no stale closure).

### `src/react/use-isomorphic-layout-effect.ts`

`export const useIsomorphicLayoutEffect = isBrowser() ? useLayoutEffect : useEffect;` (import `isBrowser` from `../core/env.ts`).

## Tests (table-driven where possible)

`snap.test.ts` — at minimum:
- `toHeight`: `0.5`/`"50%"` → 400 @ viewHeight 800; `600` / `"600px"` → 600; `1200` → capped 800; `0`, `-1`, `NaN`, `"50"`, `"abc"` → NaN; `"header"` → headerHeight; `"content"` → contentHeight capped.
- **P0-1 regression**: `resolveSnapPoints([0.9, 0.3], ctx)` keeps `index` 0 → 0.9 (y = 80) and 1 → 0.3 (y = 560); `byY` returns `[index 1, index 0]`; `closest(resolved, 550)` returns `index: 1`.
- **P0-2 regression**: `["content", 0.5]` with `contentHeight 200`, `viewHeight 800`: `resolved[0].y === 600` (not 800); `closest(resolved, 550)` → index 0.
- Unmeasured `"content"` (0) → placeholder height 400, no throw; `"header"` same.
- `normalize`: `0.5` → `{ value: 0.5, scroll: false, drag: { up: true, down: true } }`; `{ value: 0.5, drag: false }` → both false; `{ drag: { down: false } }` → `{ up: true, down: false }`.
- `steps(3)` → `[1/3, 2/3, 1]` (toBeCloseTo); `steps(0)` → `[]`; `steps(2, { from: 0.5 })` → `[0.5, 1]`.
- `decideRelease`: lowest at y 560 (height 240): `y 600, vy 0` → close false (delta 40 < 60); `y 650, vy 0` → close true (90 > 60); `y 580, vy 0.5` → projected 680 → close true; `dismissible: false` → never closes, snaps to lowest; upward fling from the lowest snap (`vy -1`) lands on the upper snap.
- `isContentMode([])`, `(["content"])`, `([{ value: "content" }])` → true; `(["content", 0.5])` → false.

`scroll-lock.test.ts`: two locks then one release keeps `overflow: hidden`; second release restores the *pre-existing* inline `overflow: scroll` and `padding-right` values; double release is a no-op; `isBodyScrollLocked()` tracks.

`measure.test.ts`: stub `ResizeObserver` with a fake that records observed elements and lets the test trigger callbacks; two observers on the same element share one `observe` call; unobserving the last callback calls `unobserve`; `observeViewHeight(null)` fires immediately with `window.innerHeight` and again on `resize`.

`use-controllable-state.test.tsx` (RTL `renderHook`): uncontrolled updates state + calls onChange; controlled does not change returned value but calls onChange; functional updater works; unchanged value does not call onChange.

## Done when

```
pnpm --filter snap-bottom-sheet typecheck
pnpm --filter snap-bottom-sheet test
pnpm lint
```

Commit: `feat(core): snap resolution, scroll lock, measurement modules` — body cites the audit items fixed. If vitest's `include` in packages/sheet/vitest.config.ts does not already match nested `test/**/*.test.{ts,tsx}`, widen it.

## Report

Worker report template (PLAN §4.1). List every exported symbol with its final signature if it differs from this file.
