<script setup>
import scrollableDemo from "../.vitepress/theme/demos/scrollable.tsx";
</script>

# Scrolling

A sheet scrolls its content only at the snap points you mark with `scroll: true`, and only inside `Sheet.Body`.

<ReactDemo :mount="scrollableDemo" />

## `Sheet.Body` is the scroll region

`Sheet.Content` is a flex column. `Sheet.Header` sits at the top and never
scrolls. `Sheet.Body` takes the space that is left, and it is the only element
the engine ever turns into a scroller. Anything you put directly in
`Sheet.Content`, outside those two parts, is laid out but never scrolled.

`Sheet.Body` scrolls only where you allow it. To allow it, give the snap point a
config object with `scroll: true`:

```ts
snapPoints={["header", 0.5, { value: 1, scroll: true }]}
```

Here the sheet drags between the header height, half the view and full height.
The list inside `Sheet.Body` becomes scrollable only when the sheet reaches that
last snap. At `"header"` and `0.5` the body is `overflow: hidden`, so every
gesture moves the sheet instead.

::: tip
Most sheets want scrolling at their topmost snap and dragging everywhere else.
The array above does exactly that.
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

The `body` element has to be the scroll region for the rule below to work. In
the vanilla version, that means you pass `createSheet` the same element your CSS
gives `flex: 1`. The engine sets `overflow-y` and `overscroll-behavior` on it.
Padding, gaps and item styling stay yours.

## Scroll versus drag

At a `scroll: true` snap, one downward gesture inside the body could mean two
things. Here is the rule the engine applies, at the moment the drag crosses its
3 px threshold:

**The sheet takes over the gesture only when `body.scrollTop <= 0` and the user
is pulling down, or when the sheet has already moved away from its snap. In
every other case the native scroll continues and the drag is cancelled.**

In practice:

| Situation | What happens |
|---|---|
| List scrolled part-way, drag down | Native scroll, sheet stays put |
| List at the top (`scrollTop <= 0`), drag down | Sheet drags down |
| Any position, drag up | Native scroll up to the list's end |
| Sheet already mid-drag between snaps | Sheet keeps dragging, scroll ignored |

A cancelled drag calls neither `onDragStart` nor `onDragEnd`. As far as the
sheet is concerned, the gesture never started.

## Why the panel is `touch-action: none`

The engine relies on how the browser reads `touch-action`. The browser looks
from the touched element upwards until it finds the **nearest ancestor with a
default touch behaviour**, which means the nearest scroller. Only the
`touch-action` values along that stretch matter.

So:

- `Sheet.Content`, the panel, gets `touch-action: none`. Nothing above the body
  can pan or zoom, so the panel's own drag recogniser receives every pointer.
- At a snap with `scroll: true`, `Sheet.Body` gets
  `overflow-y: auto; overscroll-behavior: contain` and keeps its default
  `touch-action`. The body is now a scroller, so the browser **stops there**. It
  never reads the panel's `touch-action: none`, and native scrolling keeps its
  full momentum. `overscroll-behavior: contain` stops the page behind from
  rubber-banding when the list reaches an edge.
- At every other snap, `Sheet.Body` gets `overflow: hidden`. It is no longer a
  scroller, so the browser carries on up to the panel and the drag wins.

That leaves one case that CSS cannot express: pulling down when the list is
already at `scrollTop <= 0`. The engine decides that one in JavaScript, with the
rule above.

::: warning
Please leave two things to the engine:

- `overflow` and `overflow-y` on `Sheet.Body`. They change with every snap, and
  your own value would decide for the engine whether the body is a scroller.
- `touch-action` on `Sheet.Content` and on `Sheet.Body`. It is what tells the
  browser where a gesture belongs.

Everything else is yours, `overflow: hidden` on `Sheet.Content` included — the
engine never writes it there.
:::

## Reaching the end of the content

The panel is always full-height and is moved down with a transform. A half-open
sheet is a full-height panel whose lower half is off-screen. Without help, the
last items in a scrolled body would sit in that off-screen part, where you
cannot reach them.

**At rest**, the engine sets `padding-bottom` on the panel equal to its current
y offset, and writes the same value to `--snap-sheet-offset`. The panel keeps
its full height, so no gap opens up when you drag it upwards. Its content box
now ends exactly at the bottom of the viewport, and `Sheet.Body` scrolls to its
true end.

The value is **deliberately left stale during a drag**. Recalculating it every
frame would resize the scroller in the middle of the gesture and make the
content jump under your finger. The engine corrects it at the next rest, which
is after a snap, a resize or a measurement change.

The padding sits on the panel, so anything else you render inside
`Sheet.Content`, such as a footer after `Sheet.Body`, stays visible without any
work on your part. `--snap-sheet-offset` is there for the cases where your own
CSS needs to know how much of the panel is below the viewport:

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
