# Core API

The framework-free engine. `createSheet` attaches to DOM elements you have already rendered, and takes care of every behaviour from that point on.

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

This entry has **no peer dependencies**. It is plain TypeScript, so it works in
vanilla JS, Vue, Svelte or anything else. The React bindings in
[`snap-bottom-sheet/react`](/reference/react) are a thin layer over this same
API.

## `createSheet(elements, options?)`

```ts
function createSheet(
  elements: SheetElements,
  options?: SheetOptions,
): SheetController;
```

Attaches the engine to `elements.content` and returns a controller.
`elements.content` is required. Calling `createSheet` without it throws a
`TypeError`. The sheet starts **closed**, so call `open()` to show it.

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
| `content` | `HTMLElement` | yes | The panel. It receives the transform, `padding-bottom`, the `data-*` attributes, the CSS custom properties, `role`/`aria-*` and the drag listeners. **Fixed for the controller's lifetime.** |
| `header` | `HTMLElement \| null` | no | Measured with a shared `ResizeObserver` for the `"header"` snap value. |
| `body` | `HTMLElement \| null` | no | The scroll region. The engine sets its `overflow`, `touch-action` and `overscroll-behavior` for each active snap. At a snap with `scroll: true` it also drives the element's `scrollTop` for touch gestures, so one gesture can move the sheet and then scroll the content. The wheel, the keyboard and the scrollbar stay native. See [Scrolling](/guide/scrolling). |
| `overlay` | `HTMLElement \| null` | no | Positioned at attach, with `position: fixed` (or `absolute` when there is a `container`) and `inset: 0`. It also gets `data-state`, `aria-hidden="true"`, `--snap-sheet-progress` and a click listener that closes the sheet when `dismissible`. Under `modal: false` it is hidden with `display: none`, and shown again if `modal` turns back on, so a non-modal panel leaves no invisible click catcher over the page. The colour, `pointer-events` and `z-index` remain yours. |
| `handle` | `HTMLElement \| null` | no | Gets `aria-label="Resize sheet"` if it has none, plus the keyboard handlers. <kbd>ArrowUp</kbd>/<kbd>ArrowDown</kbd> step and clamp, and <kbd>Enter</kbd>/<kbd>Space</kbd> cycle and wrap. |
| `container` | `HTMLElement \| null` | no | The source of the view height, and the scope of modal behaviour. It defaults to the window and `document.body`. With a container the panel is `position: absolute; height: 100%`, and the view height is the container's `offsetHeight`. Only the container's own children are made inert. `modal` then locks the **container's** `overflow`/`overscroll-behavior` rather than the document's, saved and restored with a reference count per container, so an embedded sheet leaves the host page scrolling. Escape still works page-wide. **Fixed for the controller's lifetime.** |

