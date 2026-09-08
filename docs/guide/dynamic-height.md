<script setup>
import dynamicheightDemo from "../.vitepress/theme/demos/dynamic-height.tsx";
</script>

# Dynamic Height

Two snap values are measured from the DOM instead of computed from the view: `"header"` and `"content"`.

<ClientOnly>
  <ReactDemo :mount="dynamicheightDemo" />
</ClientOnly>

## The two values

| Value | Measures | Typical use |
| --- | --- | --- |
| `"header"` | The `Sheet.Header` element | A peek state showing just the title bar |
| `"content"` | The natural height of everything in the panel | A sheet that hugs its content |

```tsx
<Sheet snapPoints={["header", "content"]}>
```

In every other way they are ordinary snap points. They take a position in your
array, you can wrap them in a `SnapPointConfig` to set `scroll` and `drag`, and
their index is wherever you put them. Neither one needs a special component or a
different prop.

## How each one is measured

A single `ResizeObserver`, shared across every sheet on the page, does all the
measuring. There is no polling and no per-frame layout read.

**`"header"`** observes the `Sheet.Header` element directly. Its `offsetHeight`
is the snap height, so padding and borders on the header count.

::: warning Margins on `Sheet.Header` are excluded
`offsetHeight` does not include margins. A margin on `Sheet.Header` is therefore
invisible to the `"header"` snap, and the peek state lands that many pixels
short. Use padding on the header instead of margins when you want the space to
count.
:::

**`"content"`** observes an inner element inside `Sheet.Content` rather than the
panel itself. The panel is deliberately full height, so measuring it would always
return the view height. `Sheet.Content` renders that inner wrapper for you and
marks it with `data-snap-sheet-inner`. Everything you put inside `Sheet.Content`
goes into it. The measured number is therefore the height of `Sheet.Header`, plus
the content of `Sheet.Body`, plus anything else you rendered in the panel.

For `"content"` to be the *natural* height, `Sheet.Body` must not be a scroller
at that moment. So whenever the active snap has `scroll !== true`, Body is laid
out as `overflow: hidden; flex: none`, and the height of the inner wrapper is
exactly the content height.

At a `scroll: true` snap, Body becomes `flex: 1; min-height: 0; overflow-y: auto`
and `"content"` measurement pauses, because the value cannot mean anything there.
The **last measured value is kept** while measurement is paused. A `"content"`
snap elsewhere in the array therefore keeps the height it had before the sheet
reached the scrolling snap. Measurement starts again, with a fresh value, as soon
as the sheet leaves that snap.

::: info
Both values are capped at the view height. Content that is taller than the screen
resolves to a full-height sheet. It never resolves to something taller than the
view, which you could not see anyway.
:::

## Live re-measure, and the spring-not-jump rule

Measurements are live. Content loads, an accordion expands, the keyboard opens
and shrinks the view, or the user rotates the phone. In each case the observer
fires and the controller resolves the snap points again. Then:

- If the **active** snap's height changed, the sheet animates to the new position
  with the spring.
- If some **other** snap's height changed, nothing moves; the new value applies
  the next time the sheet lands there.
- During a drag, a view-height change is applied immediately instead, so the
  panel stays under the finger.

There is one thing to design around. A sheet at a `"content"` snap grows and
shrinks *smoothly* as its content changes. That looks deliberate for a list that
has just loaded, but distracting for a spinner that finishes in 200 ms. If you
have a loading state, render a placeholder at roughly the final height rather
than letting the sheet spring twice.

::: tip
Before the first measurement, an unmeasured `"header"` or `"content"` resolves to
half the view height. This placeholder gives the sheet somewhere to be on first
paint. The real value replaces it at the next measurement, with a spring. Pass
`skipInitialAnimation` if you would rather the sheet appeared in position instead
of animating in.
:::

## Content mode

The sheet enters **content mode** when you leave out `snapPoints`, or when you
pass only `"content"`. The controller then builds one snap from the measured
content height. The sheet is exactly as tall as what is inside it, drag up is
pinned, and drag down past the threshold closes it. It clamps back instead when
`dismissible` is `false`. `data-content-mode` on the panel and `contentMode` in
[`useSheetState()`](/reference/react) let you style and branch on it.

## The peek-and-list pattern

This is the common shape on mobile. The sheet rests with only its header showing,
and the user drags it up to read the list. There are two variants, depending on
how tall the list is.

::: code-group

```tsx [React]
import { Sheet } from "snap-bottom-sheet/react";

// Short list: snapPoints={["header", "content"]}
// Long list:  snapPoints={["header", { value: 1, scroll: true }]}
<Sheet
  open={open}
  onOpenChange={setOpen}
  snapPoints={["header", { value: 1, scroll: true }]}
>
  <Sheet.Portal>
    <Sheet.Overlay className="overlay" />
    <Sheet.Content className="sheet">
      <Sheet.Handle className="handle" />
      <Sheet.Header className="header">
        <Sheet.Title>Nearby stops</Sheet.Title>
      </Sheet.Header>
      <Sheet.Body className="body">
        {stops.map((stop) => (
          <p key={stop.id}>{stop.name}</p>
        ))}
      </Sheet.Body>
    </Sheet.Content>
  </Sheet.Portal>
</Sheet>
```

```ts [Vanilla]
import { createSheet } from "snap-bottom-sheet";

const sheet = createSheet(
  {
    content: document.querySelector<HTMLElement>("#sheet")!,
    header: document.querySelector<HTMLElement>("#sheet-header"),
    body: document.querySelector<HTMLElement>("#sheet-body"),
  },
  {
    // Short list: ["header", "content"]
    // Long list:  ["header", { value: 1, scroll: true }]
    snapPoints: ["header", { value: 1, scroll: true }],
  },
);

void sheet.open();
```

:::

Use `["header", "content"]` when the content is reliably shorter than the screen,
and `["header", { value: 1, scroll: true }]` when it is not. Once `"content"` is
capped at the view height, you get a full-height sheet whose body cannot scroll,
and that is rarely what you want.

## The vanilla contract for the inner element

React's `Sheet.Content` renders the measured inner wrapper for you. In vanilla
JS you own the markup, so the controller looks for it in this order:

1. `content.querySelector(":scope > [data-snap-sheet-inner]")` — an explicitly
   marked direct child. Add the attribute and there is no ambiguity.
2. `content.firstElementChild`, but **only** when `content` has exactly one
   element child.
3. `content` itself. That element is full height, so `"content"` will resolve to
   the view height.

In practice, mark the wrapper or keep a single element child.

```html
<div id="sheet">
  <div data-snap-sheet-inner>
    <header id="sheet-header">…</header>
    <div id="sheet-body">…</div>
  </div>
</div>
```

`"header"` has no such ambiguity. It measures whatever element you passed as
`elements.header`, so please pass one if you use `"header"` as a snap value. Both
elements can also arrive later through `setElements`. Measurement starts as soon
as the element does.

## Where next

- [Snap Points](/guide/snap-points) — every other value form.
- [Scrolling](/guide/scrolling) — `scroll: true` and the layout it implies.
- [Vanilla JS](/guide/vanilla) — the full markup contract.
