<script setup>
import controlledDemo from "../.vitepress/theme/demos/controlled.tsx";
</script>

# Controlled State

You can drive two things about a sheet from outside: whether it is open, and which snap it rests at. Each one is controlled or uncontrolled on its own.

<ClientOnly>
  <ReactDemo :mount="controlledDemo" />
</ClientOnly>

## The two pairs of props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | — | Controlled open state. When passed, the sheet never changes it itself |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is omitted |
| `onOpenChange` | `(open: boolean) => void` | — | Called when the sheet wants to open or close |
| `activeSnapIndex` | `number` | — | Controlled snap index, into **your** `snapPoints` array |
| `defaultSnapIndex` | `number` | `0` | Initial snap index when `activeSnapIndex` is omitted |
| `onSnapIndexChange` | `(index: number, snapPoint: SnapPoint) => void` | — | Called with the new index and the entry from your array |

Indices always refer to your array order. The engine sorts snaps by position
internally so that it can find neighbours, but that order never leaks out. Index
`2` is `snapPoints[2]`, whatever its height.

::: info
If you pass `open` without `onOpenChange`, the sheet can never close. If you pass
`activeSnapIndex` without `onSnapIndexChange`, it can never move. That is the
standard controlled-component contract rather than a bug, but it is usually a
mistake.
:::

## Uncontrolled

Let the sheet own its snap index, and drive positions through the ref:

```tsx
import { useRef } from "react";
import { Sheet, type SheetHandle } from "snap-bottom-sheet/react";

export function Filters() {
  const sheet = useRef<SheetHandle>(null);

  return (
    <Sheet
      ref={sheet}
      defaultOpen
      snapPoints={["header", 0.5, { value: 1, scroll: true }]}
      defaultSnapIndex={0}
      onSnapIndexChange={(index) => console.log("snapped to", index)}
    >
      <Sheet.Portal>
        <Sheet.Overlay className="overlay" />
        <Sheet.Content className="sheet">
          <Sheet.Handle className="handle" />
          <Sheet.Header className="header">
            <Sheet.Title>Filters</Sheet.Title>
            <Sheet.Close className="close">Done</Sheet.Close>
          </Sheet.Header>
          <Sheet.Body className="body">
            <button type="button" onClick={() => sheet.current?.snapTo(2)}>
              Expand
            </button>
          </Sheet.Body>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet>
  );
}
```

There is no `open` prop, no `onOpenChange`, and no state in the parent. The sheet
opens itself on mount, the handle moves it between snaps, and `Sheet.Close`
closes it.

::: tip
`defaultOpen` covers "open on mount". To open an uncontrolled sheet later, call
`ref.current.open()` from your trigger. A click-to-open button does not need you
to control `open`. Use the controlled version in the next section when the parent
needs to *render* from the open state, not only to set it.
:::

## Controlled

You can mix the two freely. Here `open` is controlled and the snap index is not:

```tsx
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

export function Checkout() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      snapPoints={["header", 0.6, 1]}
      activeSnapIndex={step}
      onSnapIndexChange={setStep}
      onAnimationEnd={(isOpen) => {
        if (!isOpen) setStep(0);
      }}
    >
      <Sheet.Portal>
        <Sheet.Overlay className="overlay" />
        <Sheet.Content className="sheet">
          <Sheet.Header className="header">
            <Sheet.Title>Checkout</Sheet.Title>
            <Sheet.Description>Step {step + 1} of 3</Sheet.Description>
          </Sheet.Header>
          <Sheet.Body className="body">
            <button type="button" onClick={() => setStep(step + 1)}>
              Next
            </button>
          </Sheet.Body>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet>
  );
}
```

Prop changes are compared against the engine's own state. So if you re-render
with the same `activeSnapIndex` that the user has just dragged to, nothing
happens. There is no second animation and no loop.

## The imperative handle

`<Sheet ref={…}>` exposes a `SheetHandle` for the things props are awkward at:

```ts
interface SheetHandle {
  open(): Promise<void>;
  close(): Promise<void>;
  snapTo(index: number, opts?: { immediate?: boolean }): Promise<void>;
  readonly activeSnapIndex: number;
  readonly y: number; // px offset from top; 0 = fully open
}
```

