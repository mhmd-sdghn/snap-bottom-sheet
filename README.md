<h1 align="center">Snap Bottom Sheet</h1>

<p align="center">
  A draggable, snappable bottom sheet for the web. Snap points you define down to the pixel, one touch that drags the sheet and then scrolls its content, dialog behaviour out of the box, and no runtime dependencies. The core works with any framework, and the React bindings are thin.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/snap-bottom-sheet"><img alt="npm" src="https://img.shields.io/npm/v/snap-bottom-sheet.svg"></a>
  <a href="https://github.com/mhmd-sdghn/snap-bottom-sheet/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/mhmd-sdghn/snap-bottom-sheet/actions/workflows/ci.yml/badge.svg"></a>
  <a href="./LICENSE"><img alt="MIT" src="https://img.shields.io/npm/l/snap-bottom-sheet.svg"></a>
</p>

<p align="center">
  <a href="https://mhmd-sdghn.github.io/snap-bottom-sheet/"><b>Documentation</b></a> ·
  <a href="https://mhmd-sdghn.github.io/snap-bottom-sheet/playground/">Live demo</a> ·
  <a href="https://mhmd-sdghn.github.io/snap-bottom-sheet/demos/">Demos</a> ·
  <a href="https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/getting-started">Getting started</a>
</p>

---

```bash
npm install snap-bottom-sheet
```

## Thirty seconds, in React

```tsx
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

export function RideOptions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Choose a ride
      </button>

      <Sheet open={open} onOpenChange={setOpen} snapPoints={["header", 0.5, 1]}>
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

## The same thing without React

```ts
import { createSheet } from "snap-bottom-sheet";

const sheet = createSheet(
  {
    content: document.querySelector<HTMLElement>("#sheet")!,
    header: document.querySelector<HTMLElement>("#sheet-header"),
    body: document.querySelector<HTMLElement>("#sheet-body"),
    overlay: document.querySelector<HTMLElement>("#sheet-overlay"),
  },
  { snapPoints: ["header", 0.5, 1] },
);

void sheet.open();
```

## Why this one

- **Snap points you define.** A snap point is a height the sheet rests at. Write
  it as a fraction, a percentage, a pixel value, or the measured height of your
  header or content. `steps(3)` writes the even ones for you. An index always
  refers to *your* array order.
- **Measured, not guessed.** `"header"` and `"content"` are measured live by a
  shared `ResizeObserver`. When the height of the active snap changes, the sheet
  springs to the new position instead of jumping.
- **One gesture, drag then scroll.** `{ value: 1, scroll: true }` lets the body
  scroll at that snap. The same touch that drags the sheet up carries on
  scrolling the list, and pulling down from the top of the list gives the
  gesture back to the sheet. `drag: { up: false }` stops the sheet moving in one
  direction.
- **Small, and dependency-free.** The library brings its own spring integrator
  and its own Pointer Events recogniser, so it installs nothing else. Minified
  and gzipped, that is about 11.5 kB with the React bindings, and about 9 kB
  for the core alone. `react` and `react-dom` are optional peers, and the core entry
  needs neither.
- **Ready for real screens.** Content mode sizes the sheet to its own content.
  Sheets nest, each with its own overlay and its own place in the scroll lock. A
  portal `container` puts a sheet inside a card instead of the page. Open state
  and active snap are controlled or uncontrolled, whichever suits you.
- **TypeScript first.** The whole library is written in TypeScript, and the
  types ship with the package. Snap values, part props and the controller
  surface are all typed.
- **Dialog semantics included.** The sheet gets `role="dialog"` and is labelled
  by your title. Focus moves into it, and returns where it came from on close.
  While the sheet is modal its siblings are marked `inert`. Escape closes the
  innermost sheet, and `prefers-reduced-motion` is honoured.
- **Safe for server-side rendering (SSR).** Nothing touches `window` or
  `document` at module scope or during render, and the portal renders `null`
  until it is mounted. App Router, Pages Router and `renderToString` all work
  without a dynamic import.

No stylesheet ships. You get `data-state`, `data-snap-index`, `data-dragging`
and CSS custom properties for position and progress. See
[Styling](https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/styling).

## Repository layout

| Path | What |
| --- | --- |
| [`packages/sheet`](./packages/sheet) | `snap-bottom-sheet`, the published package. `.` is the core, `./react` the bindings. |
| `packages/spring` | `@snap-bottom-sheet/spring`, a private scalar spring that is bundled in |
| `packages/gesture` | `@snap-bottom-sheet/gesture`, a private pointer drag recogniser that is bundled in |
| `docs` | the VitePress site |
| [`playgrounds`](./playgrounds) | React, vanilla and Next.js apps for manual testing |

## Contributing

You need pnpm and a recent Node — 22.22.2 or later, 24.15 or later, or 26 and
above. Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT © Mo Sadeghian
