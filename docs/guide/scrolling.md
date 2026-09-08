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

The `body` element has to be the scroll region for the behaviour below to work.
In the vanilla version, that means you pass `createSheet` the same element your
CSS gives `flex: 1`. The engine sets `overflow`, `touch-action` and
`overscroll-behavior` on it, and it drives its `scrollTop` during a touch
gesture. Padding, gaps and item styling stay yours.

## One gesture, two phases

At a `scroll: true` snap the library drives the touch scrolling inside
`Sheet.Body` itself, in JavaScript. The mouse wheel, the keyboard and the
scrollbar stay native, because the body is still `overflow-y: auto`. A single
touch gesture can therefore move the sheet and then scroll the content, or the
other way round, and you never have to lift your finger in between.

**Dragging up from a lower snap.** With the finger inside the body, the sheet
rises until it reaches the nearest `scroll: true` snap at or above where it
started. It stops there, and the rest of the same movement scrolls the content.
Nothing jumps: the frame that crosses that snap splits its movement between the
sheet and the content.

**Scrolling towards the top of the list.** Once `scrollTop` reaches `0` and the
finger keeps moving down, the same movement starts dragging the sheet down. The
crossing frame is split again. Direction locks still apply, so a snap with
`drag: { down: false }` stays exactly where it is.

In practice:

| Situation | What happens |
|---|---|
| Drag up inside the body, below a `scroll: true` snap | The sheet rises to that snap, then the same movement scrolls the content |
| Drag up inside the body, content shorter than the body | There is nothing to scroll, so the drag carries on to the higher snaps |
| Keep dragging up once the list has reached its end | The list stops there and the sheet stays put |
| Drag down inside the body, list scrolled part-way | The content scrolls towards its top |
| Keep dragging down once `scrollTop` has reached `0` | The sheet drags down, subject to the snap's direction locks |
| Drag on the handle, the header, or anywhere outside the body | The sheet drags across every snap, the ones above the scrolling snap included |

Snaps above the scrolling one are still reachable, then. You just reach them
from outside `Sheet.Body`. A `data-snap-sheet-no-drag` region is still opted out
of both: neither a drag nor a library scroll starts inside it.

### Nested scrollers inside the body

At a `scroll: true` snap the library drives `scrollTop` itself, and to do that
it takes vertical touch panning from the browser. It sets `touch-action: pan-x`
on `Sheet.Body`, which applies to everything inside it.

So a second vertical scroller nested inside `Sheet.Body` cannot be scrolled by
touch. This is true even inside a `data-snap-sheet-no-drag` region: that
attribute stops the sheet from claiming the gesture, but it cannot give
vertical panning back, because the browser decides that from `touch-action`.
Horizontal panning is unaffected, so a carousel or a swipeable row is fine.

Two ways around it, depending on what you need:

- Put the nested scroller outside `Sheet.Body`, in `Sheet.Header` or in your own
  footer element. Only the body has its touch behaviour taken.
- Leave `scroll` off for that snap. Without it the library never drives
  scrolling, and everything inside the panel keeps its native behaviour.

A mouse wheel and a trackpad are not affected either way. `touch-action` governs
touch only.

### After you let go

If you let go while the content was scrolling, the content carries on with a
momentum fling and comes smoothly to a stop, at the top or the bottom of the
list. It never bounces past either end, and it never moves the sheet. The next
touch cancels it, and so do a snap change and a close. Under
`prefers-reduced-motion: reduce`, or with `reducedMotion: true`, there is no
fling at all.

If you let go while the sheet was moving, the release is the usual one: the
velocity is projected forward and the sheet springs to the snap it was heading
for. See [Gestures](/guide/gestures#where-a-release-lands).

The sheet itself only moves while your finger is down, plus that spring
afterwards. The momentum belongs to the content alone.

A gesture inside a scrollable body belongs to the sheet in both phases, so
`onDragStart` and `onDragEnd` both fire for it. When the release happened during
the scrolling phase, `onDragEnd` reports the snap the sheet is resting at.

For CSS, `Sheet.Content` carries `data-scrolling` while the finger is scrolling
the content and `data-dragging` while the finger is moving the sheet. The two
never appear together. See
[Styling Hooks](/reference/styling-hooks#data-attributes).

## Why the panel is `touch-action: none`

The engine relies on how the browser reads `touch-action`. The browser looks
from the touched element upwards until it finds the **nearest ancestor with a
default touch behaviour**, which means the nearest scroller. Only the
`touch-action` values along that stretch matter.

So:

- `Sheet.Content`, the panel, gets `touch-action: none`. Nothing above the body
  can pan or zoom, so the panel's own drag recogniser receives every pointer.
- At a snap with `scroll: true`, `Sheet.Body` gets
  `overflow-y: auto; overscroll-behavior: contain` and `touch-action: pan-x`.
  The `pan-x` hands the **vertical** touch to us, which is what lets one gesture
  move the sheet and then scroll the list without a break. Horizontal panning
  stays native, so a carousel inside the body keeps its own gesture. The
  `overflow-y: auto` is what keeps the wheel, the keyboard and the scrollbar
  native, and `overscroll-behavior: contain` stops the page behind from
  rubber-banding when the list reaches an edge.
- At every other snap, `Sheet.Body` gets `overflow: hidden`. It is no longer a
  scroller, so the browser carries on up to the panel and the drag wins.

::: warning
Please leave three things to the engine:

- `overflow` and `overflow-y` on `Sheet.Body`. They change with every snap, and
  your own value would decide for the engine whether the body is a scroller.
- `touch-action` on `Sheet.Content` and on `Sheet.Body`. It is what tells the
  browser where a gesture belongs.
- `scrollTop` on `Sheet.Body` during a touch gesture. The engine writes it while
  the finger is scrolling the content, and while the momentum afterwards runs.

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
