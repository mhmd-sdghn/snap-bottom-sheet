# Gestures

How a drag becomes a snap: what is grabbable, which directions are allowed, and where the sheet lands when you let go.

## The whole panel drags

The handle is a convenience, not a requirement. `Sheet.Content` is the drag
surface, so a pointer anywhere on the panel — header, body, buttons, empty
space — moves the sheet. Mouse, touch and pen all go through the same Pointer
Events recogniser; a drag begins after 3 px of movement, and only when the
movement is more vertical than horizontal.

The one exception is a body that is allowed to scroll at the active snap. See
[Scrolling](/guide/scrolling) for the arbitration rule.

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

A lock means **no movement**, not a rubber-band: the finger moves, the panel
does not, and the gesture ends with the sheet exactly where it started.

::: info
Locks are read from the **active** snap, so the same drag can be legal in one
position and refused in another. A `drag: false` snap can still be left
programmatically with `snapTo()`, or by keyboard on the handle.
:::

There is no rubber-banding above the topmost snap either. Live drag clamps the
position to the range between the topmost snap and the closed position; pulling
past the top simply stops.

## Where a release lands

At release, the engine does not pick the nearest snap to where your finger
stopped — it picks the nearest snap to where the sheet was *heading*:

```
projected = y + vy * 200
```

`vy` is the velocity in px/ms, measured over roughly the last 100 ms of the
gesture, and 200 ms is the projection window. The target is the resolved snap
closest to `projected`. A slow drag has `vy ≈ 0` and behaves like plain nearest
snapping; a quick flick carries the sheet across one or more intermediate snaps,
which is what makes a flick feel like a flick.

`onSnapIndexChange` fires **before** the spring starts, so your UI updates with
the gesture rather than after it. `onAnimationEnd` fires when the spring comes
to rest.

## Dismissing by drag

If `projected` falls below the lowest snap by more than

```
min(80px, 25% of the lowest snap's height)
```

the sheet closes. Otherwise it clamps back to the lowest snap. The 25% term
matters for short peek snaps: on a 120 px header snap the sheet dismisses after
30 px of overshoot, not 80 px, so a small sheet does not feel glued down.

Dismissal by drag only happens when `dismissible` is `true` (the default). With
`dismissible: false` the same gesture clamps to the lowest snap and the sheet
stays open — that is also the supported way to veto a close. See
[Controlled State](/guide/controlled-state#the-dismissal-contract).

## Opting a region out

Add `data-snap-sheet-no-drag` to any descendant and pointers that start inside
it are ignored by the recogniser:

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

- A focused `<input>` or `<textarea>` inside the sheet is **blurred** on drag
  start, which avoids the ghost caret mobile browsers leave behind on a moving
  element.
- Pointers starting on a `<select>`.
- Pointers starting while a text selection is active, so selecting text does not
  drag the sheet away.

## Keyboard

`Sheet.Handle` renders a real `<button>`, so it is reachable by Tab and does the
obvious things:

| Key | Action |
|---|---|
| <kbd>ArrowUp</kbd> | Step one snap up |
| <kbd>ArrowDown</kbd> | Step one snap down |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Cycle to the next snap |

Stepping and cycling move through the snaps in position order — lowest to
topmost — regardless of the order you passed them in.
<kbd>Escape</kbd> closes the sheet when it is
`modal` and `dismissible`; see [Accessibility](/guide/accessibility) for how
that is routed when sheets are nested.

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
| `onDragEnd` | `(targetIndex: number \| -1) => void` | At release, with the decided target — **`-1` when the release closes the sheet** |

`onDragEnd` reports the *decision*, not the arrival: the spring is still
running when it fires. Wait for `onAnimationEnd` if you need the resting state.

## Where next

- [Scrolling](/guide/scrolling) — the scroll-versus-drag rule inside `Sheet.Body`.
- [Controlled State](/guide/controlled-state) — driving snaps from props and the imperative handle.
- [Snap Points](/guide/snap-points) — value forms, `scroll`, and `drag` in one place.
