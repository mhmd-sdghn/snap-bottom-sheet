# snap-bottom-sheet — audit

Scope: all of `lib/` (20 files, ~1100 LOC), build config, package manifest, README.
Reference target architecture: `nbridge` monorepo.

Severity: **P0** = wrong behaviour users hit. **P1** = footgun / latent. **P2** = quality.

---

## 1. Correctness bugs

### P0-1 — `snapPoints` index ≠ `snapValues` index
`getSnapValues` sorts pixel values descending (`sortSnapValues`, utils.ts:247) but the
consumer's `snapPoints` array is **never** sorted. Every consumer of an index then reads
from whichever array it happens to hold:

- `getActiveValue(snapValues, …, activeSnapPointIndex)` → **sorted** space
- `getActiveSnapPoint(activeSnapPointIndex, …, snapPoints)` → **unsorted** space
- `onDragEndEventHandler`: `snapPoints[targetSnapIndex]` where `targetSnapIndex` came from
  `getClosestIndex(snapValues, …)` → **sorted** index into **unsorted** array

Repro: `snapPoints={[0.9, 0.3]}`, `activeSnapPointIndex={0}`. Sheet animates to the 0.3
position, but `scroll`/`drag` config and the `onSnap` snapPoint argument come from `0.9`.
Any array not already in descending-offset order is broken.

**Fix:** sort once, carry `{ value, config, originalIndex }` tuples. One sorted array.
Decide publicly whether indices are consumer-order or sorted-order and document it.

### P0-2 — dynamic snap is measured at the wrong y for drag-end
`getSnapValues` pushes `viewHeight` for a dynamic snap (utils.ts:282) — i.e. *fully closed* —
instead of `viewHeight - dynamicHeightContent`. `getActiveValue` patches index 0 back to the
real value (utils.ts:155), but `getClosestIndex` at drag end runs against the raw
`snapValues`, so it compares the drag position to `viewHeight`.

Repro: `[dynamic, 0.5]`, viewHeight 800, content 200 (true dynamic y = 600). Drag to y=550.
Distances: |800−550| = 250 vs |400−550| = 150 → snaps to 0.5. Wrong; 550 is nearer 600.

**Fix:** resolve dynamic to `viewHeight - dynamicHeightContent` at conversion time.

### P0-3 — `useAnim` clamp is nonsense
```ts
const targetY = y.get() + _y > 0 ? _y : 0;   // useAnim.ts:8
```
Adds current position to the requested target, compares to zero, then ignores the sum.
`y=500, animate(-100)` → `400 > 0` → target `-100`: sheet flies above the viewport.
**Fix:** `Math.max(_y, 0)`, or clamp at the call site and delete this.

### P0-4 — `onlyDynamicSnap` compares a SnapPoint to a number
```ts
snapPoints[0] === viewHeight - dynamicHeightContent   // onDragEndEventHandler.ts:110
```
`snapPoints[0]` is `number | "dynamic" | SnapPointConfigObj`; the right side is a pixel
offset. Never true for `"dynamic"` or an object → `onSnap` fires for single-dynamic sheets
that should be content-mode. Same broken comparison in `isContentMode` (utils.ts:135), whose
parameter is typed `SnapPoint[]` while every caller passes `number[]`.

### P0-5 — nested sheets share one overlay DOM id
`OverlayElementId` is a constant, rendered per sheet. Two open sheets ⇒ duplicate ids.
`useMount`/`onDragEndEventHandler` reach the overlay via `wrapperRef.current.querySelector(#id)`,
which can resolve to the *inner* sheet's overlay. Invalid HTML besides.
**Fix:** ref to the overlay element, or a per-instance id. Stop using `querySelector`.

### P0-6 — `useScrollLock` clobbers the host page's styles
```ts
document.documentElement.style.overflowY = "hidden";   // set on mount, no save
…
document.documentElement.style.overflowY = "";         // cleared to "" on unmount
```
Existing inline `overflow` on `<html>`/`<body>` is destroyed, not restored. Nested sheets:
the inner sheet's unmount unlocks the page while the outer is still open. Also locks the
page unconditionally, even for a wrapper-scoped (non-modal) sheet.
**Fix:** save/restore prior values, reference-count locks across instances, opt out when
not modal.

### P0-7 — types promised by the README are not exported
README: `import type { SnapPoint, SnapPointConfigObj, SheetCallbacks } from "snap-bottom-sheet"`.
`lib/index.ts` exports only `SnapPoints`, `SnapPointDynamicValue`, `useSnapState`, `Sheet`.
That import fails today.

