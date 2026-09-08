# Vanilla JS

`createSheet` attaches the engine to elements you have already rendered. You need no framework and no build step.

## A complete sheet

Three parts: the markup, the CSS, and a single call.

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

On the panel, the library writes only what it has to own: `position`, `inset`,
`height`, `display: flex`, `box-sizing`, `touch-action`, `overscroll-behavior`
and `transform`. On the overlay it writes `inset: 0` and `position`, which is
`fixed`, or `absolute` when you pass a `container`. It writes nothing else
there, so your overlay rule sets the colour and leaves the positioning alone.
Everything that makes the panel look like a sheet is yours, and no `z-index` is
ever written on any element.

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

Please do not set `position`, `height` or `transform` on the panel. Every other
inline style you set wins. The controller writes its base layout styles **once**
at attach, so anything you apply afterwards is not overwritten.

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

That is the whole integration. The controller takes care of the rest: dragging,
the spring, resolving the snap points, choosing between scrolling and dragging,
locking the page scroll, marking siblings `inert`, trapping and restoring focus,
handling Escape, and writing every `data-*` attribute, `aria-*` attribute and
CSS variable.

## What `createSheet` needs

Only `content` is required, and it is **fixed for the lifetime of the
controller**. To move the sheet to a different panel element, call `destroy()`
and create a new controller. `container` is fixed for the same reason. Every
other element may be `null` at attach and arrive later through `setElements`.

| Element | Required | What it does |
| --- | --- | --- |
| `content` | Yes | The panel. It receives the transform, the padding, the `data-*` attributes, the CSS variables and the dialog role. |
| `header` | No | Measured for the `"header"` snap value. |
| `body` | No | The scroll region. Its `overflow` changes per snap, and the choice between scrolling and dragging is made here. |
| `overlay` | No | A click on it closes the sheet when `dismissible` is set. It receives `data-state` and `aria-hidden`. |
| `handle` | No | The keyboard target. ArrowUp and ArrowDown step one snap and stop at the ends. Enter and Space move to the next snap and wrap around. |
| `container` | No | The source of the view height and the scope for `inert`. Defaults to `document.body`, which means the window height. |

::: warning A custom `container` narrows the `inert` scope
`inert` is applied to the children of the container. With the default
`document.body`, the whole page behind the sheet becomes inert. If you pass your
own `container`, only its children do. Anything outside it stays interactive and
reachable by a screen reader while the modal sheet is open.
:::

::: warning The controller starts closed
`createSheet` moves the panel to `viewHeight` and sets `data-state="closed"`
straight away, so nothing is visible until you call `open()`. The core has no
`defaultOpen`. Call `open()` right after you create the controller. If you want
the sheet to appear in place instead of animating up, pass
`skipInitialAnimation: true` and then call `open()`. `skipInitialAnimation`
applies to the **first `open()` of a controller instance** only. Every later
`open()` animates as usual, and a new controller gets a fresh first open.
:::

`content` is validated as well. `createSheet` throws a `TypeError` when
`elements.content` is missing, and `setElements` throws a `TypeError` if you
pass it `content` or `container`. Both are fixed for the lifetime of the
controller, so `setElements({ content })` and `setElements({ container })` are
errors rather than silent no-ops.

## The content-inner measurement contract

The `"content"` value needs one element whose height is the natural height of
the content. So does content mode, which is what you get when you pass no snap
points. The controller looks for that element in this order:

1. `content.querySelector(":scope > [data-snap-sheet-inner]")`
2. `content.firstElementChild`, if `content` has exactly **one** element child
3. `content` itself

So you have two options. Add `data-snap-sheet-inner` to a single wrapper div, as
the example above does, or keep exactly one element child inside the panel. If
the panel has several children and none of them carries the attribute, the
measurement falls back to the panel itself. The panel is full-height, so
`"content"` then collapses to the view height.

The wrapper is resolved **once, at attach**, and observed for as long as the
controller lives. If you replace that element later, for example by rendering
the panel's markup again from scratch, the controller keeps measuring the node
it captured, which has left the document, and `"content"` stops responding. Keep
the wrapper in place and replace what is inside it, or call `destroy()` and
create the sheet again.

::: tip
The React bindings always render the inner div with that attribute, so this only
comes up in vanilla usage.
:::

## Controller lifecycle

| Method | Returns | Description |
| --- | --- | --- |
| `open()` | `Promise<void>` | Animates to the active snap. Resolves when the spring comes to rest. |
| `close()` | `Promise<void>` | Animates to `viewHeight` and reports `onOpenChange(false)`. |
| `snapTo(index, { immediate })` | `Promise<void>` | Moves to a snap point by **your array index**. `immediate: true` jumps there. On a **closed** sheet it only records the snap to open at. It does not open the sheet, so call `open()` for that. |
| `update(options)` | `void` | Merges the values into the options. It resolves the snap points again, keeps `snapIndex` if it is still valid and clamps it if not, and animates again if the active snap moved. |
| `setElements(elements)` | `void` | Adds or replaces optional parts after attach, and `null` removes one. Only the parts that changed are rewired, and the current position is kept. |
| `getState()` | `SheetState` | `{ open, snapIndex, y, progress, dragging, animating, contentMode }`. |
| `subscribe(fn)` | `() => void` | Calls `fn(state)` on every state change. Returns the unsubscribe function. |
| `destroy()` | `void` | Detaches the gesture and the observers, and restores the scroll lock, `inert`, focus and styles. |

You can rely on two more details:

- **`getState()` returns the same object until the state changes.** The
  controller replaces the object instead of changing it in place, so comparing
  references is a valid way to ask whether anything changed.
- **`destroy()` is safe to call more than once.** After it, every method does
  nothing, and the ones that return a promise resolve at once.

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

In React, `aria-labelledby` and `aria-describedby` are wired up from
`Sheet.Title` and `Sheet.Description` with `useId`. In vanilla you own the ids
and pass them yourself:

```ts
createSheet(elements, {
  labelledBy: "sheet-title", // → aria-labelledby on the panel
  describedBy: "sheet-desc", // → aria-describedby on the panel
});
```

The controller adds `role="dialog"` and `aria-modal` itself. While `modal` is
`true`, it also moves focus into the panel when the sheet opens, marks the
container's other children `inert`, and returns focus to the previously focused
element when the sheet closes. Please use a real `<button>` element for the
handle, rather than a styled `div`, so the keyboard bindings land on something
that can take focus.

## Where next

- [Core API](/reference/core) — the full `createSheet` surface.
- [Styling](/guide/styling) — every `data-*` attribute and CSS variable.
- [Accessibility](/guide/accessibility) — focus, `inert`, Escape, reduced motion.
