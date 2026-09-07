# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> The **Architecture** section below describes the legacy 0.x engine, which still
> lives in `packages/sheet/src/`. See [docs/internal/PLAN.md](./docs/internal/PLAN.md)
> for the 1.0 design that replaces it. Full rewrite of this file is task 07.

## What this is

`snap-bottom-sheet` — a published React bottom-sheet library. pnpm monorepo: `packages/sheet/` is the shipped package (source in `packages/sheet/src/`, tests in `packages/sheet/test/`), `playgrounds/react/` is a Vite app for manual testing, `docs/` holds the plan/audit. Automated coverage is a vitest smoke test only — real verification is dragging the sheet in the playground.

## Commands

```bash
pnpm build                     # packages/sheet -> dist/ via tsdown (ESM only)
pnpm dev                       # tsdown --watch
pnpm --filter playground-react dev    # Vite dev server (build the library first)
pnpm test                      # vitest run
pnpm typecheck                 # tsc --noEmit in packages/sheet
pnpm lint                      # biome check .
pnpm lint:fix                  # biome check --write .
pnpm verify:pkg                # publint + attw on the packed tarball
```

Playgrounds resolve `snap-bottom-sheet` through `exports` to `dist/`, not `src/` — build (or `pnpm dev`) before running one. lefthook pre-commit runs `biome check --write` on staged files.

Peer deps (`react`, `react-dom`, `@react-spring/web`, `@use-gesture/react`) are external in the build — never import them in a way that bundles them.

## Imports

No path aliases. Library code uses relative imports with explicit `.ts`/`.tsx` extensions (`allowImportingTsExtensions`, `moduleResolution: "bundler"`).

## Architecture

Compound component: `Sheet` = `Sheet` + `.Container` + `.DynamicHeight`, assembled in `packages/sheet/src/index.ts`.

Responsibility split:

- **`Sheet.tsx`** — state gate only. Holds `present` so the sheet stays mounted through the closing animation, builds the context value, renders `SheetContextProvider`. No DOM, no animation.
- **`SheetContainer.tsx`** — the whole engine. Owns the sheet ref, the spring, the gesture bindings, portal/wrapper decision, and wires every hook and event handler together. Almost all behavior changes land here or in a hook/handler it calls.
- **`SheetWithDynamicHeight.tsx`** — a marker component: it returns `children` unchanged and carries `displayName = DynamicHeightComponentId`. `findDynamicHeightComponent` (utils) inspects the **first** child of `Sheet.Container` for that displayName; if found, `SheetContainer` swaps it for `SheetDynamicHeightContent` (which measures via `useWatchHeight` and pushes the height into context) and renders the remaining children after it. Consequence: `Sheet.DynamicHeight` only works as the first child.

### Snap point model

A snap point is `number | "dynamic" (SnapPointDynamicValue) | SnapPointConfigObj { value, scroll?, drag? }`.

Everything internal works in **pixel y-offset from the top** (0 = fully open, `viewHeight` = closed), not in heights. `getSnapValues` (utils) converts: values `<= 1` are treated as a fraction of view height, `> 1` as absolute pixels, then `viewHeight - offset` gives the y position. Values are sorted descending with `0` forced last, so **index 0 is always the smallest/lowest snap** regardless of the order the consumer passed them.

`SnapPointDynamicValue` must be the first entry when using `Sheet.DynamicHeight`; `validateDynamicSnapPosition` only `console.warn`s otherwise.

"Content mode" (`isContentMode`) means there are no real snap points — the sheet just hugs its content height; the container then renders `height: fit-content` and drag-up is pinned to the content height.

### Animation and gestures

- `useAnim` wraps a single `useSpring` on `y` and exposes `animate(y, cb?, { jump })`. Every position change goes through it — don't set transforms directly (`y.set()` is used only for hard clamps in the drag-end handler).
- `@use-gesture/react` bindings in `SheetContainer` delegate to `packages/sheet/src/events/onDrag{Start,,End}EventHandler.ts`. Handlers are wrapped in `useEffectEvent` so the gesture binding stays stable while reading fresh state.
- `onDragEventHandler` — live drag: applies per-snap `drag.up`/`drag.down` locks, and when `scroll: true` only takes over dragging if the content is already scrolled to top.
- `onDragEndEventHandler` — decides the target snap via `getClosestIndex`, closes the sheet if dragged past `DragOffsetThreshold` (80px) at index 0, and re-applies scroll lock. It calls `onSnap(-1, null)` before `onClose()` when closing by drag.
- `onDragStartEventHandler` — blurs a focused input inside the sheet (mobile ghost-caret workaround).

### Scroll locking

`useScrollLock` returns a ref holding `activate`/`deactivate` that toggle `overflowY`/`touchAction` on the sheet element, and locks `document.documentElement`/`body` overflow for the sheet's lifetime. Scroll is enabled only for snap points declared as `{ scroll: true }`; `useSnapScroll` re-applies the lock (and scrolls content back to top) whenever the active snap changes from outside.

### Height tracking

`useWatchHeight(ref?, cb?)` returns the element's `offsetHeight`, or `window.innerHeight` when no ref/element. Both the `ResizeObserver` and the window `resize` listener are shared singletons inside that file — one observer for the whole app.

### Portal / wrapper modes

`Sheet.Container` renders one of four ways: SSR (`isSSR()` → plain markup, no portal), no `wrapper` (portal to `document.body`, `position: fixed`, no overlay), `wrapper` + `wrapperPortalElement` (portal into that element with a wrapper div + overlay), or `wrapper` alone (in-place wrapper div + overlay, `position: absolute`). The overlay only appears when `overlayColor` is set **and** `wrapper` is truthy — `useMount` warns otherwise. Overlay background is set/cleared imperatively via `document.querySelector('#snap-bottom-sheet-wrapper-overlay')`, not React state.

Nested sheets are supported; `onDragStart` calls `event.stopPropagation()` and cancels the gesture when it originates on an overlay so an inner sheet's drag doesn't move the outer one.

### `useSnapState`

Exported convenience hook: prepends the dynamic snap point (optionally with `scroll`/`drag` config) to a consumer's snap array and keeps doing so on every `setSnaps` call.

## Conventions

- Default exports for components and hooks; hook files named `useX.ts`, one hook per file.
- All shared types live in `packages/sheet/src/types.ts`; magic values in `packages/sheet/src/constants.ts`.
- `useIsomorphicLayoutEffect` from `@react-spring/web` rather than `useLayoutEffect` in library code that can run during SSR.
- New public exports must be added to `packages/sheet/src/index.ts` — it is the single tsdown entry, and `dist/index.d.ts` is generated from it.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
