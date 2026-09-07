# Core API

The framework-agnostic engine: `createSheet` attaches to DOM elements you already rendered and owns every behaviour from there.

```ts
import { createSheet, steps } from "snap-bottom-sheet";
import type {
  SheetController,
  SheetElements,
  SheetOptions,
  SheetState,
  SnapPoint,
} from "snap-bottom-sheet";
```

This entry has **no peer dependencies** — it is plain TypeScript and works in
vanilla JS, Vue, Svelte or anything else. The React bindings in
[`snap-bottom-sheet/react`](/reference/react) are a thin layer over exactly this
API.

## `createSheet(elements, options?)`

```ts
function createSheet(
  elements: SheetElements,
  options?: SheetOptions,
): SheetController;
```

Attaches the engine to `elements.content` and returns a controller.
`elements.content` is required — calling `createSheet` without it throws a
`TypeError`. The sheet starts **closed**; call `open()` to show it.

```ts
const controller = createSheet(
  {
    content: document.querySelector("#sheet")!,
    header: document.querySelector("#sheet-header"),
    body: document.querySelector("#sheet-body"),
    overlay: document.querySelector("#sheet-overlay"),
    handle: document.querySelector("#sheet-handle"),
  },
  {
    snapPoints: ["header", 0.5, 1],
    defaultSnapIndex: 1,
    onSnapIndexChange: (index) => console.log("snap", index),
  },
);

await controller.open();
```

## `SheetElements`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `content` | `HTMLElement` | yes | The panel. Receives the transform, `padding-bottom`, `data-*`, the CSS custom properties, `role`/`aria-*`, and the drag listeners. **Fixed for the controller's lifetime.** |
| `header` | `HTMLElement \| null` | no | Measured with a shared `ResizeObserver` for the `"header"` snap value. |
| `body` | `HTMLElement \| null` | no | The scroll region: `overflow` is toggled per active snap, and scroll-vs-drag arbitration reads its `scrollTop`. |
| `overlay` | `HTMLElement \| null` | no | Positioned at attach (`position: fixed`, or `absolute` with a `container`, plus `inset: 0`). Gets `data-state`, `aria-hidden="true"`, `--snap-sheet-progress`, and a click listener that closes when `dismissible`. Colour, `pointer-events` and `z-index` stay yours. |
| `handle` | `HTMLElement \| null` | no | Gets `aria-label="Resize sheet"` when it has none, plus the keyboard handlers (<kbd>ArrowUp</kbd>/<kbd>ArrowDown</kbd> step and clamp, <kbd>Enter</kbd>/<kbd>Space</kbd> cycle and wrap). |
| `container` | `HTMLElement \| null` | no | View-height source and `inert` scope; defaults to the window / `document.body`. With a container the panel is `position: absolute; height: 100%` and view height is the container's `offsetHeight`. Only the container's own children are made inert, so anything outside it stays interactive. **Fixed for the controller's lifetime.** |

