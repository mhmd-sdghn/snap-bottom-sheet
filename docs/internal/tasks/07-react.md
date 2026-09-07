# Task 07 — React bindings (`snap-bottom-sheet/react`)

Worker: W2. Branch: `w2/07-react` off `v1` (after task 03 is merged; runs **in parallel with task 04** — build against the `SheetController` contract in PLAN §2.2, not against the real implementation). Plan sections: §2.1, §2.2, §2.3, §3.6, §0 (SSR row).

> FINAL. Hooks from task 03 are on `v1`: `useControllableState({ prop, defaultProp, onChange })` (stable setter, skips unchanged values, controlled mode never mutates internal state) and `useIsomorphicLayoutEffect`. Do not start before "TASK 07 — go".

## Goal

A thin React layer over the core controller: compound parts that render DOM, register their nodes, and let the Root create/drive one `SheetController`. No behaviour lives here — no snap math, no gesture handling, no scroll lock. If you find yourself needing any of that, stop and report: it belongs in core.

## Scope

```
packages/sheet/src/react/index.ts                 public exports: Sheet (compound), useSheetState, types
packages/sheet/src/react/context.ts               SheetContext: { register(part, el | null), controllerRef, ids, options }
packages/sheet/src/react/Sheet.tsx                Root (forwardRef<SheetHandle>) — controllable state, controller lifecycle, presence
packages/sheet/src/react/Portal.tsx               null until mounted (useState + useEffect), then createPortal(children, container ?? document.body)
packages/sheet/src/react/Overlay.tsx  Content.tsx  Header.tsx  Body.tsx  Handle.tsx  Title.tsx  Description.tsx  Close.tsx
packages/sheet/src/react/use-sheet-state.ts       useSyncExternalStore(controller.subscribe, getState, getServerSnapshot)
packages/sheet/src/react/use-controllable-state.ts        (exists from task 03)
packages/sheet/src/react/use-isomorphic-layout-effect.ts  (exists from task 03)
packages/sheet/test/react/*.test.tsx              RTL + jsdom, controller mocked via vi.fn() factory injected through a test-only prop or module mock of "../core/sheet.ts"
packages/sheet/test/react/ssr.test.tsx            // @vitest-environment node — renderToString(<Sheet open><Sheet.Portal>…) returns "" for the portal subtree and throws nothing
```

Until task 04 lands, `import { createSheet } from "../core/sheet.ts"` will not resolve. Create `src/core/sheet.ts` as a **stub** exporting the §2.2 types and `export function createSheet(): never { throw new Error("stub: task 04") }` ONLY IF it does not exist on your branch; the orchestrator drops your stub when merging after task 04. Type against `SheetController`/`SheetOptions`/`SheetElements`/`SheetState` from PLAN §2.2 verbatim.

## Behaviour

**Root `<Sheet>`** (props: PLAN §2.3 "Root")
- `open`/`defaultOpen`/`onOpenChange` and `activeSnapIndex`/`defaultSnapIndex`/`onSnapIndexChange` via `useControllableState`.
- `present = open || closingAnimationRunning`. Children render only while `present` (so the close animation plays). `onAnimationEnd(false)` from the controller → `present = false`.
- Parts register DOM nodes via context: `register("content", el)` etc. from callback refs. When a part registers/unregisters **after** the controller exists (conditional Header, Overlay toggled by `modal`, Body swapped) → `controller.setElements({ [part]: el })`; a `content` or `container` identity change → destroy + recreate (documented, rare).
- `useIsomorphicLayoutEffect` keyed on `present`: when `present` becomes true and `content` is registered → `createSheet(elements, options)`; store in a ref; `open` true → `controller.open()`. On `present` false or unmount → `controller.destroy()`.
- Options passed to the controller: `snapPoints, defaultSnapIndex: activeSnapIndex ?? defaultSnapIndex, modal, dismissible, reducedMotion, skipInitialAnimation, labelledBy: titleId, describedBy: descriptionId`, and callbacks that route into the controllable setters: `onOpenChange: (o) => setOpen(o)`, `onSnapIndexChange: (i, p) => setSnapIndex(i)` + user's `onSnapIndexChange(i, p)`, `onDragStart/onDragEnd/onAnimationEnd` pass-through (latest via refs — no stale closures).
- Prop → controller sync effects (skip when equal to `controller.getState()`): `open` → `open()/close()`; `activeSnapIndex` → `snapTo()`; `snapPoints`/`modal`/`dismissible`/`reducedMotion` → `update({...})`. `snapPoints` compared by shallow JSON-equality to avoid re-resolving on every render when the consumer passes a literal array.
- `ref` → `SheetHandle` (`snapTo`, `close`, `activeSnapIndex`, `y` getters reading controller state; no-ops that resolve when no controller yet).
- `useId()` for title/description ids; provided via context to `Title`/`Description`, and to the controller as `labelledBy`/`describedBy` (only when those parts are rendered — track registration).

