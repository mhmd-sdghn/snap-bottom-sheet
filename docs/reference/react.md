# React API

Everything `snap-bottom-sheet/react` exports. That is the `Sheet` root, its nine parts, the `SheetHandle` ref API and `useSheetState()`.

```tsx
import { Sheet, useSheetState } from "snap-bottom-sheet/react";
import type { SheetHandle, SheetState } from "snap-bottom-sheet/react";
import type { SnapPoint } from "snap-bottom-sheet";
```

## `<Sheet>`

The root renders no DOM of its own. It holds the state you can control, creates
one core controller once its children have mounted, and passes prop changes on
to `controller.update()`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open` | `boolean` | — | The open state, controlled by you. When you set it, the sheet never changes it on its own. It only reports through `onOpenChange`. |
| `defaultOpen` | `boolean` | `false` | The open state the sheet starts with in uncontrolled mode. |
| `onOpenChange` | `(open: boolean) => void` | — | Runs after the controller's own state has changed. That covers `open()`, `close()` and every dismissal, whether by drag, overlay click or Escape. |
| `snapPoints` | `SnapPoint[]` | `[]` | Snap positions, in **your** array order. An empty array, or one holding only `"content"`, means content mode. See [Snap Points](/reference/snap-points). |
| `activeSnapIndex` | `number` | — | The active snap, controlled by you, as an index into `snapPoints`. |
| `defaultSnapIndex` | `number` | `0` | The snap the sheet opens at in uncontrolled mode. A value out of range is clamped, with a warning in development. |
| `onSnapIndexChange` | `(index: number, snapPoint: SnapPoint) => void` | — | Runs when the active snap index changes, before the spring starts to animate. It never runs in content mode. |
| `modal` | `boolean` | `true` | The overlay is shown, page scrolling is locked, siblings in the portal container get `inert`, and Escape closes the sheet. A modal sheet always receives the Escape key, even when `dismissible` is `false`. Nothing happens in that case, and the key is not passed on to a sheet behind it, which would otherwise close the wrong sheet. |
| `dismissible` | `boolean` | `true` | A drag below the lowest snap, an overlay click and Escape all close the sheet. With `false` the sheet returns to the lowest snap instead, which is how you refuse a dismissal. |
| `skipInitialAnimation` | `boolean` | `false` | Mount at the active snap rather than animating up from closed. |
| `reducedMotion` | `boolean \| "system"` | `"system"` | `true` makes every transition immediate. `"system"` follows `prefers-reduced-motion: reduce`. |
| `onDragStart` | `() => void` | — | The drag passed the 3 px threshold. |
| `onDragEnd` | `(targetIndex: number) => void` | — | The target of the release has been chosen, and the spring has not started yet. `-1` means the sheet is closing. When a drag dismisses the sheet, `onDragEnd(-1)` runs **before** `onOpenChange(false)`. |
| `onAnimationEnd` | `(open: boolean) => void` | — | The open or close spring came to rest. The close one is what unmounts the portal subtree. |
| `children` | `React.ReactNode` | — | Rendered only while the sheet is present, meaning open or still playing its close animation. |
| `ref` | `Ref<SheetHandle>` | — | The imperative handle. See [`SheetHandle`](#sheethandle). |

::: warning A controlled `open` cannot veto a dismissal
On a dismissal the controller closes itself first and calls `onOpenChange(false)`
afterwards. If a controlled parent keeps `open` at `true`, the sheet re-opens on
the next render and you see a one-frame bounce. Please use
`dismissible={false}` instead.
:::

::: info No `labelledBy` / `describedBy` props
`<Sheet>` takes neither of them. In React the parts *are* the API. Render
`Sheet.Title` and `Sheet.Description`, and the controller wires their generated
ids as `aria-labelledby` and `aria-describedby`. The `labelledBy` and
`describedBy` options exist only on the core
[`SheetOptions`](/reference/core#sheetoptions), for people who have no React tree
to render parts into.
:::

::: info Identity of `snapPoints`
The root compares `snapPoints` by value, so passing a fresh array literal on
every render does not resolve the snaps again.
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

Every part shares this behaviour:

- It forwards `ref` to its DOM element and spreads the remaining props onto it,
  so any native attribute or event handler works.
- `className` and `style` are merged with what the part needs itself. They are
  never replaced.
- There is no `asChild` and no polymorphic `as` prop. If you need a different
  element, please wrap or nest your own.
- **No part renders anything that depends on state.** The core controller writes
  `role`, `aria-*`, `data-*` and the CSS custom properties below straight to the
  DOM. That is why server-rendered markup carries none of them, and why they
  never cost you a React render. The full list is in
  [Styling Hooks](/reference/styling-hooks).

### `Sheet.Portal`

Renders its children into a portal. Nothing else.

```tsx
<Sheet.Portal container={ref.current}>{children}</Sheet.Portal>
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `container` | `HTMLElement \| null` | `document.body` | The portal target. It also becomes the controller's `elements.container`, which makes it the source of the view height and the scope for `inert`. |
| `children` | `React.ReactNode` | — | The sheet's DOM. |

