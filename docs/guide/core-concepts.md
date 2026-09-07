# Core Concepts

Five ideas explain most of the library: the y-offset model, snap indices, measured snap values, content mode, and the split between the engine and its bindings.

## Everything is a y-offset

Internally the sheet has exactly one number: `y`, the pixel offset of the top of
the panel from the top of the view.

- `y === 0` — fully open, the panel's top edge is at the top of the view.
- `y === viewHeight` — closed, the panel is entirely below the view.

The panel is always full height (`position: fixed; height: 100dvh`) and is moved
with `transform: translate3d(0, var(--snap-sheet-y), 0)` — nothing resizes during
a drag.

The API, though, talks in **heights**, because that is how you think about a
sheet: `0.5` is half the view showing, `"320px"` is 320 pixels of sheet. The
controller converts once — `y = viewHeight - height` — and works in offsets from
there. So `--snap-sheet-y` is an offset, not a height, and the two run in
opposite directions:

| `--snap-sheet-y` | `--snap-sheet-progress` | State |
| --- | --- | --- |
| `viewHeight` | `0` | Closed |
| half of `viewHeight` | mid-range | Halfway |
| `0` | `1` | At the topmost snap |

Use `--snap-sheet-progress` for overlay opacity or anything that should fade with
the sheet, and `--snap-sheet-y` when you need the raw position. Both are written
straight to the DOM every frame — no React render per frame. See
[Styling](/guide/styling) for the full list.

## Snap indices are your array order

`snapPoints={["content", 0.5, 1]}` means index `0` is `"content"`, `1` is `0.5`,
`2` is `1`. That never changes. The controller resolves each entry to a y-value
and keeps a y-sorted view internally for finding the nearest neighbour on
release, but the sort is invisible: `defaultSnapIndex`, `activeSnapIndex`,
`snapTo(index)`, `onSnapIndexChange(index, point)` and `data-snap-index` all
speak your order.

::: tip
This is the one behaviour 0.x got wrong. If you are coming from 0.x, indices no
longer depend on the sorted order — see [Migrating from 0.x](/guide/migration).
:::

## Measured snap values

Two snap values are not numbers at all:

- `"header"` — the measured height of `Sheet.Header`.
- `"content"` — the measured natural height of everything in the panel, capped
  at the view height.

They are live-measured with a shared `ResizeObserver`. If the active snap's
measured value changes — content loads, a row expands, the window resizes — the
sheet springs to the new position instead of jumping. Details in
[Dynamic Height](/guide/dynamic-height).

## Content mode

No snap points at all, or snap points that are all `"content"`, put the sheet in
**content mode**: the controller synthesises a single snap from the measured
content height, so the sheet hugs its content.

```tsx
<Sheet open={open} onOpenChange={setOpen}>
  {/* no snapPoints — the sheet is exactly as tall as what is inside it */}
</Sheet>
```

Drag up is pinned (there is nowhere above content height to go), and drag down
past the threshold closes the sheet — or clamps back when `dismissible` is
`false`. `data-content-mode` is set on the panel, and `SheetState.contentMode` is
`true`, so you can style or branch on it.

## Modal and non-modal

`modal` defaults to `true`. It is not only a visual choice — it turns on four
things at once:

| Behaviour | `modal: true` | `modal: false` |
| --- | --- | --- |
| `Sheet.Overlay` | Rendered and interactive | Not shown |
| Page scroll | Locked (reference-counted, restored on close) | Untouched |
| Siblings in the portal container | `inert` while open | Interactive |
| Escape key | Closes the innermost open sheet | Ignored |

Use `modal: false` for a sheet that coexists with the page — a persistent map
panel, a mini player — where the user must keep scrolling and tapping behind it.
Escape and overlay dismissal both come with `modal`, so a non-modal sheet needs
your own close affordance (`Sheet.Close` covers it).

::: warning
`dismissible: false` is the way to veto dismissal, not a controlled `open` prop
that refuses to change. The controller closes itself first and then reports via
`onOpenChange(false)`; a controlled parent that declines re-opens on the next
render, which is a visible one-frame bounce. See
[Controlled State](/guide/controlled-state).
:::

## Controller and bindings

The library is one package with two entry points, and the division of labour is
strict.

**The core controller** (`createSheet` from `snap-bottom-sheet`) owns all
behaviour: snap resolution, the spring, the drag recogniser, scroll-vs-drag
arbitration, scroll lock, focus and `inert`, the Escape stack — and every
state-dependent DOM write. `transform`, `--snap-sheet-y`,
`--snap-sheet-progress`, `--snap-sheet-offset`, `data-state`,
`data-snap-index`, `data-dragging`, `role`, `aria-modal`, `aria-labelledby` all
come from the controller writing to elements directly.

**The React bindings** (`snap-bottom-sheet/react`) render elements, register
them with the controller through context, and mirror prop changes into
`update()`. That is all they do. React parts render nothing state-dependent,
which is also why server-rendered markup carries no `data-state` — there is no
state until the controller attaches.

```ts
// The whole contract, in one call.
const controller = createSheet({ content, header, body, overlay, handle }, options);
```

Two consequences worth knowing:

1. Anything you can do in React you can do in vanilla JS, and the behaviour is
   identical because it is the same engine. See [Vanilla JS](/guide/vanilla).
2. Inline styles you set on the panel win. The controller writes base layout
   styles once at attach; after that it only touches the dynamic properties
   listed above.

## Where next

- [Snap Points](/guide/snap-points) — every value form and the per-snap options.
- [Dynamic Height](/guide/dynamic-height) — `"header"` and `"content"` in depth.
- [Core API](/reference/core) — the controller surface.
