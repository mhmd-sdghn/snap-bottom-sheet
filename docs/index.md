---
layout: home

hero:
  name: "Snap Bottom Sheet"
  text: "A bottom sheet that lands where you meant it to"
  tagline: Draggable, snappable, accessible. A framework-agnostic core plus thin React bindings — no animation or gesture dependencies.
  image:
    src: /logo.svg
    alt: Snap Bottom Sheet
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/mhmd-sdghn/react-bottom-sheet

features:
  - icon: 🎯
    title: Snap points that mean what you wrote
    details: Fractions, percentages, pixels, or the measured height of your header or content. Indices always refer to your array order, never a sorted rewrite of it.
  - icon: 📐
    title: Measured, not guessed
    details: '"header" and "content" are live-measured with a shared ResizeObserver. When the active snap''s height changes, the sheet springs to the new position instead of jumping.'
  - icon: 🪶
    title: Zero runtime dependencies
    details: Its own spring integrator and its own Pointer Events drag recogniser. React and react-dom are optional peers — the core entry needs neither.
  - icon: 📜
    title: Scroll and drag, arbitrated
    details: Mark a snap point scroll and Sheet.Body scrolls there. Pull down at the top of the scroll and the sheet takes over. No double-handling, no stuck gestures.
  - icon: 🎨
    title: Style it with CSS, not props
    details: No stylesheet ships. You get data-state, data-snap-index, data-dragging and CSS custom properties for position and progress, written straight to the DOM each frame.
  - icon: ♿
    title: Dialog semantics included
    details: role="dialog", labelled by your Title, focus moved in and restored on close, siblings inert while modal, Escape to the innermost sheet, and prefers-reduced-motion honoured.
  - icon: 🧩
    title: Vanilla or React
    details: createSheet attaches the engine to elements you already rendered. The React layer renders those elements and hands them over — the same engine underneath.
  - icon: ▲
    title: SSR-safe on purpose
    details: No window or document at module scope or during render. The portal renders null until mounted, so app router, pages router and renderToString all work without a dynamic import.
---

## Show me code

The React bindings render the DOM and hand it to the engine. The core does the same job when you bring your own markup.

::: code-group

```tsx [React]
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

export function RideOptions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Choose a ride
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        snapPoints={["header", 0.5, 1]}
        defaultSnapIndex={1}
      >
        <Sheet.Portal>
          <Sheet.Overlay className="overlay" />
          <Sheet.Content className="sheet">
            <Sheet.Handle className="handle" />
            <Sheet.Header className="header">
              <Sheet.Title>Ride options</Sheet.Title>
            </Sheet.Header>
            <Sheet.Body className="body">
              <p>Drag the handle, or drag anywhere on the sheet.</p>
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
    snapPoints: ["header", 0.5, 1],
    defaultSnapIndex: 1,
    onOpenChange: (open) => {
      if (!open) document.body.classList.remove("sheet-open");
    },
  },
);

document.querySelector("#choose")?.addEventListener("click", () => {
  void sheet.open();
});
```

:::

The sheet ships no CSS beyond the transform and positioning it must own, so the
look above is yours: background, radius, shadow, and the handle pill.

## Where next

- [Getting Started](/guide/getting-started) — install and a working sheet in both flavours.
- [Core Concepts](/guide/core-concepts) — the y-offset model, snap indices, content mode.
- [Snap Points](/guide/snap-points) — every value form and the per-snap options.
- [React API](/reference/react) and [Core API](/reference/core) — the full surface.