Every optional element may arrive later through
[`setElements`](#setelements-elements). `content` and `container` may not —
passing either one to `setElements` throws a `TypeError`. Pass them at
`createSheet` time.

## `SheetOptions`

All optional.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `snapPoints` | `SnapPoint[]` | `[]` | Snap positions in your array order. `[]` (or all-`"content"`) is content mode. See [Snap Points](/reference/snap-points). |
| `defaultSnapIndex` | `number` | `0` | Index the sheet opens at. Clamped, with a dev warning, when out of range. |
| `modal` | `boolean` | `true` | Lock page scroll, apply `inert` to siblings, enable Escape, and drive the overlay's state. |
| `dismissible` | `boolean` | `true` | Allow drag-below, overlay click and Escape to close. `false` clamps back to the lowest snap instead. |
| `reducedMotion` | `boolean \| "system"` | `"system"` | `true` → every animation immediate; `"system"` → follows `prefers-reduced-motion: reduce`. |
| `skipInitialAnimation` | `boolean` | `false` | The **first `open()` of this controller instance** jumps to the active snap instead of animating from closed. Every later `open()` animates; a fresh controller gets a fresh first `open()`. |
| `labelledBy` | `string` | — | Written as `aria-labelledby` on `content`. Removed again when set back to `undefined` via `update()`. |
| `describedBy` | `string` | — | Written as `aria-describedby` on `content`. |
| `onOpenChange` | `(open: boolean) => void` | — | Fires after internal state updated, including on self-initiated dismissals. |
| `onSnapIndexChange` | `(index: number, point: SnapPoint) => void` | — | Only when the index actually changes, and before the animation starts. Never fires in content mode. |
| `onDragStart` | `() => void` | — | Drag passed the 3 px threshold. |
| `onDragEnd` | `(targetIndex: number) => void` | — | Release target decided, before the spring starts. `-1` = closing; on a drag dismissal `onDragEnd(-1)` fires **before** `onOpenChange(false)`. |
| `onAnimationEnd` | `(open: boolean) => void` | — | The open/close spring reached rest. Fires once per transition. |

## `SheetState`

```ts
interface SheetState {
  open: boolean;
  snapIndex: number;
  y: number;
  progress: number;
  dragging: boolean;
  animating: boolean;
  contentMode: boolean;
}
```

| Field | Type | Description |
| --- | --- | --- |
| `open` | `boolean` | `true` from the start of `open()`. Flips to `false` when closing **starts** — not when it finishes, which is when `data-state="closed"` lands. |
| `snapIndex` | `number` | Active snap in your array order; always `0` in content mode. |
| `y` | `number` | Px offset of the panel top from the top of the view. `0` = fully open, view height = closed. |
| `progress` | `number` | `0` closed → `1` at the topmost **declared** snap. |
| `dragging` | `boolean` | A pointer drag is in progress. |
| `animating` | `boolean` | The spring is running. |
| `contentMode` | `boolean` | No real snap points; the single snap is synthesized from the measured content height. |

## `SheetController`

```ts
interface SheetController {
  open(): Promise<void>;
  close(): Promise<void>;
  snapTo(index: number, opts?: { immediate?: boolean }): Promise<void>;
  update(options: Partial<SheetOptions>): void;
  setElements(elements: Partial<SheetElements>): void;
  getState(): SheetState;
  subscribe(fn: (state: SheetState) => void): () => void;
  destroy(): void;
}
```

### `open()`

`() => Promise<void>` — animate from closed to the active snap. Sets
`data-state="open"` immediately, locks page scroll and applies `inert` to
siblings when `modal`, remembers `document.activeElement` and moves focus to the
first focusable element inside `content` (or `content` itself). Resolves when the
spring rests; `onAnimationEnd(true)` fires then. With no resolvable snap points
the sheet stays closed and warns in dev.

`open()` is the only way to show a closed sheet: `snapTo(i)` on a closed sheet
just changes which snap it will open at, it does not open it. The React
[`SheetHandle`](/reference/react#sheethandle) mirrors both methods with the same
semantics.

### `close()`

`() => Promise<void>` — animate to closed, restore focus, release the scroll
lock, remove `inert`. `SheetState.open` goes `false` as the close **starts**,
while `data-state="closed"` is written **after** the animation rests, so a CSS
transition on the overlay or panel still plays. Ignores `dismissible` — that
option only governs user-initiated dismissal.

### `snapTo(index, opts?)`

`(index: number, opts?: { immediate?: boolean }) => Promise<void>` — animate to
a snap by **your** array index. Out-of-range indices are clamped with a dev
warning. `onSnapIndexChange` fires only when the index actually changed, before
the animation. `immediate: true` jumps. At rest the controller applies
`data-snap-index`, the Body `overflow` for that snap, and `padding-bottom` /
`--snap-sheet-offset`. Resolves at rest.

### `update(options)`

`(options: Partial<SheetOptions>) => void` — merge new options, re-resolve the
snap points, and re-apply anything they affect: `modal` toggles the scroll lock
and `inert` while open, `dismissible` pushes or pops the Escape target,
`labelledBy`/`describedBy` rewrite (or remove) the aria attributes. Callbacks are
replaced wholesale.

### `setElements(elements)`

`(elements: Partial<SheetElements>) => void` — register or replace optional parts
after attach. Only the keys you pass are touched: the old element's observer,
listeners and library-written styles are detached, the new one is wired, and the
snap points are re-resolved. `null` removes a part. The spring position is
untouched, so nothing moves.

::: warning
`content` and `container` are fixed for a controller's lifetime:
`setElements({ content })` and `setElements({ container })` each throw a
`TypeError`. Destroy the controller and create a new one instead — the React
bindings do exactly that when either element's identity changes.
:::

### `getState()`

`() => SheetState` — the current state. Returns the **same object reference**
until something changes (a new frozen object replaces it on change), which is
what makes `useSyncExternalStore` safe.

### `subscribe(fn)`

`(fn: (state: SheetState) => void) => () => void` — called on every state
change; returns an unsubscribe function. `y` and `progress` are coalesced to at
most one notification per animation frame. For per-frame visuals use the CSS
custom properties instead — see [Styling Hooks](/reference/styling-hooks).

### `destroy()`

`() => void` — detach the gesture, listeners and observers; cancel the spring;
restore focus, the scroll lock and `inert` if the sheet was open; remove the
styles and attributes the library wrote (yours are left alone). Idempotent.

## Semantics

The details that decide how the engine behaves at the edges.

- **It starts closed.** `createSheet` translates `content` to `viewHeight` and
  writes `data-state="closed"`; nothing animates until `open()`.
- **Dismissal is not a request.** On a drag below the lowest snap, an overlay
  click or Escape, the controller closes itself first and calls
  `onOpenChange(false)` afterwards. A controlled parent that refuses — a React
  `open` prop that stays `true` — re-opens the sheet on the next render, and that
  is a visible **one-frame bounce**. The supported way to refuse a dismissal is
  `dismissible: false`, which clamps the drag back to the lowest snap.
- **`update({ snapPoints })` keeps your index if it is still valid**, clamps it
  otherwise. If the active snap's y moved — new points, a fresh measurement, a
  resize — the sheet springs to the new position. The one exception is a
  view-height change during a drag, which is applied immediately instead of
  animated.
- **Content-inner measurement contract.** The `"content"` snap measures
  `content.querySelector(":scope > [data-snap-sheet-inner]")`; failing that,
  `content.firstElementChild` when `content` has exactly one element child; and
  failing that, `content` itself. React's `Sheet.Content` always renders the
  attributed inner div. In vanilla, either add
  `data-snap-sheet-inner` to your wrapper or keep the panel down to a single
  element child.
- **When each style is written.** Base layout goes onto `content` **once at
  attach**: `position: fixed` (or `absolute` with a container), `top/left/right:
  0`, `height: 100dvh` (or `100%`), `display: flex; flex-direction: column`,
  `box-sizing: border-box`, `touch-action: none`, `overscroll-behavior: none`.
  `overlay` gets its positioning at attach too — `position: fixed` (or
  `absolute` with a container) and `inset: 0`; its colour, `pointer-events` and
  `z-index` stay yours. Inline styles you set afterwards therefore win.
  **Each frame**, from the
  spring: `transform`, `--snap-sheet-y`, and `--snap-sheet-progress` on `content`
  and on `overlay`. **At rest only**: `padding-bottom` / `--snap-sheet-offset`,
  `data-snap-index`, and the Body `overflow`/`flex` for the active snap.
  Ancestors and the document root are never touched.
- **Callbacks run after state is updated, and re-entrant calls work.** Calling
  `open()` from inside `onOpenChange(false)` is supported and is exactly how the
  React layer bounces a controlled veto.
- **`destroy()` is idempotent, and life after it is quiet.** Every method becomes
  a no-op; `open()`, `close()` and `snapTo()` return promises that resolve
  immediately. React's strict-mode double-invoked effects need this.
- **No CSS is shipped.** The library writes only what position and transform
  require; background, radius, shadow, the grabber and the overlay colour are
  yours.

## `steps(count, opts?)`

Re-exported from the snap module for convenience — see
[Snap Points](/reference/snap-points#steps-count-opts).

## Where next

- [Vanilla JS](/guide/vanilla) — a full `createSheet` example with markup and CSS.
- [Snap Points](/reference/snap-points) — every value form and the resolution rules.
- [Styling Hooks](/reference/styling-hooks) — the data attributes and CSS properties.