**Parts** — each is `forwardRef`, renders one element, merges `className`/`style`/rest, registers its node. Default elements: Overlay `div`, Content `div`, Header `div`, Body `div`, Handle `button type="button"`, Title `h2`, Description `p`, Close `button type="button"` (onClick → `setOpen(false)`). `Portal` renders `null` until mounted, then `createPortal(children, container ?? document.body)`; when `container` is given it also passes it to the controller as `elements.container`. Content wraps `children` in a single inner `div` (`data-snap-sheet-inner`) — the controller measures the inner element for `"content"` (see task 04 "content-inner" rule). No `asChild`.

**`useSheetState()`** — must be called under `<Sheet>`; returns `SheetState`; server snapshot = `{ open: false, snapIndex: 0, y: 0, progress: 0, dragging: false, animating: false, contentMode: false }`. Re-subscribes when the controller is (re)created.

**SSR / RSC**
- Nothing touches `window`/`document` at module scope or during render. `Portal` returns `null` on the server and on the first client render (no hydration mismatch).
- `src/react/index.ts` starts with `"use client";` **and** tsdown adds the banner (belt and braces; check the built `dist/react/index.js` starts with it — task 04 configures tsdown; if your branch lacks the `react/index` entry, add it: `entry: { index: "src/index.ts", "react/index": "src/react/index.ts" }`, and `package.json` `exports["./react"]`; the orchestrator resolves the overlap with task 04).

## Tests (mock `createSheet` with `vi.mock("../../src/core/sheet.ts")` returning a fake controller whose methods are `vi.fn()` and whose `subscribe` lets tests push states)

1. Renders nothing when `open={false}` and `defaultOpen` unset; renders Portal children when `open`.
2. Creates the controller exactly once per open with `elements.content/header/body/overlay/handle` = the rendered nodes and `labelledBy/describedBy` = the Title/Description ids present in the DOM.
3. `open` true → `controller.open()` called; flipping to false → `controller.close()`; controller's `onAnimationEnd(false)` → children unmounted.
4. Uncontrolled: fake controller calls `options.onOpenChange(false)` → sheet unmounts after animation end and user `onOpenChange(false)` fired. Controlled with parent keeping `open`: after `onOpenChange(false)` the effect calls `controller.open()` again (documented bounce).
5. `activeSnapIndex` prop change → `snapTo(newIndex)`; controller-initiated `onSnapIndexChange(2, p)` → user callback receives `(2, p)`; in uncontrolled mode `useSheetState().snapIndex` reflects it after the fake pushes state.
6. `snapPoints` prop identity change with equal content → **no** `update()` call; content change → one `update({ snapPoints })`.
7. `ref.snapTo(1)` delegates; before mount it resolves without throwing.
8. Parts merge `className`/`style` and forward refs; Handle/Close are `<button type="button">`; Close click → `onOpenChange(false)`.
9. Portal `container` prop → children portalled into it and passed as `elements.container`.
10. Unmount → `destroy()` once (strict-mode double effects tolerated: core treats post-destroy calls as no-ops).
12. A `Sheet.Header` that mounts after the controller exists → `setElements({ header: node })`; unmounting it → `setElements({ header: null })`.
11. SSR: `renderToString(<Sheet open><Sheet.Portal><Sheet.Content>x</Sheet.Content></Sheet.Portal></Sheet>)` in node env → does not throw, output contains no `data-state` (portal returned null).

## Done when

```
pnpm --filter snap-bottom-sheet typecheck
pnpm --filter snap-bottom-sheet test
pnpm lint
pnpm build && head -1 packages/sheet/dist/react/index.js     # "use client";
```

Commits: `feat(react)!: React bindings on the core controller`, `test(react): components, controlled state, SSR`.

## Report

Worker report template. List every file with `wc -l`, the exact public exports of `src/react/index.ts`, and anything you needed from the controller that PLAN §2.2 does not provide (the orchestrator adds it to task 04 or rejects).