- It renders `null` on the server **and on the first client render**, then
  portals after mount. So there is no hydration mismatch and no `document`
  access during render, and you do not need
  `dynamic(() => …, { ssr: false })`.
- It stays mounted while the close animation runs. The root unmounts it when the
  controller reports `onAnimationEnd(false)`.
- These are the only props it takes. There is no `ref`, no `className` and no
  styling. When `container` is not `document.body`, the panel is positioned
  `absolute` inside it rather than `fixed`, and the view height is the
  container's `offsetHeight`.
- `inert` reaches only the container's own children. With the default
  `document.body` that is the whole page. With a custom `container`, everything
  outside it stays interactive even while `modal`. See
  [Accessibility](/guide/accessibility).

### `Sheet.Overlay`

| | |
| --- | --- |
| Renders | `<div>` |
| Own props | none beyond native `div` props |
| Data attributes | `data-state="open" \| "closed"` |
| CSS properties | `--snap-sheet-progress` |
| Behaviour | A click closes the sheet when `dismissible`. `aria-hidden="true"` is set at attach. The overlay is hidden with `display: none` while `modal` is `false`. |

The overlay belongs to a modal sheet. A non-modal sheet is a panel, not a
dialog, so an overlay there would be an invisible full-screen click catcher
that closes the sheet on any outside click.

You do not have to render it conditionally. The controller hides the overlay
for you whenever `modal` is `false`, by writing `display: none` on the element.
It does this in three places:

- **At attach**, when the overlay is first wired up.
- **On `update({ modal })`**, so switching a live sheet between modal and
  non-modal shows or hides the overlay straight away. In React this is any
  render that changes the `modal` prop.
- **When the overlay element itself changes**, through
  `setElements({ overlay })` — for example when you mount or unmount
  `Sheet.Overlay`.

The hiding is reversible. The controller remembers whatever inline `display`
the element had, and puts it back when the sheet becomes modal again, when the
overlay is unmounted, or when the sheet is destroyed.

The controller also positions the overlay for you. At attach it writes
`position: fixed` (or `absolute` when `Sheet.Portal` has a `container`) and
`inset: 0`, so your CSS only has to supply colour. `--snap-sheet-progress` is
written on the overlay element itself, so the fade is one line:

```tsx
<Sheet.Overlay className="overlay" />
```

