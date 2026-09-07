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

Both are ordinary snap points otherwise: they take a position in your array,
they can be wrapped in a `SnapPointConfig` for `scroll` and `drag`, and their
index is wherever you put them. Neither requires a special component or a
different prop.

## How each one is measured

A single `ResizeObserver`, shared across every sheet on the page, does all the
measuring. There is no polling and no per-frame layout read.

**`"header"`** observes the `Sheet.Header` element directly. Its `offsetHeight`
is the snap height, so padding and borders on the header count.

::: warning Margins on `Sheet.Header` are excluded
`offsetHeight` does not include margins, so a margin on `Sheet.Header` is
invisible to the `"header"` snap and the peek state lands that many pixels
short. Use padding on the header instead of margins when you want the space to
count.
:::

**`"content"`** observes an inner element inside `Sheet.Content` rather than the
panel itself — the panel is deliberately full-height, so measuring it would
always return the view height. `Sheet.Content` renders that inner wrapper for
you, marked with `data-snap-sheet-inner`, and everything you put inside
`Sheet.Content` goes into it. The measured number is therefore the height of
`Sheet.Header` plus `Sheet.Body`'s content plus whatever else you rendered in the
panel.

For `"content"` to be the *natural* height, `Sheet.Body` must not be a scroller
at that moment — so whenever the active snap has `scroll !== true`, Body is laid
out as `overflow: hidden; flex: none`, and the inner wrapper's height is exactly
the content height. At a `scroll: true` snap, Body becomes
`flex: 1; min-height: 0; overflow-y: auto` and `"content"` measurement is paused,
because the value cannot mean anything there. The **last measured value is
retained** while it is paused, so a `"content"` snap elsewhere in the array keeps
the height it had before the sheet reached the scrolling snap, and measurement
resumes — with a fresh value — as soon as the sheet leaves it.

::: info
Both values are capped at the view height. Content taller than the screen
resolves to a full-height sheet, not to something taller than the view that you
can never see.
:::

## Live re-measure, and the spring-not-jump rule

Measurements are live. Content loads, an accordion expands, the keyboard opens
and shrinks the view, the user rotates the phone — the observer fires and the
controller re-resolves the snap points. Then:

- If the **active** snap's height changed, the sheet animates to the new position
  with the spring.
- If some **other** snap's height changed, nothing moves; the new value applies
  the next time the sheet lands there.
- During a drag, a view-height change is applied immediately instead, so the
  panel stays under the finger.

The consequence worth designing around: a sheet at a `"content"` snap grows and
shrinks *smoothly* as its content changes, which looks intentional for a loaded
list and distracting for a spinner that resolves in 200 ms. If you have a
loading state, render a placeholder at roughly the final height rather than
letting the sheet spring twice.

::: tip
Before the first measurement, an unmeasured `"header"` or `"content"` resolves to
half the view height as a placeholder so the sheet has somewhere to be on first
paint. The real value replaces it on the next measurement, with a spring. Pass
`skipInitialAnimation` if you would rather the sheet appear at position than
animate in.
:::

## Content mode

Omitting `snapPoints` entirely — or passing only `"content"` — puts the sheet in
**content mode**: the controller synthesises one snap from the measured content
height, so the sheet is exactly as tall as what is inside it, drag up is pinned,
and drag down past the threshold closes it (or clamps back when `dismissible` is
`false`). `data-content-mode` on the panel and `contentMode` in
[`useSheetState()`](/reference/react) let you style and branch on it.

## The peek-and-list pattern

The common mobile shape: the sheet rests showing only its header, and the user
drags it up to read the list. Two variants, depending on how tall the list is.

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

Reach for `["header", "content"]` when the content is reliably shorter than the
screen, and `["header", { value: 1, scroll: true }]` when it is not — `"content"`
capped at the view height gives you a full-height sheet whose body cannot scroll,
which is rarely what you want.

## The vanilla contract for the inner element

React's `Sheet.Content` renders the measured inner wrapper for you. In vanilla
JS you own the markup, so the controller looks for it in this order:

1. `content.querySelector(":scope > [data-snap-sheet-inner]")` — an explicitly
   marked direct child. Add the attribute and there is no ambiguity.
2. `content.firstElementChild`, but **only** when `content` has exactly one
   element child.
3. `content` itself — which is full height, so `"content"` will resolve to the
   view height.

In practice: mark the wrapper, or keep a single element child.

```html
<div id="sheet">
  <div data-snap-sheet-inner>
    <header id="sheet-header">…</header>
    <div id="sheet-body">…</div>
  </div>
</div>
```

`"header"` has no such ambiguity — it measures whatever element you passed as
`elements.header`, so pass it if you use `"header"` as a snap value. Both parts
can also arrive later via `setElements`; measurement starts when the element
does.

## Where next

- [Snap Points](/guide/snap-points) — every other value form.
- [Scrolling](/guide/scrolling) — `scroll: true` and the layout it implies.
- [Vanilla JS](/guide/vanilla) — the full markup contract.
