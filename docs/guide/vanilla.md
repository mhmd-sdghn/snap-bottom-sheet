# Vanilla JS

`createSheet` attaches the engine to elements you already rendered — no framework, no build step required.

## A complete sheet

Three files: markup, CSS, and one call.

### The markup

```html
<button id="open" type="button">Open sheet</button>

<div id="overlay" class="sheet-overlay"></div>

<div id="sheet" class="sheet">
  <div data-snap-sheet-inner>
    <button id="handle" class="sheet-handle" type="button"></button>

    <div id="header" class="sheet-header">
      <h2 id="sheet-title">Ride options</h2>
      <p id="sheet-desc">Drag the handle or the sheet itself.</p>
    </div>

    <div id="body" class="sheet-body">
      <p>Standard · 4 min away</p>
      <p>XL · 7 min away</p>
      <button id="close" type="button">Cancel</button>
    </div>
  </div>
</div>
```

### The CSS

The library writes only what it must own on the panel — `position`, `inset`,
`height`, `display: flex`, `box-sizing`, `touch-action`, `overscroll-behavior`,
and `transform`. On the overlay it writes `position` (`fixed`, or `absolute` when
you pass a `container`) and `inset: 0`, and nothing else — so your overlay rule
carries the colour and leaves the positioning alone. Everything that makes it
*look* like a sheet is yours, and no `z-index` is ever written on any element.

```css
.sheet-overlay {
  background: rgb(0 0 0 / 0.4);
  opacity: var(--snap-sheet-progress, 0);
}

.sheet {
  background: white;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 24px rgb(0 0 0 / 0.15);
}

.sheet-handle {
  display: block;
  width: 40px;
  height: 4px;
  margin: 8px auto;
  border: 0;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.2);
}

.sheet-header {
  padding: 8px 20px 16px;
}

.sheet-body {
  padding: 0 20px 20px;
}
```

Don't set `position`, `height` or `transform` on the panel. Every other inline
style you set wins: the controller writes its base layout styles **once** at
attach, so your own declarations applied afterwards are not overwritten.

### The JavaScript

```ts
import { createSheet } from "snap-bottom-sheet";

const el = (id: string) => document.getElementById(id) as HTMLElement;

const sheet = createSheet(
  {
    content: el("sheet"),
    header: el("header"),
    body: el("body"),
    overlay: el("overlay"),
    handle: el("handle"),
  },
  {
    snapPoints: ["header", { value: 0.6, scroll: true }, 0.95],
    defaultSnapIndex: 1,
    labelledBy: "sheet-title",
    describedBy: "sheet-desc",
    onSnapIndexChange: (index) => console.log("snapped to", index),
    onOpenChange: (open) => console.log(open ? "opened" : "closed"),
  },
);

el("open").addEventListener("click", () => void sheet.open());
el("close").addEventListener("click", () => void sheet.close());
```

That is the whole integration. Dragging, the spring, snap resolution,
scroll-vs-drag arbitration, page scroll lock, `inert` on siblings, focus
trapping and restoration, Escape handling, and every `data-*` / `aria-*` /
CSS-variable write are the controller's job.

## What `createSheet` needs

Only `content` is required, and it is **fixed for the controller's lifetime** —
to move the sheet to a different panel element, `destroy()` and create a new
controller. `container` is fixed for the same reason. Every other element may be
`null` at attach and arrive later through `setElements`.

| Element | Required | What it does |
| --- | --- | --- |
| `content` | Yes | The panel. Receives the transform, the padding, the `data-*`, the CSS variables and the dialog role. |
| `header` | No | Measured for the `"header"` snap value. |
| `body` | No | The scroll region: `overflow` is toggled per snap, and scroll-vs-drag is decided here. |
| `overlay` | No | Click closes the sheet when `dismissible`. Receives `data-state` and `aria-hidden`. |
| `handle` | No | Keyboard target: ArrowUp/ArrowDown step one snap and clamp at the ends, Enter/Space cycles to the next snap and wraps. |
| `container` | No | View-height source and `inert` scope. Defaults to `document.body` (window height). |

::: warning A custom `container` narrows the `inert` scope
`inert` is applied to the *children of the container*, so with the default
`document.body` the whole page behind the sheet goes inert. Pass your own
`container` and only its children do — anything outside it stays interactive and
reachable by screen reader while the modal sheet is open.
:::

