<script setup>
import scrollableDemo from "../.vitepress/theme/demos/scrollable.tsx";
</script>

# Scrolling

A sheet scrolls its content only at the snap points you mark `scroll: true`, and only inside `Sheet.Body`.

<ClientOnly>
  <ReactDemo :mount="scrollableDemo" />
</ClientOnly>

## `Sheet.Body` is the scroll region

`Sheet.Content` is a flex column. `Sheet.Header` sits at the top and never
scrolls; `Sheet.Body` takes the remaining space and is the one element the
engine ever turns into a scroller. Anything you put directly in `Sheet.Content`
outside those two parts is laid out but never scrolled.

`Sheet.Body` is only *allowed* to scroll where you say so. Give the snap point a
config object with `scroll: true`:

```ts
snapPoints={["header", 0.5, { value: 1, scroll: true }]}
```

Here the sheet drags between the header height, half the view, and full height —
and the list inside `Sheet.Body` becomes scrollable only once it reaches that
last snap. At `"header"` and `0.5` the body is `overflow: hidden` and every
gesture moves the sheet.

::: tip
Most sheets want scrolling at their topmost snap and dragging everywhere else.
That is exactly the array above.
:::

## A scrollable list

::: code-group

```tsx [React]
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

const CITIES = ["Tehran", "Isfahan", "Shiraz", "Tabriz", "Mashhad", "Yazd"];

export function CityPicker() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Pick a city
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        snapPoints={["header", 0.5, { value: 1, scroll: true }]}
        defaultSnapIndex={1}
      >
        <Sheet.Portal>
          <Sheet.Overlay className="overlay" />
          <Sheet.Content className="sheet">
            <Sheet.Handle className="handle" />
            <Sheet.Header className="header">
              <Sheet.Title>Pick a city</Sheet.Title>
            </Sheet.Header>
            <Sheet.Body className="body">
              <ul>
                {CITIES.map((city) => (
                  <li key={city}>{city}</li>
                ))}
              </ul>
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}
```

```ts [Vanilla]
import { createSheet } from "snap-bottom-sheet";

const sheet = createSheet(
  {
    content: document.querySelector<HTMLElement>("#sheet")!,
    header: document.querySelector<HTMLElement>("#sheet-header"),
    body: document.querySelector<HTMLElement>("#sheet-body"),
    overlay: document.querySelector<HTMLElement>("#sheet-overlay"),
    handle: document.querySelector<HTMLElement>("#sheet-handle"),
  },
  {
    snapPoints: ["header", 0.5, { value: 1, scroll: true }],
    defaultSnapIndex: 1,
  },
);

document.querySelector("#pick")?.addEventListener("click", () => {
  void sheet.open();
});
```

:::

The `body` element must be the scroll region for the arbitration below to work —
in the vanilla flavour that means handing the same element to `createSheet` that
your CSS gives `flex: 1`. The engine sets `overflow-y` and
`overscroll-behavior` on it; padding, gaps and item styling stay yours.

## Scroll versus drag

At a `scroll: true` snap, one downward gesture inside the body could mean two
things. The rule the engine applies, at the moment the drag crosses its 3 px
threshold:

**The sheet takes over the gesture only when `body.scrollTop <= 0` and the user
is pulling down, or when the sheet is already displaced from its snap.
Otherwise the native scroll proceeds and the drag is cancelled.**

In practice:

| Situation | What happens |
|---|---|
| List scrolled part-way, drag down | Native scroll, sheet stays put |
| List at the top (`scrollTop <= 0`), drag down | Sheet drags down |
| Any position, drag up | Native scroll up to the list's end |
| Sheet already mid-drag between snaps | Sheet keeps dragging, scroll ignored |

A cancelled drag fires no `onDragStart`/`onDragEnd` pair — from the sheet's
point of view the gesture never began.

## Why the panel is `touch-action: none`

The engine relies on the CSS touch-action walk: a browser looks from the touched
element up to the **nearest ancestor with a default touch behaviour** — that is,
the nearest scroller — and only that segment's `touch-action` values matter.

So:

- `Sheet.Content` (the panel) gets `touch-action: none`. Nothing above the body
  can pan or zoom; the panel's own drag recogniser owns every pointer.
- At a snap with `scroll: true`, `Sheet.Body` gets
  `overflow-y: auto; overscroll-behavior: contain` and its default
  `touch-action`. Because the body is now a scroller, the walk **stops there** —
  the panel's `touch-action: none` is never consulted, and native scrolling
  works with full momentum. `overscroll-behavior: contain` keeps the page behind
  from rubber-banding when the list hits an edge.
- At every other snap, `Sheet.Body` gets `overflow: hidden`. It is no longer a
  scroller, the walk continues up to the panel, and the drag wins.

That leaves exactly one case CSS cannot express: pulling down when the list is
already at `scrollTop <= 0`. That one is decided in JavaScript, by the rule
above.

::: warning
Do not set `touch-action` or `overflow` on `Sheet.Content` or `Sheet.Body`
yourself. Both are toggled per snap by the engine, and overriding them breaks
the arbitration in one direction or the other.
:::

## Reaching the end of the content

The panel is always full-height and translated down — a half-open sheet is a
full-height panel whose bottom half is off-screen. Left alone, the last items in
a scrolled body would sit in that off-screen part and be unreachable.

**At rest**, the engine sets `padding-bottom` on the panel equal to its current
y offset, and mirrors the value as `--snap-sheet-offset`. The panel keeps its
full height (so no gap opens up when you drag it upward), but its *content box*
now ends exactly at the viewport bottom, and `Sheet.Body` scrolls to its true
end.

The value is **deliberately stale during a drag**: recomputing it every frame
would resize the scroller mid-gesture and make the content jump under the
finger. It is corrected on the next rest — after a snap, a resize, or a
measurement change.

Because the padding is on the panel, anything you render inside
`Sheet.Content` — a footer after `Sheet.Body`, for instance — already sits
above the fold with no work on your part. `--snap-sheet-offset` is exposed for
the cases where your own CSS needs to know how much of the panel is below the
viewport:

```css
/* Bleed a decorative background past the visible edge. */
.sheet::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: var(--snap-sheet-offset, 0px);
  background: inherit;
}
```

## Where next

- [Gestures](/guide/gestures) — drag locks, velocity projection, the dismiss threshold.
- [Snap Points](/guide/snap-points) — every value form and per-snap option.
- [Styling Hooks](/reference/styling-hooks) — the full list of data attributes and custom properties.
