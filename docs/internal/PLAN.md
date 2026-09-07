# snap-bottom-sheet 1.0 — implementation plan

Companion to [AUDIT.md](./AUDIT.md). Every worker task in `tasks/` references sections here by number.

## 0. Decisions (final — do not re-open)

| Topic | Decision |
|---|---|
| Version | **1.0.0**, breaking changes allowed, migration guide in docs |
| Package name | `snap-bottom-sheet` (public npm, free as of 2026-09-07) |
| Registry | registry.npmjs.org, changesets + OIDC trusted publishing (nBridge `release.yml`) |
| Repo | `github.com/mhmd-sdghn/react-bottom-sheet`; docs on GitHub Pages, base `/react-bottom-sheet/` |
| Layout & tooling | Clone nBridge: pnpm workspace, tsdown (ESM only), biome, lefthook, vitest+jsdom, changesets, publint + attw, VitePress, `playgrounds/*` |
| Core vs bindings | **Framework-agnostic TypeScript core** (`snap-bottom-sheet`, vanilla JS usable) + **React bindings** (`snap-bottom-sheet/react`) built on it — nBridge pattern: one published package, subpath exports. Vue/Angular bindings can be added later as further subpaths. |
| Sub-packages | `packages/spring`, `packages/gesture` — `private: true`, bundled into `snap-bottom-sheet` dist by tsdown. |
| Peer deps | `react`, `react-dom` `^18 \|\| ^19`, both **optional** (`peerDependenciesMeta`) — the core entry has no peers. `@react-spring/web` and `@use-gesture/react` removed. |
| SSR | Must work in Next.js app router + pages router: `"use client"` banner, no `window`/`document` at module scope or in render, portal renders `null` until mounted, `renderToString` test, `playgrounds/next` builds in CI |
| Integration branch | `v1` (off `main`). Workers branch off `v1`, orchestrator merges accepted work into `v1`. Owner merges `v1` → `main`. |
| Reference monorepo | `/Users/nehn/Projects/Core/nbridge` (read-only). Verbatim template spec: `/private/tmp/claude-501/-Users-nehn-Projects-Core-snap-bottom-sheet--claude-worktrees-bottom-sheet-audit-f63d97/4cf93f8c-a568-4d78-a164-34f1c87b4e64/scratchpad/nbridge-template.md` |

## 1. Target repository layout

```
.
├─ .changeset/config.json
├─ .github/workflows/{ci,docs,release}.yml  .github/pull_request_template.md
├─ biome.json  lefthook.yml  pnpm-workspace.yaml  .editorconfig  .gitattributes  .nvmrc (24)
├─ package.json                 private root: build/dev/test/lint/typecheck/docs:*/verify:pkg/changeset/release
├─ LICENSE (MIT)  README.md  CONTRIBUTING.md  CLAUDE.md
├─ packages/
│  ├─ spring/                   @snap-bottom-sheet/spring   private
│  │  ├─ src/index.ts  test/*.test.ts  package.json  tsconfig.json  vitest.config.ts
│  ├─ gesture/                  @snap-bottom-sheet/gesture  private
│  │  └─ (same shape)
│  └─ sheet/                    snap-bottom-sheet           published
│     ├─ src/index.ts           core entry  → exports "."        createSheet, steps, types
│     ├─ src/core/…             engine: snap.ts, scroll-lock.ts, measure.ts, env.ts, sheet.ts (controller)
│     ├─ src/react/index.ts     React entry → exports "./react"  Sheet + parts + hooks
│     ├─ src/react/…
│     ├─ test/…  package.json  tsconfig.json  tsdown.config.ts  vitest.config.ts  README.md  CHANGELOG.md
├─ docs/                        VitePress site (package `snap-bottom-sheet-docs`, private)
│  ├─ .vitepress/{config.ts,theme/index.ts,theme/custom.css,theme/ReactDemo.vue}
│  ├─ guide/…  reference/…  demos/…  index.md
│  └─ internal/                 this plan, audit, tasks — excluded from the site via `srcExclude`
└─ playgrounds/
   ├─ vanilla/                  Vite, no framework — exercises the core API directly
   ├─ react/                    Vite + React, scenarios for manual testing
   └─ next/                     Next.js app router, SSR smoke (`next build` in CI)
```

