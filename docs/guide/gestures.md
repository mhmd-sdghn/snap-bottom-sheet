# Gestures

How a drag becomes a snap. This page covers what you can grab, which directions are allowed, and where the sheet lands when you let go.

## The whole panel drags

The handle is a convenience, not a requirement. `Sheet.Content` is the drag
surface, so a pointer anywhere on the panel moves the sheet. That includes the
header, the body, buttons and empty space. Mouse, touch and pen all go through
the same Pointer Events recogniser. A drag begins after 3 px of movement, and
only when that movement is more vertical than horizontal.

A body that is allowed to scroll at the active snap is not an exception to that.
The gesture still belongs to the sheet: it moves the sheet up to the scrolling
snap, and the rest of the same movement scrolls the content, with no lift in
between. See [Scrolling](/guide/scrolling) for both handoffs.

## Locking a direction per snap

Any snap point can refuse movement in one or both directions. Pass a config
object instead of a bare value:

| Config | Effect at that snap |
|---|---|
| `drag: true` (default) | Drags up and down |
| `drag: false` | Not draggable at all |
| `drag: { up: false }` | Can be dragged down, not up |
| `drag: { down: false }` | Can be dragged up, not down |

```ts
snapPoints={[
  { value: "header", drag: { up: false } },  // a peek that only closes
  0.5,
  { value: 1, scroll: true },
]}
```

A lock means **no movement** at all, not a rubber-band effect. The finger moves,
the panel does not, and the gesture ends with the sheet exactly where it started.

::: info
Locks are read from the **active** snap, so the same drag can be allowed in one
position and refused in another. You can still leave a `drag: false` snap from
code with `snapTo()`, or with the keyboard on the handle.
:::

There is no rubber-banding above the topmost snap either. During a drag the
position is clamped to the range between the topmost snap and the closed
position. Pulling past the top simply stops.

## Where a release lands

At release, the engine does not pick the snap nearest to where your finger
stopped. It picks the snap nearest to where the sheet was *heading*:

```
projected = y + vy * 200
```

`vy` is the velocity in px/ms, measured over roughly the last 100 ms of the
gesture. The 200 ms is the projection window. The target is the resolved snap
closest to `projected`. A slow drag has `vy ≈ 0`, so it behaves like plain
nearest snapping. A quick flick carries the sheet across one or more snaps in
between, which is what makes a flick feel like a flick.

`onSnapIndexChange` fires **before** the spring starts, so your UI updates with
the gesture rather than after it. `onAnimationEnd` fires when the spring comes
to rest.

## Dismissing by drag

If `projected` falls below the lowest snap by more than

```
min(80px, 25% of the lowest snap's height)
```

the sheet closes. Otherwise it clamps back to the lowest snap. The 25% part
matters for short peek snaps. On a 120 px header snap, the sheet closes after
30 px of overshoot rather than 80 px, so a small sheet does not feel glued down.

Dismissal by drag only happens when `dismissible` is `true`, which is the
default. With `dismissible: false`, the same gesture clamps to the lowest snap
and the sheet stays open. That is also the supported way to refuse a close. See
[Controlled State](/guide/controlled-state#the-dismissal-contract).

## Opting a region out

Add `data-snap-sheet-no-drag` to any descendant. The recogniser then ignores
pointers that start inside it:

```tsx
<Sheet.Body>
  <div data-snap-sheet-no-drag>
    <input type="range" min={0} max={100} />
  </div>
</Sheet.Body>
```

Use it for sliders, carousels, maps, signature pads, and anything else that
needs its own vertical drag.

Three things are ignored without any markup:

- A focused `<input>` or `<textarea>` inside the sheet is **blurred** when a drag
  starts. This avoids the ghost caret that mobile browsers leave behind on a
  moving element.
- Pointers starting on a `<select>`.
- Pointers starting while a text selection is active, so selecting text does not
  drag the sheet away.

## Dragging with a mouse

With a mouse, dragging inside the sheet does not select the text you pass over.
A selection would otherwise grow as you drag, and the browser would scroll the
list to follow it. Text fields keep their normal selection, and so does any
region you have marked with `data-snap-sheet-no-drag`.

Everywhere else in the sheet, a mouse selects rather little: dragging selects
nothing, and a double-click no longer picks out a word. A triple-click still
selects a whole block. If your readers need to select or copy a passage freely,
please mark that region with `data-snap-sheet-no-drag`. No drag begins there, so
its text behaves as it normally would.

## Keyboard

`Sheet.Handle` renders a real `<button>`, so it is reachable by Tab and does the
obvious things:

| Key | Action |
|---|---|
| <kbd>ArrowUp</kbd> | Step one snap up, clamping at the topmost |
| <kbd>ArrowDown</kbd> | Step one snap down, clamping at the lowest |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Cycle to the next snap, wrapping round to the lowest |

Stepping and cycling move through the snaps in position order, from the lowest to
the topmost, whatever order you passed them in. The two differ at the top. The
arrow keys **clamp**, so ArrowUp at the topmost snap does nothing.
<kbd>Enter</kbd> and <kbd>Space</kbd> **wrap** back to the lowest snap instead.

<kbd>Escape</kbd> closes the sheet when it is `modal` and `dismissible`. See
[Accessibility](/guide/accessibility) for how Escape is routed when sheets are
nested.

## Drag callbacks

```tsx
<Sheet
  snapPoints={["header", 0.5, 1]}
  onDragStart={() => setHintVisible(false)}
  onDragEnd={(targetIndex) => {
    if (targetIndex === -1) analytics.track("sheet_dismissed_by_drag");
    else analytics.track("sheet_snapped", { index: targetIndex });
  }}
/>
```

| Callback | Signature | Fires |
|---|---|---|
| `onDragStart` | `() => void` | Once the drag threshold is crossed and the sheet has taken the gesture |
| `onDragEnd` | `(targetIndex: number) => void` | At release, with the decided target index in your array |

The `targetIndex` is a plain `number`. The only value that is not an index is
`-1`, which means the release is closing the sheet.

`onDragEnd` reports the *decision*, not the arrival. The spring is still running
when it fires. Wait for `onAnimationEnd` if you need the resting state.

On a drag dismissal the two callbacks fire in a fixed order. `onDragEnd(-1)`
comes first, then `onOpenChange(false)`. So by the time your open-state handler
runs, the drag handler has already seen the dismissal.

A gesture inside a scrollable `Sheet.Body` belongs to the sheet in both of its
phases, so both callbacks fire for it as well. If the release happened while the
content was scrolling rather than the sheet moving, `onDragEnd` reports the snap
the sheet is resting at.

## Where next

- [Scrolling](/guide/scrolling) — how one gesture moves the sheet and then scrolls `Sheet.Body`.
- [Controlled State](/guide/controlled-state) — driving snaps from props and the imperative handle.
- [Snap Points](/guide/snap-points) — value forms, `scroll`, and `drag` in one place.