```css
.overlay {
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
| Attributes | `role="dialog"`, `aria-modal` when `modal`, `aria-labelledby` and `aria-describedby` from a rendered `Sheet.Title` and `Sheet.Description`, and `tabindex="-1"` if you did not set one |
| Data attributes | `data-state`, `data-snap-index`, `data-dragging`, `data-content-mode` |
| CSS properties | `--snap-sheet-y`, `--snap-sheet-progress`, `--snap-sheet-offset` |
| Behaviour | This is the drag target. The base layout styles are written once at attach, and `transform` and the CSS properties are written on every frame. |

- The inner `data-snap-sheet-inner` div is the element measured for the
  `"content"` snap value. Please do not remove it, and do not add `overflow` to
  it.
- The base layout is written once at attach: `position: fixed` (or `absolute`
  with a Portal `container`), `top/left/right: 0`, `height: 100dvh` (or `100%`),
  `display: flex; flex-direction: column`, `box-sizing: border-box`,
  `touch-action: none`, `overscroll-behavior: none`. Inline styles you set
  afterwards win, so the background, radius and shadow are yours.
- No panel visuals ship with the library. There is no CSS file to import.

### `Sheet.Handle`

| | |
| --- | --- |
| Renders | `<button type="button">` |
| Own props | none beyond native `button` props |
| Attributes | `aria-label="Resize sheet"`, unless you pass your own `aria-label` |
| Behaviour | A click moves to the next snap. <kbd>Enter</kbd> and <kbd>Space</kbd> cycle and **wrap**. <kbd>ArrowUp</kbd> and <kbd>ArrowDown</kbd> step one snap and **clamp**. |

The two keyboard behaviours differ at the ends of the array. <kbd>Enter</kbd> and
<kbd>Space</kbd> cycle, so from the topmost snap they wrap back to the lowest.
<kbd>ArrowUp</kbd> and <kbd>ArrowDown</kbd> step by one and clamp. Pressing
<kbd>ArrowUp</kbd> at the topmost snap does nothing, and neither does
<kbd>ArrowDown</kbd> at the lowest.

The visible grabber is your own markup, or a `::before` rule. The button ships no
styling. Dragging works on the whole panel, so the handle is a hint and a
keyboard control rather than a requirement.

### `Sheet.Header`

| | |
| --- | --- |
| Renders | `<div>` |
| Own props | none beyond native `div` props |
| Behaviour | Registered as the element measured for the `"header"` snap value, through a shared `ResizeObserver`. It is the non-scrolling region above `Sheet.Body`. |

You may mount and unmount it freely. The root registers it again through
`controller.setElements({ header })`, and a `"header"` snap is resolved again.

### `Sheet.Body`

| | |
| --- | --- |
| Renders | `<div>` |
| Own props | none beyond native `div` props |
| Behaviour | The scroll region. At attach it gets `min-height: 0` and `overscroll-behavior: contain`. For each active snap it gets `overflow-y: auto; flex: 1 1 auto` when that snap has `scroll: true`, and `overflow: hidden; flex: 0 0 auto` otherwise. The choice between scrolling and dragging is made on this element. |

At a `scroll: true` snap, a downward drag takes over only when
`body.scrollTop <= 0`, or when the sheet has already moved. Otherwise the native
scroll keeps the gesture. See [Scrolling](/guide/scrolling).

### `Sheet.Title`

| | |
| --- | --- |
| Renders | `<h2>` |
| Own props | none beyond native heading props |
| Behaviour | Gets an `id` generated with `useId`, which the controller wires as the panel's `aria-labelledby`. |

Pass your own `id` to replace it. Please render this part in every modal sheet. A
dialog without an accessible name is the most common accessibility problem here.

### `Sheet.Description`

| | |
| --- | --- |
| Renders | `<p>` |
| Own props | none beyond native paragraph props |
| Behaviour | Gets a generated `id`, wired as the panel's `aria-describedby`. If you leave this part out, no `aria-describedby` is written. |

### `Sheet.Close`

| | |
| --- | --- |
| Renders | `<button type="button">` |
| Own props | none beyond native `button` props |
| Behaviour | On click it sets the root's open state to `false`, which means `onOpenChange(false)` in controlled mode. If a handler of your own calls `event.preventDefault()`, the close is cancelled. |

```tsx
<Sheet.Close
  onClick={(event) => {
    if (hasUnsavedChanges) event.preventDefault();
  }}
>
  Close
