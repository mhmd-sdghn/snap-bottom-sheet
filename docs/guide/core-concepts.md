# Core Concepts

Five ideas explain most of the library: the y-offset model, snap indices, measured snap values, content mode, and the split between the engine and its bindings.

## Everything is a y-offset

Internally the sheet has exactly one number: `y`, the pixel offset of the top of
the panel from the top of the view.

- `y === 0` — fully open, the panel's top edge is at the top of the view.
- `y === viewHeight` — closed, the panel is entirely below the view.

The panel is always full height (`position: fixed; height: 100dvh`). It is moved
with `transform: translate3d(0, var(--snap-sheet-y), 0)`, so nothing resizes
during a drag.

The API talks in **heights** instead, because that is how you think about a
sheet. `0.5` means half the view is showing, and `"320px"` means 320 pixels of
sheet. The controller converts once, with `y = viewHeight - height`, and works in
offsets from then on. So `--snap-sheet-y` is an offset, not a height, and the two
run in opposite directions:

| `--snap-sheet-y` | `--snap-sheet-progress` | State |
| --- | --- | --- |
| `viewHeight` | `0` | Closed |
| mid-range | mid-range | Between snaps |
| the topmost snap's offset | `1` | At the topmost declared snap |

Please note the last row. `--snap-sheet-progress` reaches `1` at the **topmost
snap you declared**, not at `y === 0`. With `snapPoints={[0.3, 0.6]}`, progress
is `1` at `0.6` and `y` never reaches `0` at all. See
[Styling](/guide/styling) for a worked example.

Use `--snap-sheet-progress` for overlay opacity, or for anything else that should
fade with the sheet. Use `--snap-sheet-y` when you need the raw position. Both
are written straight to the DOM every frame, so there is no React render per
frame. See [Styling](/guide/styling) for the full list.

## Snap indices are your array order

With `snapPoints={["content", 0.5, 1]}`, index `0` is `"content"`, index `1` is
`0.5`, and index `2` is `1`. That never changes. The controller resolves each
entry to a y-value, and it keeps a y-sorted copy internally so that it can find
the nearest neighbour on release. That sorted copy stays private.
`defaultSnapIndex`, `activeSnapIndex`, `snapTo(index)`,
`onSnapIndexChange(index, point)` and `data-snap-index` all use your order.

::: tip
You are free to write the array in whatever order reads best. `[1, "header"]`
puts full height at index `0` and the peek at index `1`, and both keep those
indices for as long as the array stands.
:::

## Measured snap values

Two snap values are not numbers at all:

- `"header"` — the measured height of `Sheet.Header`.
- `"content"` — the measured natural height of everything in the panel, capped
  at the view height.

A shared `ResizeObserver` measures both of them live. The measured value of the
active snap can change when content loads, a row expands, or the window resizes.
When that happens, the sheet springs to the new position instead of jumping.
There is more detail in [Dynamic Height](/guide/dynamic-height).

## Content mode

The sheet enters **content mode** when you give it no snap points, or when every
snap point is `"content"`. In that mode the controller builds a single snap from
the measured content height, so the sheet is exactly as tall as its content.

```tsx
<Sheet open={open} onOpenChange={setOpen}>
  {/* no snapPoints — the sheet is exactly as tall as what is inside it */}
</Sheet>
```

Drag up is pinned, because there is nowhere above the content height to go. Drag
down past the threshold closes the sheet. It clamps back instead when
`dismissible` is `false`. The panel is given `data-content-mode` as a presence
attribute, with no value, and `SheetState.contentMode` is `true`, so you can
style or branch on it. The synthesized snap is still an index, so
`data-snap-index` is `"0"` and `snapTo(0)` is valid.

## Modal and non-modal

`modal` defaults to `true`. It is more than a visual choice, because it turns on
four things at once:

| Behaviour | `modal: true` | `modal: false` |
| --- | --- | --- |
| `Sheet.Overlay` | Rendered and interactive | Not shown |
| Page scroll | Locked (reference-counted, restored on close) | Untouched |
| Siblings in the portal container | `inert` while open | Interactive |
| Escape key | Closes the innermost open sheet | Ignored |

The `inert` row applies only to the portal container's own children. By default
those are the children of `document.body`. A custom `Sheet.Portal container`
narrows the scope, and everything outside that container stays interactive. See
[Accessibility](/guide/accessibility#what-modal-turns-on).

Use `modal: false` for a sheet that sits alongside the page, such as a persistent
map panel or a mini player. With those, the user needs to keep scrolling and
tapping behind the sheet. Escape and overlay dismissal both arrive with `modal`,
so a non-modal sheet needs a close control of your own. `Sheet.Close` covers
that.

::: warning
Use `dismissible: false` to refuse a dismissal. Do not use a controlled `open`
prop that declines to change. The controller closes itself first and reports
afterwards with `onOpenChange(false)`. A controlled parent that declines will
re-open the sheet on the next render, and the user sees a one-frame bounce. See
[Controlled State](/guide/controlled-state).
:::

## Controller and bindings

The library is one package with two entry points, and the split of work between
them is strict.

**The core controller** (`createSheet` from `snap-bottom-sheet`) owns all
behaviour. That covers snap resolution, the spring, the drag recogniser, the
choice between scrolling and dragging, the scroll lock, focus and `inert`, the
Escape stack, and every DOM write that depends on state. The controller writes
`transform`, `--snap-sheet-y`, `--snap-sheet-progress`, `--snap-sheet-offset`,
`data-state`, `data-snap-index`, `data-dragging`, `role`, `aria-modal` and
`aria-labelledby` straight onto the elements.

**The React bindings** (`snap-bottom-sheet/react`) render elements, register
them with the controller through context, and pass prop changes on to
`update()`. That is all they do. React parts render nothing that depends on
state. This is also why server-rendered markup carries no `data-state`: there is
no state until the controller attaches.

```ts
// The whole contract, in one call.
const controller = createSheet({ content, header, body, overlay, handle }, options);
```

Two results follow from this:

1. Anything you can do in React you can also do in vanilla JS. The behaviour is
   identical, because it is the same engine. See [Vanilla JS](/guide/vanilla).
2. Inline styles you set on the panel win. The controller writes the base layout
   styles once when it attaches. After that it only touches the dynamic
   properties listed above.

## Where next

- [Snap Points](/guide/snap-points) — every value form and the per-snap options.
- [Dynamic Height](/guide/dynamic-height) — `"header"` and `"content"` in depth.
- [Core API](/reference/core) — the controller surface.