Every optional element may arrive later through
[`setElements`](#setelements-elements). `content` and `container` may not.
Passing either one to `setElements` throws a `TypeError`, so pass them when you
call `createSheet`.

## `SheetOptions`

All optional.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `snapPoints` | `SnapPoint[]` | `[]` | Snap positions, in the order you wrote them. An empty array, or one holding only `"content"`, means content mode. See [Snap Points](/reference/snap-points). |
| `defaultSnapIndex` | `number` | `0` | The index the sheet opens at. A value out of range is clamped, with a warning in development. |
| `modal` | `boolean` | `true` | Locks scrolling, applies `inert` to siblings, enables Escape, and sets the overlay's state. The lock and `inert` apply within `elements.container` when there is one, so an embedded sheet does not freeze the host page. |
| `dismissible` | `boolean` | `true` | Lets a drag below the lowest snap, an overlay click or Escape close the sheet. With `false` the sheet returns to the lowest snap instead. |
| `reducedMotion` | `boolean \| "system"` | `"system"` | `true` makes every animation immediate. `"system"` follows `prefers-reduced-motion: reduce`. |
| `skipInitialAnimation` | `boolean` | `false` | The **first `open()` on this controller** jumps to the active snap rather than animating up from closed. Every later `open()` animates. A new controller gets a new first `open()`. |
| `labelledBy` | `string` | — | Written as `aria-labelledby` on `content`. Set it back to `undefined` through `update()` and the attribute is removed. |
| `describedBy` | `string` | — | Written as `aria-describedby` on `content`. |
| `onOpenChange` | `(open: boolean) => void` | — | Runs after the internal state has changed. It also runs when the sheet dismisses itself. |
| `onSnapIndexChange` | `(index: number, point: SnapPoint) => void` | — | Runs only when the index really changes, and before the animation starts. A drag released back onto the snap it started from stays **silent**, so use `onDragEnd` if you need every release. It never runs in content mode. |
| `onDragStart` | `() => void` | — | The gesture passed the 3 px threshold and the sheet has taken it. A gesture inside a scrollable `body` counts, because the sheet owns both its phases. |
| `onDragEnd` | `(targetIndex: number) => void` | — | The target of the release has been chosen, and the spring has not started yet. It runs on **every** release, including one that lands back on the snap it started from. `-1` means the sheet is closing. When a drag dismisses the sheet, `onDragEnd(-1)` runs **before** `onOpenChange(false)`. When the release happened while the gesture was scrolling the body's content, it reports the snap the sheet is resting at. |
| `onAnimationEnd` | `(open: boolean) => void` | — | The open or close spring came to rest. It runs once per transition. |

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
| `open` | `boolean` | `true` from the start of `open()`. It turns `false` when closing **starts**, not when it finishes. The finish is when `data-state="closed"` is written. |
| `snapIndex` | `number` | The active snap, in the order you wrote your array. In content mode it is always `0`. |
| `y` | `number` | The offset in px of the panel's top from the top of the view. `0` means fully open, and the view height means closed. |
| `progress` | `number` | `0` when closed, rising to `1` at the topmost snap you **declared**. |
| `dragging` | `boolean` | A pointer drag is in progress. |
| `animating` | `boolean` | The spring is running. |
| `contentMode` | `boolean` | There are no real snap points. The single snap is built from the measured content height. |

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

`() => Promise<void>` — animates from closed to the active snap. It writes
`data-state="open"` straight away. When `modal`, it also locks page scrolling and
applies `inert` to the siblings. It remembers `document.activeElement`, then
moves focus to the first focusable element inside `content`, or to `content`
itself. The promise resolves when the spring comes to rest, which is also when
`onAnimationEnd(true)` runs. If no snap point can be resolved, the sheet stays
closed and warns in development.

`open()` is the only way to show a closed sheet. On a closed sheet, `snapTo(i)`
only changes which snap it will open at. The React
[`SheetHandle`](/reference/react#sheethandle) offers both methods and behaves the
same way.

### `close()`

`() => Promise<void>` — animates to closed, restores focus, releases the scroll
lock and removes `inert`. `SheetState.open` turns `false` as the close
**starts**, while `data-state="closed"` is written **after** the animation comes
to rest, so a CSS transition on the overlay or the panel still plays. This method
ignores `dismissible`, because that option only covers dismissal by the user.

### `snapTo(index, opts?)`

`(index: number, opts?: { immediate?: boolean }) => Promise<void>` — animates to
a snap, using **your** array index. An index out of range is clamped, with a
warning in development. `onSnapIndexChange` runs only when the index really
changed, and it runs before the animation. With `immediate: true` the sheet
jumps instead. Once the sheet is at rest, the controller writes
`data-snap-index`, the Body `overflow` for that snap, and `padding-bottom` and
`--snap-sheet-offset`. The promise resolves at rest as well.

### `update(options)`

`(options: Partial<SheetOptions>) => void` — merges the new options, resolves the
snap points again, and re-applies whatever they affect. While the sheet is open,
`modal` turns the scroll lock and `inert` on or off. `dismissible` adds or
removes the Escape target. `labelledBy` and `describedBy` rewrite the matching
aria attributes, or remove them. Callbacks are replaced as a whole.

### `setElements(elements)`

`(elements: Partial<SheetElements>) => void` — registers or replaces the optional
parts after attach. Only the keys you pass are touched. The old element loses its
observer, its listeners and the styles the library wrote, the new element is
wired up, and the snap points are resolved again. Passing `null` removes a part.
The spring position is left alone, so nothing moves.

::: warning
`content` and `container` are fixed for the lifetime of a controller.
`setElements({ content })` and `setElements({ container })` each throw a
`TypeError`. Please destroy the controller and create a new one instead. The
React bindings do this for you when either element changes identity.
:::

### `getState()`

`() => SheetState` — the current state. It returns the **same object reference**
until something changes, and on a change a new frozen object takes its place.
That is what makes `useSyncExternalStore` safe here.

### `subscribe(fn)`

`(fn: (state: SheetState) => void) => () => void` — calls your function on every
state change, and returns a function that unsubscribes. Changes to `y` and
`progress` are grouped into at most one notification per animation frame. For
visuals that follow every frame, please use the CSS custom properties instead.
See [Styling Hooks](/reference/styling-hooks).

### `destroy()`

`() => void` — detaches the gesture, the listeners and the observers, cancels the
spring, and restores focus, the scroll lock and `inert` if the sheet was open. It
also removes the styles and attributes the library wrote, and leaves yours alone.
Calling it more than once is safe.

## Semantics

The details that decide how the engine behaves in the difficult cases.

- **It starts closed.** `createSheet` moves `content` down to `viewHeight` and
  writes `data-state="closed"`. Nothing animates until you call `open()`.
- **A dismissal is not a request.** When you drag below the lowest snap, click
  the overlay or press Escape, the controller closes itself first and calls
  `onOpenChange(false)` afterwards. A controlled parent cannot refuse. A React
  `open` prop that stays `true` re-opens the sheet on the next render, and you
  see a **one-frame bounce**. To refuse a dismissal, use `dismissible: false`.
  The drag then returns to the lowest snap.
- **`update({ snapPoints })` keeps your index if it is still valid**, and clamps
  it if it is not. If the y of the active snap has moved, the sheet springs to
  the new position. That happens with new points, a fresh measurement or a
  resize. There is one exception: a change in view height during a drag is
  applied at once rather than animated.
- **How the content height is measured.** The `"content"` snap measures
  `content.querySelector(":scope > [data-snap-sheet-inner]")`. If there is no
  such element, it measures `content.firstElementChild` when `content` has
  exactly one element child. If that fails too, it measures `content` itself.
  In React, `Sheet.Content` always renders the inner div with that attribute. In
  vanilla, please add `data-snap-sheet-inner` to your wrapper, or keep the panel
  down to a single element child. The element is chosen **once, at attach**, and
  observed for the lifetime of the controller. If you replace the wrapper later,
  the controller keeps measuring a detached node and `"content"` stops following
  the height. Keep the wrapper element stable and change its contents instead,
  or create the sheet again.
- **When each style is written.** The base layout goes onto `content` **once, at
  attach**: `position: fixed` (or `absolute` with a container), `top/left/right:
  0`, `height: 100dvh` (or `100%`), `display: flex; flex-direction: column`,
  `box-sizing: border-box`, `touch-action: none`, `overscroll-behavior: none`.
  `overlay` gets its positioning at attach too, which is `position: fixed` (or
  `absolute` with a container) and `inset: 0`. Its colour, `pointer-events` and
  `z-index` stay yours. Inline styles you set after attach therefore win.
  **On each frame**, the spring writes `transform`, `--snap-sheet-y` and
  `--snap-sheet-progress` on `content` and on `overlay`. **At rest only**, the
  controller writes `padding-bottom` and `--snap-sheet-offset`,
  `data-snap-index`, and the Body `overflow`, `flex` and `touch-action` for the
  active snap. The Body's `scrollTop` is written outside that cadence, while a
  touch gesture scrolls the content and while the momentum afterwards runs.
  Ancestors and the document root are never touched. While attached, `content`
  and `overlay` also carry `data-snap-sheet-part`. The drag layer uses that
  marker to tell its own parts from those of a nested sheet, so please treat it
  as internal. A `container` that is not positioned already is given
  `position: relative`, with a warning in development, because the panel is
  positioned against it. `destroy()` puts it back.
- **Callbacks run after the state is updated, and they may call the controller
  again.** Calling `open()` from inside `onOpenChange(false)` is supported. It is
  how the React layer bounces back when a controlled parent refuses a dismissal.
- **`destroy()` can be called more than once, and the controller then goes
  quiet.** Every method becomes a no-op, and `open()`, `close()` and `snapTo()`
  return promises that resolve at once. React needs this because strict mode runs
  effects twice.
- **No CSS ships with the library.** It writes only what position and transform
  require. The background, radius, shadow, grabber and overlay colour are yours.

## `steps(count, opts?)`

Re-exported from the snap module so you can import it from here. See
[Snap Points](/reference/snap-points#steps-count-opts).

## Where next

- [Vanilla JS](/guide/vanilla) — a full `createSheet` example, with markup and CSS.
- [Snap Points](/reference/snap-points) — every value form and the rules for resolving them.
- [Styling Hooks](/reference/styling-hooks) — the data attributes and the CSS properties.
