# snap-bottom-sheet

A draggable, snappable bottom sheet for the web. Snap points you define down to
the pixel, one touch that drags the sheet and then scrolls its content, dialog
behaviour out of the box, and no runtime dependencies. The core works with any
framework, and the React bindings are thin.

**[Documentation](https://mhmd-sdghn.github.io/snap-bottom-sheet/)** ·
[Live demo](https://mhmd-sdghn.github.io/snap-bottom-sheet/playground/) ·
[Demos](https://mhmd-sdghn.github.io/snap-bottom-sheet/demos/) ·
[Getting started](https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/getting-started)

```bash
npm install snap-bottom-sheet
```

There are two entry points. `react` and `react-dom` (18 or 19) are optional
peers, and the core entry needs neither.

| Import | What |
| --- | --- |
| `snap-bottom-sheet` | `createSheet`, `steps`, and the types. Works with any framework, or none. |
| `snap-bottom-sheet/react` | `Sheet` and its parts, `useSheetState`. |

## React

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

## Vanilla

`createSheet` attaches the engine to elements you already rendered.

```ts
import { createSheet } from "snap-bottom-sheet";

const content = document.querySelector<HTMLElement>("#sheet");
if (!content) throw new Error("missing sheet markup");

const sheet = createSheet(
  {
    content,
    header: document.querySelector<HTMLElement>("#sheet-header"),
    body: document.querySelector<HTMLElement>("#sheet-body"),
    overlay: document.querySelector<HTMLElement>("#sheet-overlay"),
    handle: document.querySelector<HTMLElement>("#sheet-handle"),
  },
  { snapPoints: ["header", 0.5, 1], defaultSnapIndex: 1 },
);

void sheet.open();
```

For `"content"` to be measured, the panel needs one element child carrying
`data-snap-sheet-inner`. A single element child works too.

## Snap points

```ts
type SnapValue =
  | number            // 0 < n <= 1 → fraction of view height; n > 1 → px
  | `${number}%`
  | `${number}px`
  | "header"          // measured height of Sheet.Header
  | "content";        // measured natural height of the content, capped at view height

type SnapPoint = SnapValue | {
  value: SnapValue;
  scroll?: boolean;                                   // body scrolls here (default false)
  drag?: boolean | { up?: boolean; down?: boolean };   // default true
};
```

| You write | You get |
| --- | --- |
| `[0.5, 1]` | half the view, then all of it |
| `["50%", "320px"]` | the same half, then a fixed 320px |
| `["header", "content"]` | a peek at the header, then the whole content |
| `[{ value: 1, scroll: true }]` | full height, body scrolls, pull down at the top to drag |
| `[{ value: 0.3, drag: { down: false } }]` | cannot be dragged below 30% |
| `steps(3)` | `[1/3, 2/3, 1]` |
| `[]` | content mode: the sheet takes the height of its content |

**Indices are your array order.** The library sorts the points internally to
find neighbours. Even so, `activeSnapIndex` and `onSnapIndexChange` always use
the order you wrote.

## Why this one

- **Measured, not guessed.** `"header"` and `"content"` are measured live by a
  shared `ResizeObserver`. When the height of the active snap changes, the sheet
  springs to the new position rather than jumping.
- **One gesture, drag then scroll.** The touch that drags the sheet to the top
  snap carries on scrolling the list. Pull down from the top of the list and the
  sheet takes the gesture back. You choose which snaps scroll, and which
  directions each snap may be dragged in.
- **Small, and dependency-free.** The library brings its own spring integrator
  and Pointer Events recogniser, so it installs nothing else. Minified and
  gzipped, that is about 10 kB with the React bindings, and about 8 kB for the
  core alone.
- **Ready for real screens.** Content mode sizes the sheet to its own content.
  Sheets nest, each with its own overlay and its own place in the scroll lock. A
  portal `container` puts a sheet inside a card instead of the page. Open state
  and active snap are controlled or uncontrolled, whichever suits you.
- **TypeScript first.** The whole library is written in TypeScript, and the
  types ship with the package.
- **Dialog semantics included.** The sheet gets `role="dialog"` and is labelled
  by your title. Focus moves into it, and returns where it came from on close.
  While the sheet is modal its siblings are marked `inert`. Escape closes the
  innermost sheet, and `prefers-reduced-motion` is honoured.
- **Safe for server-side rendering (SSR).** Nothing touches `window` or
  `document` at module scope or during render, and the portal renders `null`
  until it is mounted. The Next.js App Router, the Pages Router and
  `renderToString` all work with no dynamic import.

No stylesheet ships. The library writes only the positioning and the transform
that it has to own. Background, radius and shadow are yours. You drive them with
`data-state`, `data-snap-index`, `data-dragging` and the `--snap-sheet-*` custom
properties.

## Going deeper

| Topic | Page |
| --- | --- |
| Install and first sheet | [Getting Started](https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/getting-started) |
| The y-offset model, content mode | [Core Concepts](https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/core-concepts) |
| Scroll vs drag, `touch-action` | [Scrolling](https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/scrolling) |
| Drag locks, velocity, dismissal | [Gestures](https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/gestures) |
| Data attributes and CSS variables | [Styling](https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/styling) |
| Focus, `inert`, Escape, reduced motion | [Accessibility](https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/accessibility) |
| Next.js, `renderToString` | [SSR & Next.js](https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/ssr-nextjs) |
| Every prop and method | [React API](https://mhmd-sdghn.github.io/snap-bottom-sheet/reference/react) · [Core API](https://mhmd-sdghn.github.io/snap-bottom-sheet/reference/core) |
| Upgrading an existing install | [Migration guide](https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/migration) |

## License

MIT © Mo Sadeghian
