# React API

Every export of `snap-bottom-sheet/react`: the `Sheet` root, its nine parts, the `SheetHandle` ref API, and `useSheetState()`.

```tsx
import { Sheet, useSheetState } from "snap-bottom-sheet/react";
import type { SheetHandle, SheetState } from "snap-bottom-sheet/react";
import type { SnapPoint } from "snap-bottom-sheet";
```

## `<Sheet>`

The root renders no DOM. It holds the controllable state, creates one core
controller when its children have mounted, and mirrors prop changes into
`controller.update()`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Controlled open state. When set, the sheet never changes it on its own; it only reports through `onOpenChange`. |
| `defaultOpen` | `boolean` | `false` | Initial open state in uncontrolled mode. |
| `onOpenChange` | `(open: boolean) => void` | — | Fired after the controller's own state changed — on `open()`, `close()`, and every dismissal (drag, overlay click, Escape). |
| `snapPoints` | `SnapPoint[]` | `[]` | Snap positions in **your** array order. `[]` (or all-`"content"`) means content mode. See [Snap Points](/reference/snap-points). |
| `activeSnapIndex` | `number` | — | Controlled active snap, as an index into `snapPoints`. |
| `defaultSnapIndex` | `number` | `0` | Snap the sheet opens at in uncontrolled mode. Out-of-range values are clamped with a dev warning. |
| `onSnapIndexChange` | `(index: number, snapPoint: SnapPoint) => void` | — | Fired when the active snap index changes — before the spring starts animating. Never fires in content mode. |
| `modal` | `boolean` | `true` | Overlay is shown, page scroll is locked, siblings in the portal container get `inert`, Escape closes. |
| `dismissible` | `boolean` | `true` | Drag below the lowest snap, overlay click and Escape close the sheet. `false` clamps back instead — this is the way to veto dismissal. |
| `skipInitialAnimation` | `boolean` | `false` | Mount at the active snap instead of animating up from closed. |
| `reducedMotion` | `boolean \| "system"` | `"system"` | `true` makes every transition immediate; `"system"` follows `prefers-reduced-motion: reduce`. |
| `onDragStart` | `() => void` | — | The drag passed the 3 px threshold. |
| `onDragEnd` | `(targetIndex: number) => void` | — | The release target has been decided, before the spring starts. `-1` means the sheet is closing. |
| `onAnimationEnd` | `(open: boolean) => void` | — | The open or close spring reached rest. The close one is what unmounts the portal subtree. |
| `children` | `React.ReactNode` | — | Rendered only while the sheet is present (open, or still playing its close animation). |
| `ref` | `Ref<SheetHandle>` | — | Imperative handle, see [`SheetHandle`](#sheethandle). |

::: warning A controlled `open` cannot veto a dismissal
On a dismissal the controller closes itself first and calls `onOpenChange(false)`
afterwards. A controlled parent that keeps `open` at `true` makes the sheet
re-open on the next render — a visible one-frame bounce. Use
`dismissible={false}`.
:::

::: info Identity of `snapPoints`
The root compares `snapPoints` by value, so passing a fresh literal array on
every render does not re-resolve the snaps.
:::

## Parts

The whole compound tree:

```tsx
<Sheet open={open} onOpenChange={setOpen} snapPoints={[0.4, 0.9]}>
  <Sheet.Portal>
    <Sheet.Overlay />
    <Sheet.Content>
      <Sheet.Handle />
      <Sheet.Header>
        <Sheet.Title>Title</Sheet.Title>
        <Sheet.Description>Description</Sheet.Description>
      </Sheet.Header>
      <Sheet.Body>…</Sheet.Body>
      <Sheet.Close>Done</Sheet.Close>
    </Sheet.Content>
  </Sheet.Portal>
</Sheet>
```

Common to every part:

- It forwards `ref` to its DOM element and spreads all remaining props onto it,
  so any native attribute or event handler works.
- `className` and `style` are merged with what the part itself needs, never
  replaced.
- There is no `asChild` and no polymorphic `as` prop. If you need a different
  element, wrap or nest your own.
- **No part renders anything state-dependent.** `role`, `aria-*`, `data-*` and
  the CSS custom properties listed below are written by the core controller
  straight to the DOM, which is why server-rendered markup carries none of them
  and why they never cost a React render. The full list lives in
  [Styling Hooks](/reference/styling-hooks).

### `Sheet.Portal`

Renders its children into a portal. Nothing else.

```tsx
<Sheet.Portal container={ref.current}>{children}</Sheet.Portal>
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `container` | `HTMLElement \| null` | `document.body` | Portal target. Also becomes the controller's `elements.container`, which makes it the view-height source and the `inert` scope. |
| `children` | `React.ReactNode` | — | The sheet's DOM. |

- Renders `null` on the server **and on the first client render**, then portals
  after mount — so there is no hydration mismatch and no `document` access
  during render. No `dynamic(() => …, { ssr: false })` needed.
- Stays mounted while the close animation runs; the root unmounts it when the
  controller reports `onAnimationEnd(false)`.
- These are the only props it takes: no `ref`, no `className`, no styling. When
  `container` is not `document.body` the panel is positioned `absolute` inside
  it instead of `fixed`, and view height is the container's `offsetHeight`.

### `Sheet.Overlay`

| | |
| --- | --- |
| Renders | `<div>` |
| Own props | none beyond native `div` props |
| Data attributes | `data-state="open" \| "closed"` |
| CSS properties | `--snap-sheet-progress` |
| Behaviour | Click closes the sheet when `dismissible`; `aria-hidden="true"` is set at attach. |

Render it only in a modal sheet. `--snap-sheet-progress` is written on the
overlay element itself, so the fade is one line of CSS:

```tsx
<Sheet.Overlay className="overlay" />
```

```css
.overlay {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 0.4);
  opacity: var(--snap-sheet-progress);
}
```

### `Sheet.Content`

The panel. Everything else lives inside it.

| | |
| --- | --- |
| Renders | `<div>`, with children wrapped in a single inner `<div data-snap-sheet-inner>` |
| Own props | none beyond native `div` props |
| Attributes | `role="dialog"`, `aria-modal` (when `modal`), `aria-labelledby` / `aria-describedby` (from a rendered `Sheet.Title` / `Sheet.Description`), `tabindex="-1"` when you did not set one |
| Data attributes | `data-state`, `data-snap-index`, `data-dragging`, `data-content-mode` |
| CSS properties | `--snap-sheet-y`, `--snap-sheet-progress`, `--snap-sheet-offset` |
| Behaviour | Drag target; base layout styles are written once at attach; `transform` and the CSS properties are written per frame. |

- The inner `data-snap-sheet-inner` div is the element measured for the
  `"content"` snap value. Do not remove it or add `overflow` to it.
- Base layout written once at attach: `position: fixed` (or `absolute` with a
  Portal `container`), `top/left/right: 0`, `height: 100dvh` (or `100%`),
  `display: flex; flex-direction: column`, `box-sizing: border-box`,
  `touch-action: none`, `overscroll-behavior: none`. Inline styles you set
  afterwards win — background, radius and shadow are yours.
- Panel visuals are not shipped. There is no CSS file to import.

### `Sheet.Handle`

| | |
| --- | --- |
| Renders | `<button type="button">` |
| Own props | none beyond native `button` props |
| Attributes | `aria-label="Resize sheet"` unless you pass your own `aria-label` |
| Behaviour | Click cycles to the next snap; <kbd>ArrowUp</kbd> / <kbd>ArrowDown</kbd> move one snap; <kbd>Enter</kbd> / <kbd>Space</kbd> cycle. |

The visible grabber is your own markup or `::before` — the button ships no
styling. Dragging works on the whole panel, so the handle is an affordance and a
keyboard control, not a requirement.

### `Sheet.Header`

| | |
| --- | --- |
| Renders | `<div>` |
| Own props | none beyond native `div` props |
| Behaviour | Registered as the measurement target for the `"header"` snap value (shared `ResizeObserver`); non-scrolling region above `Sheet.Body`. |

Mount or unmount it freely — the root re-registers it through
`controller.setElements({ header })`, and a `"header"` snap re-resolves.

### `Sheet.Body`

| | |
| --- | --- |
| Renders | `<div>` |
| Own props | none beyond native `div` props |
| Behaviour | The scroll region. `min-height: 0` and `overscroll-behavior: contain` at attach; per active snap `overflow-y: auto; flex: 1 1 auto` when that snap has `scroll: true`, otherwise `overflow: hidden; flex: 0 0 auto`. Scroll-vs-drag arbitration happens on this element. |

At a `scroll: true` snap a downward drag only takes over when
`body.scrollTop <= 0` (or the sheet is already displaced); otherwise the native
scroll keeps the gesture. See [Scrolling](/guide/scrolling).

### `Sheet.Title`

| | |
| --- | --- |
| Renders | `<h2>` |
| Own props | none beyond native heading props |
| Behaviour | Gets a generated `id` (`useId`) that the controller wires as the panel's `aria-labelledby`. |

Pass your own `id` to override it. Render it in every modal sheet — a dialog
without an accessible name is the most common a11y failure here.

### `Sheet.Description`

| | |
| --- | --- |
| Renders | `<p>` |
| Own props | none beyond native paragraph props |
| Behaviour | Gets a generated `id` wired as the panel's `aria-describedby`. Omit the part and no `aria-describedby` is written. |

### `Sheet.Close`

| | |
| --- | --- |
| Renders | `<button type="button">` |
| Own props | none beyond native `button` props |
| Behaviour | On click, sets the root's open state to `false` — which means `onOpenChange(false)` in controlled mode. A handler of your own that calls `event.preventDefault()` cancels the close. |

```tsx
<Sheet.Close
  onClick={(event) => {
    if (hasUnsavedChanges) event.preventDefault();
  }}