::: warning The controller starts closed
`createSheet` translates the panel to `viewHeight` and sets
`data-state="closed"` immediately. Nothing is visible until you call `open()`.
There is no `defaultOpen` on the core — call `open()` right after creating the
controller, or pass `skipInitialAnimation: true` and `open()` to appear at
position instead of animating up. `skipInitialAnimation` applies to the **first
`open()` of a controller instance** only: every later `open()` animates
normally, and creating a new controller gets a fresh first open.
:::

`content` is also validated: `createSheet` throws a `TypeError` when
`elements.content` is missing, and `setElements` throws a `TypeError` if you try
to pass `content` or `container` to it — those two are fixed for the
controller's lifetime, so `setElements({ content })` and
`setElements({ container })` are errors, not silent no-ops.

## The content-inner measurement contract

`"content"` (and content mode, which is what you get with no snap points) needs
one element whose height is the natural content height. The controller looks
for it in this order:

1. `content.querySelector(":scope > [data-snap-sheet-inner]")`
2. `content.firstElementChild`, if `content` has exactly **one** element child
3. `content` itself

So either add `data-snap-sheet-inner` to a single wrapper div — as the example
above does — or keep exactly one element child inside the panel. If the panel
has several children and none is attributed, the measurement falls back to the
panel, which is full-height, and `"content"` collapses to the view height.

The wrapper is resolved **once, at attach**, and observed for as long as the
controller lives. If you swap that element out later — re-rendering the panel's
markup wholesale, say — the controller keeps measuring the old, detached node
and `"content"` stops responding. Keep the wrapper stable and replace what is
inside it, or `destroy()` and create the sheet again.

::: tip
The React bindings always render the attributed inner div, which is why this
only comes up in vanilla usage.
:::

## Controller lifecycle

| Method | Returns | Description |
| --- | --- | --- |
| `open()` | `Promise<void>` | Animates to the active snap. Resolves when the spring rests. |
| `close()` | `Promise<void>` | Animates to `viewHeight` and reports `onOpenChange(false)`. |
| `snapTo(index, { immediate })` | `Promise<void>` | Moves to a snap point by **your array index**. `immediate: true` jumps. On a **closed** sheet it only records the snap to open at — it does not open the sheet; call `open()` for that. |
| `update(options)` | `void` | Merges into the options: re-resolves snap points, keeps `snapIndex` if still valid, clamps otherwise, and re-animates if the active snap's position changed. |
| `setElements(elements)` | `void` | Registers or replaces optional parts after attach; `null` removes one. Rewires only the parts that changed; the current position is kept. |
| `getState()` | `SheetState` | `{ open, snapIndex, y, progress, dragging, animating, contentMode }`. |
| `subscribe(fn)` | `() => void` | Calls `fn(state)` on every state change. Returns the unsubscribe function. |
| `destroy()` | `void` | Detaches the gesture and observers and restores scroll lock, `inert`, focus and styles. |

Two details worth relying on:

- **`getState()` returns the same object reference until the next state
  change.** The controller replaces the object rather than mutating it, so a
  reference comparison is a valid "did anything change" test.
- **`destroy()` is idempotent.** After it, every method is a no-op and the
  promise-returning ones resolve immediately.

```ts
// Late-arriving parts, live option changes, and teardown.
sheet.setElements({ body: document.getElementById("new-body") });
sheet.update({ snapPoints: [0.3, 0.9], dismissible: false });

const stop = sheet.subscribe((state) => {
  document.body.classList.toggle("sheet-open", state.open);
});

// on teardown
stop();
sheet.destroy();
```

## Dialog semantics without React

React wires `aria-labelledby` and `aria-describedby` from `Sheet.Title` and
`Sheet.Description` via `useId`. In vanilla you own the ids and pass them:

```ts
createSheet(elements, {
  labelledBy: "sheet-title", // → aria-labelledby on the panel
  describedBy: "sheet-desc", // → aria-describedby on the panel
});
```

The controller adds `role="dialog"` and `aria-modal` itself, and — while
`modal` is `true` — moves focus into the panel on open, marks the container's
other children `inert`, and returns focus to the previously focused element on
close. Give the handle a real `<button>` element (not a styled `div`) so the
keyboard bindings land on something focusable.

## Where next

- [Core API](/reference/core) — the full `createSheet` surface.
- [Styling](/guide/styling) — every `data-*` attribute and CSS variable.
- [Accessibility](/guide/accessibility) — focus, `inert`, Escape, reduced motion.