Workspace deps: `playgrounds/*` and `docs` depend on `"snap-bottom-sheet": "workspace:*"` and resolve through `exports` to `dist/` (build first; `pnpm dev` = tsdown watch). `packages/sheet` depends on `"@snap-bottom-sheet/spring": "workspace:*"` and `"@snap-bottom-sheet/gesture": "workspace:*"`; tsdown config lists them in `noExternal` so the published bundle is self-contained. tsdown entries: `{ index: "src/index.ts", "react/index": "src/react/index.ts" }`; `package.json` exports `.` (core) and `./react`, like nBridge's `.`/`./react`/`./next`. The `"use client"` banner applies to the react chunk only — `outputOptions.banner` must be a function keyed on the chunk file name (`chunk.fileName.startsWith("react/")`), since a string banner is per-build and would mark the core entry as a client module.

## 2. Public API (1.0)

### 2.1 Snap points

```ts
type SnapValue =
  | number            // 0 < n <= 1 → fraction of view height; n > 1 → px height
  | `${number}%`      // fraction of view height
  | `${number}px`     // px height
  | "header"          // measured height of <Sheet.Header>
  | "content";        // measured natural height of all content (Header + Body content), capped at view height

interface SnapPointConfig {
  value: SnapValue;
  scroll?: boolean;                                    // Body scrolls at this snap (default false)
  drag?: boolean | { up?: boolean; down?: boolean };   // default true
}
type SnapPoint = SnapValue | SnapPointConfig;

/** Evenly spaced fractions: steps(3) → [1/3, 2/3, 1]. steps(3, { from: 0.2 }) → 0.2..1 in 3 steps. */
function steps(count: number, opts?: { from?: number; to?: number }): number[];
```

Rules:
- **Indices refer to the consumer's array order.** Internally each point is resolved to `{ index, y, config }` and a y-sorted view is used for neighbour/closest search. This fixes AUDIT P0-1 and P0-2.
- `"header"` and `"content"` are live-measured with a shared `ResizeObserver`; when the value of the *active* snap changes, the sheet re-animates to it (spring, not jump). Both are capped at view height.
- `0` is not a valid snap (it means closed); warn once in dev, drop it.
- No snap points, or only `"content"` → **content mode**: the controller treats `[]` as `["content"]` (one synthesized snap from the measured content height), so the sheet hugs content, drag up is pinned, and drag down past the threshold closes — or clamps back when `dismissible: false`.

### 2.2 Core (vanilla) API — `snap-bottom-sheet`

The engine owns all behaviour; it is attached to DOM elements the consumer already rendered. React (and any future binding) is a thin layer that renders elements, hands them to `createSheet`, and mirrors props into `update()`.

