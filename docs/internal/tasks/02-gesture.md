# Task 02 — `@snap-bottom-sheet/gesture`

Worker: W2. Branch: `w2/02-gesture` off `v1` (after task 00 is merged). Plan section: §3.2.

## Goal

A zero-dependency vertical drag recogniser on Pointer Events that replaces `@use-gesture/react` for this library. Reports delta + velocity, supports cancel, works with mouse/touch/pen, safe in jsdom and SSR. Framework-agnostic (no React import).

## Scope

Create `packages/gesture/` only, same shape as `packages/spring/` (see task 01: package.json with `private: true` and `exports` pointing at `./src/index.ts`, tsconfig, vitest config — **jsdom** environment here). If task 01's root-script change (`pnpm -r --filter './packages/*'`) has not landed yet, make the same change; the orchestrator resolves the trivial conflict.

## API (exact)

```ts
export interface DragState {
  dx: number;               // px since pointerdown (+ = right)
  dy: number;               // px since pointerdown (+ = down)
  vy: number;               // px/ms, computed from samples in the last 100 ms (0 on start)
  cancelled: boolean;       // true when ended by pointercancel or lostpointercapture
  target: EventTarget | null; // original pointerdown target
  event: PointerEvent;      // the event that produced this state
  cancel(): void;           // abandon: no further onMove/onEnd for this pointer
}

export interface DragHandlers {
  onStart?(s: DragState): void;   // fired once the threshold is passed (not on pointerdown)
  onMove?(s: DragState): void;
  onEnd?(s: DragState): void;     // pointerup after onStart, or cancel by the browser (cancelled: true)
}

export interface DragOptions {
  threshold?: number;             // px of movement before onStart; default 3
  axis?: "y" | "any";             // "y" (default): if |dx| > |dy| when the threshold is crossed, the gesture is ignored
  filter?(target: Element, event: PointerEvent): boolean;  // return false on pointerdown to ignore this pointer
}

/** Attach to an element. Returns a detach function that removes every listener and drops any in-flight pointer. */
export function attachDrag(el: HTMLElement, handlers: DragHandlers, options?: DragOptions): () => void;
```

## Behaviour

- Listen to `pointerdown` on `el`; `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture` on `el` after capture. Use `el.setPointerCapture?.(event.pointerId)` inside `try/catch` (jsdom has no pointer capture; real browsers keep receiving moves outside the element).
- Ignore: non-primary buttons (`event.button !== 0`), `!event.isPrimary`, a second pointer while one is active, `filter` returning false.
- Threshold: before `onStart`, track movement; once `max(|dx|,|dy|) >= threshold` decide: `axis: "y"` and `|dx| > |dy|` → ignore this pointer entirely (release capture, no callbacks); otherwise fire `onStart` with the current state, then `onMove` for each subsequent move.
- Velocity: keep `(t, y)` samples; drop samples older than 100 ms; `vy = (y_last - y_first) / (t_last - t_first)`; `0` if fewer than 2 samples or `dt === 0`. Use `event.timeStamp`.
- `cancel()` from inside a handler: stop tracking this pointer, release capture, no `onEnd`.
- `pointercancel` / `lostpointercapture` (when not caused by our own release) after `onStart` → `onEnd` with `cancelled: true`.
- Never call `preventDefault` — CSS `touch-action` is the caller's responsibility (PLAN §3.2 explains the model). Do not set any styles.
- All listeners added with `{ passive: true }` except none needed otherwise. Detach removes everything and resets state.
- SSR: module must not reference `window`/`document` at import time.
- ≤ 200 LOC in `src/index.ts`.

## Tests (`test/drag.test.ts`, jsdom)

Helper: `fire(el, type, { clientX, clientY, pointerId = 1, button = 0, isPrimary = true, timeStamp })` dispatching `new PointerEvent(type, { bubbles: true, ... })` — if jsdom's `PointerEvent` lacks `timeStamp` control, stub `performance.now`/`Date.now` and assert velocities with a tolerance.

1. pointerdown + move of 2 px → no callbacks (threshold 3).
2. down (0,0), move (0,10) → `onStart` once with `dy=10`, then move (0,25) → `onMove` with `dy=25`; up → `onEnd` with `dy=25`, `cancelled=false`.
3. Horizontal-dominant at threshold (`dx=10, dy=2`) → no callbacks at all, and a later vertical move of the same pointer is still ignored.
4. `axis: "any"` accepts the horizontal case from (3).
5. Velocity: moves at t=0 y=0, t=50 y=50, t=100 y=100 → `vy ≈ 1` px/ms (±0.05); after a 200 ms pause and one more move, old samples are dropped.
6. `button: 2` pointerdown ignored; `isPrimary: false` ignored; a second `pointerId` while the first is active ignored (no second `onStart`).
7. `filter` returning false ignores the pointer.
8. `cancel()` inside `onMove` → no `onEnd`; a new pointerdown afterwards starts a fresh gesture.
9. `pointercancel` after start → `onEnd` with `cancelled: true`.
10. Detach: after calling the returned function, events produce no callbacks; `el` has no leftover listeners (spy on `removeEventListener` or dispatch and assert silence).
11. Importing the module in a `// @vitest-environment node` test file does not throw.

## Done when

```
pnpm --filter @snap-bottom-sheet/gesture typecheck
pnpm --filter @snap-bottom-sheet/gesture test
pnpm lint
wc -l packages/gesture/src/index.ts     # ≤ 200
```

Commit: `feat(gesture): pointer drag primitive`.

## Report

Worker report template (PLAN §4.1). State whether jsdom supported `PointerEvent` natively or you polyfilled it in the test file.