</Sheet.Close>
```

A drag or an overlay click closes the sheet directly, but `Sheet.Close` goes
through the root's state setter. So a controlled parent that ignores
`onOpenChange(false)` simply keeps the sheet open, and there is no bounce.

## `SheetHandle`

`<Sheet ref={…}>` gives you a small imperative handle, which passes your calls on
to the core controller.

```ts
interface SheetHandle {
  open(): Promise<void>;
  close(): Promise<void>;
  snapTo(index: number, opts?: { immediate?: boolean }): Promise<void>;
  readonly activeSnapIndex: number;
  readonly y: number;
}
```

| Member | Type | Description |
| --- | --- | --- |
| `open` | `() => Promise<void>` | Shows a closed sheet, animating to the active snap. It resolves when the spring comes to rest, or at once on a controlled sheet. See the note below. |
| `close` | `() => Promise<void>` | Closes the sheet, whatever `dismissible` says. It resolves after the close animation, or at once on a controlled sheet. See the note below. |
| `snapTo` | `(index: number, opts?: { immediate?: boolean }) => Promise<void>` | Animates to a snap, using **your** array index. With `immediate: true` the sheet jumps. It resolves when the spring comes to rest. |
| `activeSnapIndex` | `number` | The current index, read live from the controller's state. |
| `y` | `number` | The current offset in px of the panel's top from the top of the view. `0` means fully open. |

::: warning `open()` and `close()` are only requests on a controlled sheet
Both go through the sheet's open state rather than straight to the controller.
On an **uncontrolled** sheet that state belongs to the sheet, so the promise
resolves when the animation ends. On a **controlled** sheet the parent owns
`open` and may ignore the request. There is no animation to wait for, so the
promise resolves at once and the call is only a request. In either case it
resolves at once when the sheet is already in the state you asked for.
:::

`open()` and `snapTo()` are not interchangeable. On a **closed** sheet,
`snapTo(i)` only changes which snap it will open at. It does not open the sheet.
`open()` is what shows it. Because `open()` is on the handle, a click-to-open
trigger needs no controlled `open` prop:

```tsx
function Screen() {
  const sheet = useRef<SheetHandle>(null);

  return (
    <>
      <button onClick={() => sheet.current?.open()}>Open</button>
      <Sheet ref={sheet} snapPoints={[0.4, 0.9]}>
        …
      </Sheet>
    </>
  );
}
```

You may call the handle before the controller exists, which happens while the
sheet is closed and on the first render. `open()` opens the sheet. `close()` and
`snapTo()` resolve without moving anything. The getters return the last known
state.

## `useSheetState(selector?)`

Subscribes to the controller's state through `useSyncExternalStore`. You have to
call it inside `<Sheet>`.

```tsx
function Indicator() {
  const { snapIndex, progress, dragging } = useSheetState();
  return <span>{dragging ? "dragging" : `snap ${snapIndex}`}</span>;
}
```

| Field | Type | Description |
| --- | --- | --- |
| `open` | `boolean` | `true` from the moment `open()` starts. It turns `false` when closing **starts**, not when it finishes. |
| `snapIndex` | `number` | The active snap, in your array order. It is `0` in content mode. |
| `y` | `number` | The offset of the panel's top in px. `0` means fully open, and the view height means closed. |
| `progress` | `number` | `0` when closed, rising to `1` at the topmost snap you **declared**. |
| `dragging` | `boolean` | A pointer drag is in progress. |
| `animating` | `boolean` | The spring is running. |
| `contentMode` | `boolean` | There are no real snap points, so the sheet hugs its content. |

- The state object keeps the same reference until something changes, so a
  component that reads it re-renders only on real changes.
- `open` and `data-state` are not in step during a close. `open` turns `false` as
  soon as the close begins. `data-state="closed"` is written at the other end,
  once the spring comes to rest, which is the same moment `onAnimationEnd(false)`
  runs. So drive your exit CSS from `data-state`, and your mount and unmount
  decisions from `open`.
- `y` and `progress` are limited to one notification per animation frame. For
  anything you would otherwise animate on every frame, please use the CSS custom
  properties in [Styling Hooks](/reference/styling-hooks). They never touch
  React.
- The snapshot on the server is
  `{ open: false, snapIndex: 0, y: 0, progress: 0, dragging: false,
  animating: false, contentMode: false }`. You also get it before attach, and
  after the sheet's portal has unmounted.

### Selecting one field

The sheet notifies you on every animation frame. A component that reads the whole
state therefore re-renders twenty or thirty times per transition, even if it only
shows `open`. Pass a selector to narrow that down:

```tsx
function CloseButton() {
  const open = useSheetState((state) => state.open);
  return <button type="button" disabled={!open}>Close</button>;
}
```

The selected value is compared with `Object.is`, so the component above renders
once per open and once per close, rather than once per frame. Returning a new
object or array is safe, but it re-renders on every frame, because no two of them
are equal. Please select the fields separately, or memoise further down.

## Peer dependencies

`react` and `react-dom` at `^18 || ^19`, both declared optional. The core entry,
`snap-bottom-sheet`, has no peer dependencies at all. See
[Core API](/reference/core) and [Vanilla JS](/guide/vanilla).