```ts
export interface SheetElements {
  content: HTMLElement;            // the panel: receives transform, padding-bottom, data-*, CSS vars, role/aria
  header?: HTMLElement | null;     // measured for "header"
  body?: HTMLElement | null;       // scroll region: overflow toggled per snap, scroll-vs-drag arbitration
  overlay?: HTMLElement | null;    // click → close when dismissible; receives data-state, aria-hidden
  handle?: HTMLElement | null;     // keyboard: ArrowUp/ArrowDown step, Enter/Space cycle
  container?: HTMLElement | null;  // view-height source + inert scope; default document.body (window height)
}

export interface SheetOptions {
  snapPoints?: SnapPoint[];            // default [] → content mode
  defaultSnapIndex?: number;           // default 0
  modal?: boolean;                     // default true
  dismissible?: boolean;               // default true
  reducedMotion?: boolean | "system";  // default "system"
  skipInitialAnimation?: boolean;
  labelledBy?: string;                 // aria-labelledby id
  describedBy?: string;                // aria-describedby id
  onOpenChange?(open: boolean): void;
  onSnapIndexChange?(index: number, point: SnapPoint): void;
  onDragStart?(): void;
  onDragEnd?(targetIndex: number | -1): void;
  onAnimationEnd?(open: boolean): void;
}

export interface SheetState {
  open: boolean; snapIndex: number; y: number; progress: number;   // progress: 0 closed → 1 topmost snap
  dragging: boolean; animating: boolean; contentMode: boolean;
}

export interface SheetController {
  open(): Promise<void>;
  close(): Promise<void>;
  snapTo(index: number, opts?: { immediate?: boolean }): Promise<void>;
  update(options: Partial<SheetOptions>): void;   // re-resolves snap points; re-snaps if the active value changed
  setElements(elements: Partial<SheetElements>): void; // (re)register optional parts after attach (null removes); rewires
                                                  // observers/listeners for the changed parts only; position is kept
  getState(): SheetState;
  subscribe(fn: (state: SheetState) => void): () => void;
  destroy(): void;                                // detach gesture + observers, restore scroll lock / inert / focus / styles.
                                                  // Idempotent. After destroy every method is a no-op; promise-returning
                                                  // methods resolve immediately (React strict mode double-invokes effects).
}

export function createSheet(elements: SheetElements, options?: SheetOptions): SheetController;
export { steps } from "./core/snap";
export type { SnapPoint, SnapPointConfig, SnapValue } from "./core/snap";
```

