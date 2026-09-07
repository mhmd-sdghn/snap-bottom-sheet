# Task 04 — core controller (`createSheet`)

Worker: W1. Branch: `w1/04-core-controller` off `v1` (after tasks 01, 02, 03 are merged). Plan sections: §2.1, §2.2, §3.1–3.7. Audit items fixed here: P0-3, P0-5, P0-8, P1-3, P1-5, P1-11, P1-22, P1-23 and the a11y / velocity / controlled-state gaps in AUDIT §4.

> FINAL. Inputs merged on `v1`: `@snap-bottom-sheet/spring` (`createSpring`, PLAN §3.1 — `stop()` sets `target = value`; `set()` on an at-rest spring resolves `true` synchronously), `@snap-bottom-sheet/gesture` (`attachDrag`, PLAN §3.2 — no DOM writes, `filter(target, event)`), and `src/core/{env,snap,scroll-lock,measure}.ts` from task 03 with these facts: `normalize()` returns the exported `NormalizedSnap`; `toHeight()` returns **0** (not NaN) for an unmeasured `"header"`/`"content"` — test `> 0`; `resolveSnapPoints` substitutes a `viewHeight * 0.5` placeholder for unmeasured header/content; `closest` ties → larger y; `decideRelease([])` → `{ close: true }`; `observeViewHeight(null, cb)` does **not** call `cb` outside the browser; `lockBodyScroll()` is refcounted module state. Do not start before "TASK 04 — go".

## Goal

The framework-agnostic engine. Given DOM elements the consumer rendered, `createSheet` drives position (spring), input (gesture, keyboard, overlay click), measurement (header/content/view height), scroll lock, accessibility and the styling hooks — and exposes a small controller. Vanilla JS consumers use it directly; task 07 wraps it for React. Nothing in `src/core/**` imports React.

## Scope

```
packages/sheet/src/core/sheet.ts          createSheet + controller (split helpers into sibling files when a file passes ~200 LOC; comments are not budgeted)
packages/sheet/test/helpers/pointer.ts     FakePointerEvent (extends MouseEvent, adds pointerId/isPrimary, settable timeStamp) + fire() helper, hoisted from packages/gesture/test/drag.test.ts
packages/sheet/src/core/dom.ts            style/attr writers (base styles once, per-frame vars, data-*), inert + focus helpers
packages/sheet/src/core/keyboard.ts       Escape / handle keys
packages/sheet/src/index.ts               REWRITE: core entry — export createSheet, steps, and public types only
packages/sheet/test/core/sheet.test.ts    controller behaviour (jsdom)
packages/sheet/test/core/dom.test.ts
packages/sheet/tsdown.config.ts           entries { index, "react/index" } (W2's branch already has src/react/index.ts; if absent on yours, a placeholder). Banner `"use client";` on the react chunk ONLY: `outputOptions: { banner: (chunk) => chunk.fileName.startsWith("react/") ? '"use client";' : "" }` — a string banner is per-build and leaks into dist/index.js (verified by W2). Done-when checks both heads.
packages/sheet/package.json               exports "." and "./react"; remove @react-spring/web + @use-gesture/react; react/react-dom peers optional via peerDependenciesMeta; add workspace deps on @snap-bottom-sheet/spring + gesture
biome.json                                delete the legacy override added in task 00
```

Delete the legacy engine: `src/components/**`, `src/hooks/**`, `src/events/**`, `src/context/**`, `src/utils.ts`, `src/types.ts`, `src/constants.ts`, and `test/index.test.ts` (the 0.x smoke test). `playgrounds/react` will be broken until task 08 — acceptable; note it in the report.

## Contract

Implement PLAN §2.2 exactly (`SheetElements`, `SheetOptions`, `SheetState`, `SheetController` **including `setElements`**, `createSheet`). Additional required behaviour:

**Attach (`createSheet`)**
- Throws `TypeError` if `elements.content` is missing. Everything else optional.
- Writes base styles on `content` once: `position: fixed|absolute` (absolute when `container` is given), `top/left/right: 0`, `height: 100dvh` (container → `100%`), `display: flex`, `flex-direction: column`, `box-sizing: border-box`, `touch-action: none`, `overscroll-behavior: none`, `transform: translate3d(0, <viewHeight>px, 0)`, `data-state="closed"`, `role="dialog"`, `aria-modal` (when modal), `aria-labelledby/-describedby` from options, `tabindex="-1"` if `content` has none.
- `overlay`: `data-state`, `aria-hidden="true"`, click → `close()` when `dismissible`. `body`: base `min-height: 0`, `overscroll-behavior: contain`; per active snap `overflow-y: auto; flex: 1 1 auto` when `scroll`, else `overflow: hidden; flex: 0 0 auto`. `handle`: `aria-label="Resize sheet"` if none, keyboard handlers.
- Observers: `observeHeight(header)`, `observeHeight(inner)` for `"content"` where `inner = content.querySelector(":scope > [data-snap-sheet-inner]") ?? (content.children.length === 1 ? content.firstElementChild : content)` (PLAN §2.2 contract), `observeViewHeight(container)`.
- `setElements(partial)`: for each key present, detach whatever was wired to the old element (observer, listeners, styles/attrs we set), wire the new one (or nothing for `null`), re-resolve snap points; `content` and `container` changes throw `TypeError` (recreate instead). Spring position is untouched.
- Post-`destroy()` calls: every method is a no-op; `open/close/snapTo` resolve immediately; `destroy()` itself idempotent.
- `getState()` returns the same object reference until state changes (build a new frozen object on change). Callbacks fire after internal state is updated; re-entrant `open()`/`snapTo()` from inside `onOpenChange`/`onSnapIndexChange` must work (React bounces a controlled veto that way) — test it: `onOpenChange: (o) => { if (!o) ctrl.open(); }` ends with the sheet open and `data-state="open"`. Resolve snap points on every change; if the active snap's y changed → `snapTo(current, { immediate: dragging || viewHeightChanged })`.
- Gesture: `attachDrag(content, …, { filter })` with the filter rejecting targets inside `[data-snap-sheet-no-drag]`, `<select>`, and while `document.getSelection()?.type === "Range"`. Implement PLAN §3.4 rules 1–4 using `project`/`decideRelease`/`closest` from `core/snap.ts`. Blur a focused input/textarea inside `content` on drag start. Live drag: `spring.set(y, { immediate: true })`.
- Release: `decideRelease` → `close()` or `snapTo(snap.index)` with `velocity: vy` passed to the spring. `onDragEnd(targetIndex | -1)` fires before the animation starts.
- `snapTo(i)`: clamps to valid indices (warnOnce when out of range), updates `snapIndex`, fires `onSnapIndexChange` **only if the index changed**, animates, applies body overflow + padding-bottom + `data-snap-index` at rest, then resolves.
- `open()`: `lockBodyScroll()` (when modal) + `inert` on siblings of the sheet's root element inside `container`/`document.body` (skip elements that already have `inert`, restore only those we set) + focus first focusable in `content` (fallback `content`) remembering `document.activeElement`; animate from closed y (or `skipInitialAnimation` → immediate) to the active snap; `data-state="open"` immediately; `onAnimationEnd(true)` at rest. `close()`: reverse; restore focus, release lock, remove inert; `data-state="closed"` after the animation rests (so CSS can transition); `onOpenChange(false)` when initiated by dismiss; `onAnimationEnd(false)`.
- Per-frame writer (spring subscriber): `transform`, `--snap-sheet-y: <y>px`, `--snap-sheet-progress` on `content` and on `container ?? document.documentElement`? — **no**: write progress on `content` and on `overlay` (if given) only; do not touch the document root. `data-dragging` toggled at drag start/end.
- `reducedMotion === true || (=== "system" && matchMedia("(prefers-reduced-motion: reduce)").matches)` → every animation immediate.
- Escape (when `dismissible && modal`): module-level stack of open controllers in `core/keyboard.ts` (push on open, remove on close/destroy) + one shared `document` keydown listener present only while the stack is non-empty; Escape closes `stack.at(-1)` only. (Same-node `stopPropagation` cannot do this — PLAN §3.6.)
- Content mode: when `isContentMode(points)` (including the default `[]`), synthesize a single `ResolvedSnap` `{ index: 0, point: "content", height: measured content height (placeholder 50 % until measured), y, scroll: false, drag: { up: true, down: true } }` inside the controller and feed it to `closest`/`decideRelease` like any other lowest snap — so `dismissible: false` clamps instead of closing. `core/snap.ts` stays as merged. `SheetState.contentMode = true`, `snapIndex = 0`, `onSnapIndexChange` never fires in content mode.
- tsdown: `noExternal: ["@snap-bottom-sheet/spring", "@snap-bottom-sheet/gesture"]` so both TypeScript-source workspace packages are bundled and their types rolled into `dist/index.d.ts`; `deps.neverBundle` keeps react/react-dom external. If the dts pass cannot follow the symlinked `.ts` sources, report before working around it.
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
7. Escape closes when modal+dismissible, not otherwise; with two nested controllers (outer opened first) only the inner closes; after the inner closes, Escape closes the outer.
8. `update({ snapPoints })` clamps `snapIndex`, animates to the new y, fires `onSnapIndexChange` only on index change.
9. Reduced motion (`matchMedia` matches) → `open()` resolves synchronously-ish (no rAF frames needed).
10. `import "../src/index.ts"` in a `// @vitest-environment node` test does not throw (SSR safety).
11. `padding-bottom` equals the active y at rest, and Body has `overflow-y: auto` only at `scroll: true` snaps (P0-8).
12. `setElements({ header: el })` after attach starts measuring it (a later `"header"` snap resolves to its height); `setElements({ header: null })` stops; `setElements({ content: other })` throws. After `destroy()`, `open()` resolves and changes nothing; second `destroy()` is a no-op.

## Done when

```
pnpm --filter snap-bottom-sheet typecheck
pnpm --filter snap-bottom-sheet test
pnpm lint
pnpm build            # dist/index.js, dist/index.d.ts, dist/react/index.js (placeholder), dist/react/index.d.ts
pnpm verify:pkg
grep -c "react-spring\|use-gesture" packages/sheet/dist/index.js   # 0
head -1 packages/sheet/dist/react/index.js                          # "use client";
head -1 packages/sheet/dist/index.js                                # NOT "use client" (core entry is framework-agnostic)
```

Commits: `feat(core)!: framework-agnostic sheet controller (createSheet)` (+ `chore(sheet): drop react-spring and use-gesture` if you prefer two commits: deletion first, then feature).

## Report

Worker report template. Include `wc -l` of every new core file and the list of exported symbols from `src/index.ts`.