>
  Close
</Sheet.Close>
```

Unlike a drag or overlay dismissal, `Sheet.Close` goes through the root's state
setter, so a controlled parent that ignores `onOpenChange(false)` simply keeps
the sheet open — no bounce.

## `SheetHandle`

`<Sheet ref={…}>` exposes a small imperative handle that delegates to the core
controller.

```ts
interface SheetHandle {
  snapTo(index: number, opts?: { immediate?: boolean }): Promise<void>;
  close(): Promise<void>;
  readonly activeSnapIndex: number;
  readonly y: number;
}
```

| Member | Type | Description |
| --- | --- | --- |
| `snapTo` | `(index: number, opts?: { immediate?: boolean }) => Promise<void>` | Animate to a snap by **your** array index. `immediate: true` jumps. Resolves when the spring rests. |
| `close` | `() => Promise<void>` | Close the sheet regardless of `dismissible`. Resolves after the close animation. |
| `activeSnapIndex` | `number` | Current index, read live from controller state. |
| `y` | `number` | Current px offset of the panel top from the top of the view (`0` = fully open). |

Before the controller exists (sheet closed, first render) the methods are no-ops
that resolve, and the getters read the last known state — calling them early is
safe.

```tsx
const sheet = useRef<SheetHandle>(null);
await sheet.current?.snapTo(1);
```

## `useSheetState()`

Subscribes to controller state via `useSyncExternalStore`. Must be called inside
`<Sheet>`.

```tsx
function Indicator() {
  const { snapIndex, progress, dragging } = useSheetState();
  return <span>{dragging ? "dragging" : `snap ${snapIndex}`}</span>;
}
```

| Field | Type | Description |
| --- | --- | --- |
| `open` | `boolean` | `true` from the moment `open()` starts until the close animation is done. |
| `snapIndex` | `number` | Active snap in your array order; `0` in content mode. |
| `y` | `number` | Panel top offset in px (`0` = fully open, view height = closed). |
| `progress` | `number` | `0` closed → `1` at the topmost snap. |
| `dragging` | `boolean` | A pointer drag is in progress. |
| `animating` | `boolean` | The spring is running. |
| `contentMode` | `boolean` | No real snap points — the sheet hugs its content. |

- The state object is reference-stable until something changes, so a component
  reading it only re-renders on real changes.
- `y` and `progress` are throttled to one notification per animation frame. For
  anything you would otherwise animate per frame, prefer the CSS custom
  properties in [Styling Hooks](/reference/styling-hooks) — they never touch
  React.
- Server snapshot (and pre-attach): `{ open: false, snapIndex: 0, y: 0,
  progress: 0, dragging: false, animating: false, contentMode: false }`.

## Peer dependencies

`react` and `react-dom` `^18 || ^19`, both declared optional — the core entry
(`snap-bottom-sheet`) has no peers at all. See [Core API](/reference/core) and
[Vanilla JS](/guide/vanilla).