---

## 2. Footguns and latent bugs

| # | Where | Problem |
|---|-------|---------|
| P1-1 | `getClosestIndex` (utils.ts:91) | `closestIndex + 1` unbounded; `arr[0]` on empty array → `NaN`. Clamped only by luck at the one call site. |
| P1-2 | `onDragEndEventHandler.ts:127` | `targetSnapIndex ?? activeSnapPointIndex` — `targetSnapIndex` is always a number. Dead branch. |
| P1-3 | `useMount.ts:38` | deps `[animate, viewHeight, isOpen]` omit `onClose`/`overlayColor`/`wrapper` → stale closures. `viewHeight` in deps means a window resize while closed re-fires `onClose`. |
| P1-4 | `useScrollLock.ts:44` | dep array `[targetRef.current]` — refs don't trigger renders; the effect can't re-run on ref change. |
| P1-5 | `useScrollLock` vs React | writes `overflowY`/`touchAction` imperatively on the same element whose `style` prop React controls → next render can wipe them. |
| P1-6 | `isSSR()` (utils.ts:9) | `process.versions.node !== undefined` is true under jsdom, Electron renderer, and any `process`-polyfilling bundler. It gates portal-vs-inline **during render** → hydration mismatch. Use `typeof document === "undefined"`. |
| P1-7 | `Children.toArray(children).slice(1)` | Flattens fragments and drops `null`/`false`. `{cond && <X/>}` before `Sheet.DynamicHeight` silently shifts the index and the marker is missed. |
| P1-8 | `getActiveValue` (utils.ts:155) | Hardcodes "index 0 is the dynamic snap". Dynamic elsewhere is only `console.warn`ed, then computed wrong. |
| P1-9 | `convertSnapToPixels` (utils.ts:199) | `typeof valueToConvert === "string" ? parseFloat(…)` is unreachable — types forbid strings. Either delete it or actually support `"50%"`/`"200px"`/`"50vh"`. |
| P1-10 | `convertSnapToPixels` | `n <= 1` means fraction: a literal 1px snap is unexpressible, and `0` silently means "closed". |
| P1-11 | `SheetContainer.tsx:162` | `onClick={e => e.stopPropagation()}` on the sheet root swallows clicks for the consumer's own listeners. |
| P1-12 | `validateSnapTo` | Takes `sheetHeight` only to format a warning string. Confusing signature. |
| P1-13 | `package.json` | `react-scan` in **`dependencies`** — a dev profiler ships to every consumer. `i` and `npm` in devDependencies are junk. `@types/body-scroll-lock` with no `body-scroll-lock`. |
| P1-14 | `tsconfig.lib.declarations.json` | `"target": "es5"` for declaration emit of a modern ESM library. |
| P1-15 | `package.json` exports | `"./*": "./dist/*.js"` publicly exposes every internal module (`preserveModules` output). No `publint`/`attw` check. `globals` on the cjs output is meaningless. |
| P1-16 | `Sheet.tsx:33` | raw `useLayoutEffect`, not `useIsomorphicLayoutEffect` (project convention + SSR warning). Same in `useWatchHeight.ts:88`. |
| P1-17 | `package.json` | empty `repository.url`, empty `bugs.url`. No `LICENSE`. |

---

## 3. Performance

- **P1-18** `Sheet.tsx` builds `callbacks` and `context` object literals every render → context
  value identity changes every render → every consumer re-renders. Needs `useMemo`.
- **P1-19** `useWatchHeight` calls `setHeight` on every `ResizeObserver` tick, re-rendering
  `SheetContainer` (and rebuilding `snapValues`, gesture bindings, style objects) during
  content animations. Should be a ref/subscription, not render state; at minimum bail when
  the height is unchanged.
- **P1-20** `useSnapState` recomputes `buildSnapPointsArray` on every render and throws it
  away; `handleSetSnaps` has unstable identity.
- **P1-21** Style object literal rebuilt per render in `SheetContainer`; `useGesture` bindings
  re-spread per render.
- **P2** `animated("div")` inside render is a cache lookup, not a remount (verified against
  `@react-spring/animated` `createHost`) — still hoist it, but it is not a bug.

---

## 4. API and DX gaps

- Peer deps `@react-spring/web` + `@use-gesture/react` (~28 KB gz combined) are **required**
  installs. The sheet uses one scalar spring and one drag gesture — a few hundred lines.
