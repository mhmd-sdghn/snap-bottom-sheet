# Task 04 — core controller (`createSheet`)

Worker: W1. Branch: `w1/04-core-controller` off `v1` (after tasks 01, 02, 03 are merged). Plan sections: §2.1, §2.2, §3.1–3.7. Audit items fixed here: P0-3, P0-5, P0-8, P1-3, P1-5, P1-11, P1-22, P1-23 and the a11y / velocity / controlled-state gaps in AUDIT §4.

> DRAFT — the orchestrator finalises this file after Phase 1 merges (exact module paths/exports of spring, gesture and core pure modules get pasted in). Do not start before "TASK 04 — go".

## Goal

The framework-agnostic engine. Given DOM elements the consumer rendered, `createSheet` drives position (spring), input (gesture, keyboard, overlay click), measurement (header/content/view height), scroll lock, accessibility and the styling hooks — and exposes a small controller. Vanilla JS consumers use it directly; task 07 wraps it for React. Nothing in `src/core/**` imports React.

## Scope

```
packages/sheet/src/core/sheet.ts          createSheet + controller (may split helpers into sibling files if > ~350 LOC)
packages/sheet/src/core/dom.ts            style/attr writers (base styles once, per-frame vars, data-*), inert + focus helpers
packages/sheet/src/core/keyboard.ts       Escape / handle keys
packages/sheet/src/index.ts               REWRITE: core entry — export createSheet, steps, and public types only
packages/sheet/test/core/sheet.test.ts    controller behaviour (jsdom)
packages/sheet/test/core/dom.test.ts
packages/sheet/tsdown.config.ts           entries { index, "react/index" } — the react entry may point at a placeholder `src/react/index.ts` exporting nothing until task 07 (create it if absent). Banner `"use client";` only on the react chunk.
packages/sheet/package.json               exports "." and "./react"; remove @react-spring/web + @use-gesture/react; react/react-dom peers optional via peerDependenciesMeta; add workspace deps on @snap-bottom-sheet/spring + gesture
biome.json                                delete the legacy override added in task 00
```

Delete the legacy engine: `src/components/**`, `src/hooks/**`, `src/events/**`, `src/context/**`, `src/utils.ts`, `src/types.ts`, `src/constants.ts`, and `test/index.test.ts` (the 0.x smoke test). `playgrounds/react` will be broken until task 08 — acceptable; note it in the report.

## Contract

Implement PLAN §2.2 exactly (`SheetElements`, `SheetOptions`, `SheetState`, `SheetController`, `createSheet`). Additional required behaviour:

**Attach (`createSheet`)**
- Throws `TypeError` if `elements.content` is missing. Everything else optional.
- Writes base styles on `content` once: `position: fixed|absolute` (absolute when `container` is given), `top/left/right: 0`, `height: 100dvh` (container → `100%`), `display: flex`, `flex-direction: column`, `box-sizing: border-box`, `touch-action: none`, `overscroll-behavior: none`, `transform: translate3d(0, <viewHeight>px, 0)`, `data-state="closed"`, `role="dialog"`, `aria-modal` (when modal), `aria-labelledby/-describedby` from options, `tabindex="-1"` if `content` has none.
- `overlay`: `data-state`, `aria-hidden="true"`, click → `close()` when `dismissible`. `body`: base `min-height: 0`, `overscroll-behavior: contain`; per active snap `overflow-y: auto; flex: 1 1 auto` when `scroll`, else `overflow: hidden; flex: 0 0 auto`. `handle`: `aria-label="Resize sheet"` if none, keyboard handlers.
- Observers: `observeHeight(header)`, `observeHeight(content-inner)` for `"content"` — content-inner = the first element child of `content` if it has exactly one, else `content` itself (document this; React wraps children in one div), `observeViewHeight(container)`. Resolve snap points on every change; if the active snap's y changed → `snapTo(current, { immediate: dragging || viewHeightChanged })`.
- Gesture: `attachDrag(content, …, { filter })` with the filter rejecting targets inside `[data-snap-sheet-no-drag]`, `<select>`, and while `document.getSelection()?.type === "Range"`. Implement PLAN §3.4 rules 1–4 using `project`/`decideRelease`/`closest` from `core/snap.ts`. Blur a focused input/textarea inside `content` on drag start. Live drag: `spring.set(y, { immediate: true })`.
- Release: `decideRelease` → `close()` or `snapTo(snap.index)` with `velocity: vy` passed to the spring. `onDragEnd(targetIndex | -1)` fires before the animation starts.
- `snapTo(i)`: clamps to valid indices (warnOnce when out of range), updates `snapIndex`, fires `onSnapIndexChange` **only if the index changed**, animates, applies body overflow + padding-bottom + `data-snap-index` at rest, then resolves.
- `open()`: `lockBodyScroll()` (when modal) + `inert` on siblings of the sheet's root element inside `container`/`document.body` (skip elements that already have `inert`, restore only those we set) + focus first focusable in `content` (fallback `content`) remembering `document.activeElement`; animate from closed y (or `skipInitialAnimation` → immediate) to the active snap; `data-state="open"` immediately; `onAnimationEnd(true)` at rest. `close()`: reverse; restore focus, release lock, remove inert; `data-state="closed"` after the animation rests (so CSS can transition); `onOpenChange(false)` when initiated by dismiss; `onAnimationEnd(false)`.
- Per-frame writer (spring subscriber): `transform`, `--snap-sheet-y: <y>px`, `--snap-sheet-progress` on `content` and on `container ?? document.documentElement`? — **no**: write progress on `content` and on `overlay` (if given) only; do not touch the document root. `data-dragging` toggled at drag start/end.
- `reducedMotion === true || (=== "system" && matchMedia("(prefers-reduced-motion: reduce)").matches)` → every animation immediate.
- Escape (when `dismissible && modal`): listener on `document` **only while open**; `stopPropagation` so an outer nested sheet does not also close.
- `update(options)`: merge, re-resolve, reapply modal/dismissible/aria changes; changing `modal` while open toggles lock + inert.
- `destroy()`: detach everything, cancel spring, restore inert/focus/lock if open, remove the styles/attributes we set (keep consumer's), null out references. Idempotent.
- `subscribe` notifies on any `SheetState` change (not per frame for `y` — notify `y`/`progress` at most once per animation frame via the spring subscriber).

**Nested sheets (P0-5, §3.7)**: no ids, no `querySelector`; `onStart` of the drag calls `event.stopPropagation()`; scroll lock is refcounted; Escape handled innermost-first via `stopPropagation` — verify with two controllers in one test.

## Tests (jsdom; stub `ResizeObserver`, `requestAnimationFrame` as in task 01, `matchMedia`)

1. Attach writes base styles + `data-state="closed"`, `role="dialog"`; `destroy()` removes them and detaches listeners.
2. `open()` → after timers: `data-state="open"`, `transform` targets y of `defaultSnapIndex`, body locked, siblings inert, focus inside; `close()` reverses all of it and `onAnimationEnd(false)` fired once.
3. Snap resolution respects consumer order (`[0.9, 0.3]`, defaultSnapIndex 0 → y = viewHeight·0.1) — P0-1 at controller level.
4. `"content"` snap re-animates when the measured height changes while active; does **not** move when a different snap is active.
5. Drag release: synthesize pointer events (helpers from packages/gesture tests) — slow drag 100 px down from the top snap of `[0.3, 0.9]` → lands on index 0; fling `vy = -2` from index 0 → index 1; drag 90 px below the lowest (dismissible) → closes and `onOpenChange(false)`; same with `dismissible: false` → stays at lowest.
6. `drag: { down: false }` on the active snap ignores downward movement; `scroll: true` + `body.scrollTop = 50` + pull down → no drag (body scroll wins); `scrollTop = 0` + pull down → drag.
7. Escape closes when modal+dismissible, not otherwise; with two nested controllers only the inner closes.
8. `update({ snapPoints })` clamps `snapIndex`, animates to the new y, fires `onSnapIndexChange` only on index change.
9. Reduced motion (`matchMedia` matches) → `open()` resolves synchronously-ish (no rAF frames needed).
10. `import "../src/index.ts"` in a `// @vitest-environment node` test does not throw (SSR safety).
11. `padding-bottom` equals the active y at rest, and Body has `overflow-y: auto` only at `scroll: true` snaps (P0-8).

## Done when

```
pnpm --filter snap-bottom-sheet typecheck
pnpm --filter snap-bottom-sheet test
pnpm lint
pnpm build            # dist/index.js, dist/index.d.ts, dist/react/index.js (placeholder), dist/react/index.d.ts
pnpm verify:pkg
grep -c "react-spring\|use-gesture" packages/sheet/dist/index.js   # 0
head -1 packages/sheet/dist/react/index.js                          # "use client";
```

Commits: `feat(core)!: framework-agnostic sheet controller (createSheet)` (+ `chore(sheet): drop react-spring and use-gesture` if you prefer two commits: deletion first, then feature).

## Report

Worker report template. Include `wc -l` of every new core file and the list of exported symbols from `src/index.ts`.