`open()` on a closed sheet shows it, whether or not you control the `open` prop.
That is the whole click-to-open trigger. `snapTo(i)` on a **closed** sheet only
changes which snap it will open at. It does not open the sheet.

Each method returns a promise, so you can sequence work after a transition:

```ts
await sheet.current?.close();
router.push("/next");
```

When the promise resolves depends on the call:

- `snapTo(i)` resolves when the spring rests, or straight away with
  `{ immediate: true }`. On a closed sheet it resolves at once, because nothing
  moves.
- `open()` and `close()` resolve when the animation ends on an **uncontrolled**
  sheet. On a **controlled** sheet they are only a request: the parent owns
  `open` and may ignore it, so there is no animation to wait for and the promise
  resolves immediately.
- Any call that asks for the state the sheet is already in resolves immediately.

`activeSnapIndex` and `y` are live reads, not React state. Reading them does not
subscribe you to anything, and it will not re-render your component.

## Reading live state

For state you want to *render*, use `useSheetState()` from any component under
`<Sheet>`:

```tsx
import { useSheetState } from "snap-bottom-sheet/react";

function Dimmer() {
  const { progress, dragging } = useSheetState();
  // `|| undefined` keeps it a presence attribute, as the controller writes it.
  return (
    <div style={{ opacity: progress * 0.6 }} data-dragging={dragging || undefined} />
  );
}
```

| Field | Type | Meaning |
|---|---|---|
| `open` | `boolean` | The engine's open state. Flips to `false` when closing *starts* |
| `snapIndex` | `number` | Active index in your array |
| `y` | `number` | Current px offset from the top |
| `progress` | `number` | `0` closed → `1` at the topmost snap |
| `dragging` | `boolean` | A drag is in progress |
| `animating` | `boolean` | The spring has not rested yet |
| `contentMode` | `boolean` | No real snap points, so the sheet is as tall as its content |

You have to call it inside a `<Sheet>` subtree, because there is no fallback
without a provider. Please note that it re-renders on every state change, which
during a drag means every frame. For visuals alone, prefer the CSS custom
properties that the engine writes straight to the DOM. See
[Styling](/guide/styling).

## The dismissal contract

When you drag past the threshold, click the overlay, or press <kbd>Escape</kbd>,
the engine **closes itself first and reports afterwards** with
`onOpenChange(false)`. The animation has already started by the time your handler
runs.

That order has one important result. A controlled parent that receives
`onOpenChange(false)` and keeps `open={true}` gets a **one-frame bounce**. The
sheet starts closing, the next render re-opens it, and the user sees a flicker.
This is documented behaviour, not a bug to work around with timers.

::: warning
To refuse dismissals, use `dismissible={false}`. It turns off the drag-close
threshold, the overlay click and <kbd>Escape</kbd> at the source, so nothing
ever starts closing. Please do not try to refuse one by ignoring
`onOpenChange`.
:::

```tsx
<Sheet open={open} onOpenChange={setOpen} dismissible={!isSubmitting}>
```

## `onAnimationEnd` and unmounting

`onAnimationEnd(open)` fires when the spring rests after an open or a close.
`Sheet.Portal` uses it internally. Children stay mounted for the whole closing
animation, and they unmount only once `onAnimationEnd(false)` has fired. Without
that, unmounting on `open === false` would remove the panel before it had
animated anywhere.

Two things follow from this. First, component state inside the sheet survives a
close and reopen only until that final unmount. Reset it in `onAnimationEnd`, as
the controlled example does with `step`, rather than on the click that closes.
Second, a sheet in its closing animation is still in the DOM, and `animating` is
`true` in `useSheetState()`.

The two open signals change at different times, which matters if you read both.
`SheetState.open`, and so `useSheetState().open`, flips to `false` the moment
closing **starts**. `data-state="closed"` is written at the **end**, once the
spring rests. So while the sheet is closing, the panel still reads
`data-state="open"` in CSS even though `open` is already `false` in JavaScript.
Use `data-state` for the exit transition, and `open` for logic that has to react
immediately.

## Where next

- [Gestures](/guide/gestures) — what triggers a dismissal in the first place.
- [Styling](/guide/styling) — data attributes and custom properties, no re-renders.
- [React API](/reference/react) — the complete prop and part reference.