Semantics:
- `createSheet` starts **closed** (content translated to `viewHeight`, `data-state="closed"`). `open()` animates to the active snap. `elements.content` is required and fixed for the controller's lifetime; every other element may arrive later via `setElements`.
- **Content-inner measurement contract:** `"content"` measures `content.querySelector(":scope > [data-snap-sheet-inner]")`, falling back to `content.firstElementChild` when `content` has exactly one element child, else `content` itself. React's `Sheet.Content` always renders the attributed inner div; vanilla consumers add the attribute or keep a single wrapper child.
- Dismiss by drag / overlay / Escape: the controller closes itself, then calls `onOpenChange(false)`. A controlled React parent that refuses will re-open on the next render (one-frame bounce) — the documented way to veto is `dismissible: false`.
- `update({ snapPoints })` keeps `snapIndex` if still valid, else clamps; if the active snap's y changed (new points, measurement, resize) it animates there (spring), except on view-height change during a drag → immediate.
- The controller writes base layout styles inline on `content` **once** at attach (position fixed/absolute, inset, height, flex column, box-sizing, `touch-action: none`, `overscroll-behavior: none`), so consumers who set inline styles afterwards win. Dynamic writes each frame: `transform`, `--snap-sheet-y`, `--snap-sheet-progress` (on `content` and on `container`'s wrapper so the overlay can read it); at rest: `padding-bottom` / `--snap-sheet-offset`, `data-*`.
- `getState()` returns the **same object reference until the next state change** (replace the object on change, never mutate it) — `useSyncExternalStore` depends on this.
- Callbacks (`onOpenChange`, `onSnapIndexChange`, …) fire **after** the controller's own state is updated, and re-entrant calls from inside a callback are supported — e.g. the React layer calls `open()` from within `onOpenChange(false)` to bounce a controlled veto.
- Vanilla usage: consumer renders markup, calls `createSheet`, calls `open()`. No CSS file required; look-and-feel (background, radius, shadow) is the consumer's CSS.

### 2.3 React API — `snap-bottom-sheet/react`

#### Root

```tsx
interface SheetProps {
  open?: boolean;                     // controlled
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  snapPoints?: SnapPoint[];           // default: [] → content mode
  activeSnapIndex?: number;           // controlled
  defaultSnapIndex?: number;          // default 0
  onSnapIndexChange?: (index: number, snapPoint: SnapPoint) => void;

  modal?: boolean;                    // default true: Overlay shown, body scroll locked, siblings `inert`, Escape closes
  dismissible?: boolean;              // default true: drag below lowest snap / overlay click / Escape close the sheet
  skipInitialAnimation?: boolean;     // mount at position instead of animating from closed
  reducedMotion?: boolean | "system"; // default "system" (prefers-reduced-motion → immediate)

  onDragStart?: () => void;
  onDragEnd?: (targetIndex: number | -1) => void;   // -1 = closing
  onAnimationEnd?: (open: boolean) => void;          // spring at rest after open/close

  children?: React.ReactNode;
}

interface SheetHandle {
  snapTo(index: number, opts?: { immediate?: boolean }): Promise<void>;
  close(): Promise<void>;
  readonly activeSnapIndex: number;
  readonly y: number;                 // current px offset from top (0 = fully open)
}
```

`<Sheet ref={handle} …>` — `forwardRef` to `SheetHandle` (delegates to the core controller).

Controlled/uncontrolled via one `useControllableState(prop, defaultProp, onChange)` hook (Radix pattern) for both `open` and `activeSnapIndex`. Wiring: parts register their DOM nodes through context (callback refs); the Root's layout effect — which runs after all children mounted — calls `createSheet(elements, options)`, `controller.open()` when `open`, and `destroy()` on unmount. Prop changes → `controller.update(...)`; `open`/`activeSnapIndex` prop changes → `open()/close()/snapTo()` when they differ from `getState()`. Presence: Portal stays mounted while the close animation runs (`onAnimationEnd(false)` → unmount). `useSheetState()` exposes `SheetState` via `useSyncExternalStore(controller.subscribe, getState)`.

#### Parts

```
<Sheet>                                   context only, no DOM
  <Sheet.Portal container={el?}>          default document.body; renders null until mounted (SSR-safe)
    <Sheet.Overlay />                     only when `modal`; click → close if dismissible
    <Sheet.Content>                       the panel; role="dialog" aria-modal aria-labelledby/-describedby
      <Sheet.Handle />                    <button aria-label="Resize sheet">; click cycles snaps; ArrowUp/Down keys move one snap
      <Sheet.Header>…</Sheet.Header>      non-scrolling top region; defines "header"
      <Sheet.Body>…</Sheet.Body>          scroll region; scroll-vs-drag arbitration happens here
      <Sheet.Title/> <Sheet.Description/> <Sheet.Close/>   thin: id wiring / button that closes
    </Sheet.Content>
  </Sheet.Portal>
</Sheet>
```

Every part forwards `ref`, spreads rest props onto its element, merges `className`/`style`. No `asChild` (YAGNI — add later if asked). The annotations in the tree above (`role`, `aria-*`, `data-*`, CSS vars) describe the **resulting DOM**: the controller writes them at attach/runtime (§2.2); React parts render nothing state-dependent, which is also why server output carries no `data-state`.

Styling hooks (no CSS shipped except position/transform essentials):
- `data-state="open" | "closed"` on Overlay and Content; `data-snap-index`, `data-dragging`, `data-content-mode` on Content.
- CSS custom properties on Content, written directly to the DOM each frame (no React render):
  `--snap-sheet-y` (px offset from top), `--snap-sheet-progress` (0 closed → 1 at topmost snap),
  `--snap-sheet-offset` (px of panel below the viewport at rest; see §3.3).
  `--snap-sheet-progress` is also written on the Overlay element itself (the controller never touches ancestors or the
  document root); Overlay default style: `opacity: var(--snap-sheet-progress)`.
- `data-snap-sheet-no-drag` attribute on any descendant opts that region out of dragging.

### 2.4 Removed from 0.x

`isOpen`/`onClose`, `activeSnapPointIndex`, `onSnap(-1, null)`, `Sheet.Container`, `Sheet.DynamicHeight`, `SnapPointDynamicValue`, `wrapper`/`wrapperPortalElement`/`wrapperStyle`/`wrapperClassName`, `overlayColor`/`onOverlayClick`/`overlayStyle`/`overlayClassName`, `noInitialAnimation`, `useSnapState`, UMD + CJS builds, `./*` subpath exports. Migration table lives in `docs/guide/migration.md`.

## 3. Engine design

### 3.1 `@snap-bottom-sheet/spring`

```ts
interface SpringConfig { stiffness?: number; damping?: number; mass?: number; restDelta?: number; restSpeed?: number }
interface Spring {
  get(): number;
  getVelocity(): number;
  set(target: number, opts?: { immediate?: boolean; velocity?: number }): Promise<void>; // resolves at rest or when superseded
  stop(): void;
  subscribe(fn: (value: number) => void): () => void;
  readonly animating: boolean;
}
function createSpring(initial: number, config?: SpringConfig): Spring;
```

Defaults match react-spring's default feel: `stiffness 170, damping 26, mass 1, restDelta 0.01, restSpeed 0.01` (react-spring `tension`/`friction` map 1:1 to stiffness/damping). Integrator: semi-implicit Euler with fixed 1 ms sub-steps clamped to 64 ms per frame. Driven by `requestAnimationFrame`; no rAF access at import time; `set` with `immediate` writes synchronously and notifies subscribers. Zero dependencies. ≤ 150 LOC.

### 3.2 `@snap-bottom-sheet/gesture`

```ts
interface DragHandlers {
  onStart?(s: DragState): void;
  onMove?(s: DragState): void;
  onEnd?(s: DragState): void;     // also fired on pointercancel with s.cancelled = true
}
interface DragState {
  dy: number;            // px moved since start (+ = down)
  dx: number;
  vy: number;            // px/ms, from the last ~100 ms of samples
  cancelled: boolean;
  target: EventTarget | null;
  event: PointerEvent;
  cancel(): void;        // abandon this drag (no onEnd fires)
}
interface DragOptions {
  threshold?: number;    // px before onStart (default 3)
  axis?: "y";            // ignore drags whose |dx| > |dy| at threshold (default "y")
  filter?(target: Element): boolean;   // return false to ignore the pointerdown
}
function attachDrag(el: HTMLElement, handlers: DragHandlers, opts?: DragOptions): () => void;
```

Pointer Events only (mouse + touch + pen), `setPointerCapture` (guarded — jsdom lacks it), primary button only, ignores a second concurrent pointer, `pointercancel` → `onEnd` with `cancelled: true`. Does **not** touch `touch-action`; the caller owns CSS. Zero dependencies. ≤ 200 LOC.

Touch-action model used by the sheet (CSS spec: the browser walks from the touched element up to the *nearest ancestor with a default touch behaviour*, i.e. the nearest scroller, and only that segment's `touch-action` values matter): Content panel gets `touch-action: none`; `Sheet.Body` gets `overflow-y: auto; overscroll-behavior: contain` and default `touch-action` when the active snap allows scroll — native scrolling works because the walk stops at Body — and `overflow: hidden` otherwise, so the walk continues up to the panel and the drag wins. Pull-down at `scrollTop <= 0` is decided in JS (§3.4 rule 2).

### 3.3 Layout model (fixes AUDIT P0-8)

- Content panel: `position: fixed; top: 0; left: 0; right: 0; height: 100dvh` (fallback `100vh`), `display: flex; flex-direction: column; box-sizing: border-box; transform: translate3d(0, var(--snap-sheet-y), 0)`; `will-change: transform` while dragging/animating only.
- When Portal `container` is not `document.body`, the wrapper is `position: absolute; inset: 0` inside the container and view height = container's `offsetHeight`.
- **At rest** the library sets `padding-bottom: <y>px` on the panel (`--snap-sheet-offset`). The panel stays full-height (no gap appears while dragging up), but its content box ends exactly at the viewport bottom, so `Sheet.Body` (`flex: 1; min-height: 0; overflow-y: auto|hidden`) always scrolls to its true end. During a drag the padding is stale by design; it is corrected on the next rest.
- `"content"` measurement: `Sheet.Content` wraps children in an inner `div` that is measured by ResizeObserver. `Sheet.Body` is `overflow: hidden; flex: none` (natural height) whenever the active snap has `scroll !== true`, so the inner wrapper's height *is* the natural content height. At a `scroll: true` snap Body gets `flex: 1; min-height: 0; overflow-y: auto` and measurement is paused (the value is irrelevant there).
- `"header"` measurement: ResizeObserver on the `Sheet.Header` element.

### 3.4 Drag → snap rules

1. Drag start: blur a focused `input`/`textarea` inside the sheet (mobile ghost caret). Ignore if target is inside `[data-snap-sheet-no-drag]`, a `<select>`, or a text selection is active.
2. Drag vs scroll (only when the active snap has `scroll: true` and the pointer is inside Body): drag takes over iff `body.scrollTop <= 0` and `dy > 0` (pulling down), or the sheet is already displaced from its snap. Otherwise the native scroll proceeds and the drag is cancelled.
3. Live drag: `y = clamp(startY + dy, topmostY, viewHeight)`; respect `drag.up === false` / `drag.down === false` of the active snap (no movement in that direction). No rubber-banding above the topmost snap.
4. Release: `projected = y + vy * 200` (0.2 s projection, gorhom/react-modal-sheet rule). Target = nearest resolved snap to `projected`. If `projected` is below the lowest snap by more than `min(80px, 25% of lowest snap height)` and `dismissible` → close, else clamp to lowest. Fire `onSnapIndexChange` **before** animating; `onAnimationEnd` when the spring rests.
5. Keyboard: Escape closes when `dismissible` (and `modal`); `Sheet.Handle` ArrowUp/ArrowDown step one snap, Enter/Space cycles.

### 3.5 Scroll lock (fixes AUDIT P0-6)

Module-level reference counter. First `lock()` saves `overflow`, `overscroll-behavior`, `padding-right` (scrollbar gap = `innerWidth - clientWidth`) of `documentElement` and `body`, then sets `overflow: hidden; overscroll-behavior: none`. Last `unlock()` restores the saved values. Applied only when `modal`. `// ponytail: no iOS touchmove prevention; add react-aria-style usePreventScroll if iOS rubber-band reports come in.`

### 3.6 Accessibility

`role="dialog"`, `aria-modal={modal}`, `aria-labelledby` ← `Sheet.Title` id, `aria-describedby` ← `Sheet.Description` id (ids via `useId`). When `modal`: on open, set `inert` on every child of the portal container except the sheet wrapper; restore on close; move focus to the first focusable element inside Content (or Content itself with `tabIndex={-1}`); on close return focus to the previously focused element. Overlay is `aria-hidden`. `prefers-reduced-motion: reduce` → `immediate` springs. Handle is a real `<button>`.

Escape routing: a module-level stack of open `modal && dismissible` controllers (push on `open()`, remove on `close()`/`destroy()`) and one shared `document` keydown listener installed while the stack is non-empty; Escape closes only `stack.at(-1)`. (`stopPropagation` cannot scope same-node listeners, and registration order would favour the *outer* sheet.)

### 3.7 Nested sheets

Each sheet has its own Portal wrapper and overlay element (no shared ids — fixes P0-5). Drag events do not bubble past a sheet's Content (`stopPropagation` in `onStart`). Scroll lock is reference-counted so an inner sheet closing does not unlock the page. Escape goes to the innermost open sheet via the controller stack (§3.6).

## 4. Phases, ownership, commits

Three worker sessions: **W1**, **W2**, **W3**. Orchestrator reviews each task's diff, merges into `v1`, then dispatches the next. A task = one branch = one or more commits = one merge.

| Phase | Task file | Worker | Depends on | Commit(s) |
|---|---|---|---|---|
| 0 | `tasks/00-scaffold.md` | W1 | — | `chore!: restructure into pnpm monorepo with tsdown, biome, vitest, changesets` ✅ 8d2acc0 |
| 1a | `tasks/01-spring.md` | W1 | 0 | `feat(spring): scalar spring primitive` ✅ f7f7668 |
| 1b | `tasks/02-gesture.md` | W2 | 0 | `feat(gesture): pointer drag primitive` ✅ 21dc1bd |
| 1c | `tasks/03-core-pure.md` | W3 | 0 | `feat(core): snap resolution, scroll lock, measurement modules` ✅ b0ef8e2 |
| 2a | `tasks/04-core-controller.md` (+04b) | W1 | 1a, 1b, 1c | `feat(core)!: framework-agnostic sheet controller (createSheet)` ✅ cce05f1 |
| 2b | `tasks/07-react.md` (+07b follow-up: setElements wiring, export trim, setup file) | W2 | 1c (built against the §2.2 contract with a mocked controller; integrated after 2a) | `feat(react)!: React bindings on the core controller`, `test(react): …` ✅ b828a41 |
| 2c | `tasks/06-meta.md` | W3 | 0 | `docs: README, CONTRIBUTING, CLAUDE.md, 1.0 changeset` |
| 2d | `tasks/05-docs.md` | W2 (after 07b) | 1c | `docs: VitePress site with guides and reference` |
| 3a | `tasks/08-playgrounds.md` | W1 | 2a, 2b | `chore: vanilla, react and next playgrounds` |
| 3b | `tasks/09-docs-demos.md` | W2 or W3 (whoever is free) | 2a, 2b, 2d | `docs: live React demos` |
| 3c | `tasks/10-integration-tests.md` | W3 | 2a, 2b | `test(sheet): end-to-end controller + react integration, audit regressions, size budget` |
| 4 | review loop | orchestrator + any idle worker | 3 | `fix: address code review findings` |

Phase 1 tasks run in parallel (disjoint directories). Phase 2 runs in parallel too: core controller (`src/core`), React bindings (`src/react`, mocked controller), meta+docs (root files, `docs/`). Phase 3 waits for 2a+2b. Task files for later phases are drafted early and finalised by the orchestrator when their dependencies have merged, so they reflect the real code.

### 4.1 Worker protocol

1. `git fetch` is unnecessary (same repo). Start: `git checkout -b <worker>/<task-slug> v1` in your own worktree.
2. Read the task file, this plan's referenced sections, and every file you will touch.
3. Implement. Verify with the task's **Done when** commands. Commit (conventional commits, `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` trailer).
4. Do **not** run `graphify update .` or commit anything under `graphify-out/` — the orchestrator regenerates the graph once per merge (generated files conflict on every parallel branch otherwise). `git checkout -- graphify-out` if it shows as modified.
5. Report to the orchestrator via `mcp__ccd_session_mgmt__send_message` (session `local_39e24a00-657f-4cc2-9ee3-cc3043741433`) using the report format in the task file. Include branch name and HEAD sha.
6. Do not merge. Do not touch `v1` or `main`. Wait for the next task.
7. Use subagents freely for independent sub-parts (source vs tests, disjoint file groups, research) — the owner wants speed. The worker itself integrates the pieces and runs every "Done when" command before committing.

### 4.2 Definition of done (whole project)

`pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm verify:pkg && pnpm docs:build && pnpm --filter playground-next build` all green from a clean checkout of `v1`; every AUDIT P0 has a regression test; `open-code-review` reports no unaddressed findings.
