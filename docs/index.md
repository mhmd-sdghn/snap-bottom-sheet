---
layout: home

hero:
  name: "Snap Bottom Sheet"
  text: "A bottom sheet that stops where you asked it to"
  tagline: Snap points you define down to the pixel, one touch that drags the sheet and then scrolls its content, and dialog behaviour out of the box. A framework-free core with a thin React layer, and no runtime dependencies.
  image:
    src: /logo.svg
    alt: Snap Bottom Sheet
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/mhmd-sdghn/snap-bottom-sheet

features:
  - icon: 🎯
    title: Snap points you define
    details: A snap point is a fraction, a percentage, a pixel height, or the measured height of your header or content. steps(3) writes the even ones for you. Each snap can carry its own scroll and drag rules, and an index always points at the same item in the array you passed.
  - icon: 📐
    title: Measured, not guessed
    details: '"header" and "content" are measured while your app runs, through one shared ResizeObserver. When the height of the active snap changes, the sheet springs to the new position instead of jumping.'
  - icon: 📜
    title: One gesture, drag then scroll
    details: A single touch drags the sheet to the top snap, carries on scrolling the body, and hands the gesture back to the sheet when you pull down from the top. You do not lift your finger, and you decide which snaps scroll.
  - icon: 🪶
    title: Small, and dependency-free
    details: The library brings its own spring and its own Pointer Events drag recogniser, so it installs no runtime dependencies. Minified and gzipped, that is about 11.5 kB with the React bindings and about 9 kB for the core alone.
  - icon: 🎨
    title: Style it with CSS, not props
    details: No stylesheet ships with the library. You get data-state, data-snap-index, data-dragging and CSS custom properties for position and progress. They are written straight to the DOM on each frame.
  - icon: ♿
    title: Dialog behaviour included
    details: The panel is a role="dialog" element, labelled by your Title. Focus moves in and returns on close, siblings become inert while modal, Escape closes the innermost sheet, and prefers-reduced-motion is honoured.
  - icon: 🧩
    title: Vanilla core, React bindings
    details: createSheet attaches the engine to elements you already rendered, and the React layer renders those elements and hands them over. The engine underneath is the same one, so a binding for another framework can sit on it. Everything is written in TypeScript, and the types ship with the package.
  - icon: 🧭
    title: Ready for real screens
    details: Content mode sizes the sheet to its content. Sheets nest, each with its own overlay and scroll lock. A portal container puts a sheet inside a card instead of the page. Open state and active snap are controlled or uncontrolled, whichever suits you.
  - icon: ▲
    title: Safe to render on the server
    details: There is no window or document at module scope or during render. The portal renders null until it has mounted, so the Next.js App Router, the Pages Router and renderToString all work without a dynamic import.
---

## Show me code

The React bindings render the DOM and hand it to the engine. If you prefer to write the markup yourself, the core does the same job.

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

The sheet writes only the transform and positioning it has to own. Everything
you see above is yours to style: the background, the radius, the shadow and the
handle pill.

## Where next

- [Getting Started](/guide/getting-started) — how to install, and a working sheet in both flavours.
- [Core Concepts](/guide/core-concepts) — the y-offset model, snap indices and content mode.
- [Snap Points](/guide/snap-points) — every value form and the per-snap options.
- [React API](/reference/react) and [Core API](/reference/core) — the complete API.