- **Controlled-only.** No `defaultSnapPointIndex`. If the consumer forgets to set state in
  `onSnap`, the sheet is visually at one snap and logically at another.
- `onSnap(-1, null)` on close — magic sentinel instead of `onClose`-only.
- No imperative handle (`ref.snapTo(i)`, `ref.close()`), no `onSnapStart` / `onDragStart` /
  `onDragEnd` / `onOpenChange`.
- No accessibility: no `role="dialog"`, `aria-modal`, focus trap, focus restore, Escape to
  close, background `inert`, `prefers-reduced-motion`.
- No velocity/fling in `onDragEndEventHandler` — a fast flick moves one snap the same as a
  slow 81px drag. Distance-only snapping feels wrong on mobile.
- Overlay only renders when `overlayColor` is set, so a transparent click-catching overlay is
  impossible. Overlay opacity does not track drag progress.
- No `data-*` state hooks for CSS (`data-state="open|closed"`, `data-snap-index`), no
  `Sheet.Handle` / `Sheet.Header` / `Sheet.Content` / `Sheet.Backdrop` parts.
- `Sheet.DynamicHeight` must be the **first child**, enforced by array index and a runtime
  `console.warn`. Not expressible in types, breaks under conditional children (P1-7).
- Requested but missing: **"divide space evenly between N steps"** snap form
  (e.g. `snapPoints={{ steps: 3 }}` or `"1/3"` fractions).
- Naming: `useSnapScrollProps`, `useMountProps` are lowercase interfaces;
  `DragEndEventHandlerFn` names a state object, not a function; local
  `const Sheet = (<AnimatedDiv…>)` inside `SheetContainer` shadows the exported `Sheet`.
- README: placeholder demo image, `github.com/your-repo-url`, half-empty prop tables,
  documents an import that does not work (P0-7).

---

## 5. Repo / tooling gaps (vs nbridge)

| nbridge has | snap-bottom-sheet has |
|---|---|
| pnpm workspace, `packages/*` + `docs` + `playgrounds/*` | single package, `src/` playground |
| biome (lint+format, one tool) | eslint + prettier + husky + lint-staged |
| lefthook | husky |
| tsdown build, `publint` + `attw` gate | hand-written 3-output rollup config, no gate |
| vitest + jsdom, 16 test files | **no tests at all** |
| changesets + OIDC trusted publish | manual `npm version`, private registry |
| CI / docs / release GitHub Actions | none |
| VitePress docs site on GH Pages | README only |
| 5 playgrounds incl. Next.js SSR | one Vite app |
| LICENSE, CONTRIBUTING, PR template | none |

---

## 6. Proposed target

```
snap-bottom-sheet/                  # private monorepo root
├─ packages/
│  ├─ spring/    @snap-sheet/spring    scalar spring, rAF, no deps      (~120 LOC)
│  ├─ gesture/   @snap-sheet/gesture   pointer drag + scroll, no deps   (~180 LOC)
│  └─ react/     snap-bottom-sheet     the sheet; deps on the two above
├─ docs/                              VitePress + live embedded demos
├─ playgrounds/{react,next}/          manual testing + SSR check
└─ .github/workflows/{ci,docs,release}.yml
```

Both micro-packages replace an external peer dep with a real dependency, so consumers
`npm i snap-bottom-sheet` and nothing else.

**Deliberately skipped:** a framework-agnostic `core` package. React is the only consumer
today; splitting the state machine out is speculative. Add it when a second framework binding
actually exists.

---

## 7. Found during design (addendum)

### P0-8 — content unreachable at partial snaps when `scroll: true`
The panel is `height: 100dvh` (or wrapper `100%`), translated down by `y`, and the panel itself
is the scroller (`overflowY: auto`). At a 50 % snap the lower half of the panel — and therefore
the last `y` pixels of scrollable content — sits below the viewport and can never be scrolled
into view. Consumers must hack `padding-bottom`.
**Fix:** a dedicated scroll region whose height is set to the visible height at rest
(`viewHeight − y_snap − headerHeight`); the panel stays tall enough for the topmost snap so no gap
appears mid-drag.

### P1-22 — SSR path renders interactive markup inline
`isSSR()` → return the panel without a portal. Server HTML then differs from the client (portal)
tree on hydration. A sheet is interactive-only; render `null` until mounted instead.

### P1-23 — no `"use client"` boundary
Nothing marks the package as client-only for RSC/Next.js app router; every consumer must wrap it.
