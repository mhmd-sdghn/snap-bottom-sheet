# snap-bottom-sheet

A draggable, snappable bottom sheet for the web. Framework-agnostic core, thin
React bindings, zero runtime dependencies.

**[Documentation](https://mhmd-sdghn.github.io/react-bottom-sheet/)** ·
[Demos](https://mhmd-sdghn.github.io/react-bottom-sheet/demos/) ·
[Migrating from 0.x](https://mhmd-sdghn.github.io/react-bottom-sheet/guide/migration)

```bash
npm install snap-bottom-sheet
```

Two entry points. `react` and `react-dom` (18 or 19) are optional peers — the
core entry needs neither.

| Import | What |
| --- | --- |
| `snap-bottom-sheet` | `createSheet`, `steps`, and the types. Works in any framework, or none. |
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

The panel needs one element child carrying `data-snap-sheet-inner`, or a single
element child, so `"content"` can be measured.

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
| `[]` | content mode — the sheet hugs its content |

**Indices are your array order.** Points are sorted internally to find
neighbours, but `activeSnapIndex` and `onSnapIndexChange` always speak in the
order you wrote.

## Why this one

- **Measured, not guessed.** `"header"` and `"content"` are live-measured with a
  shared `ResizeObserver`. When the active snap's height changes, the sheet
  springs to the new position rather than jumping.
- **Per-snap scroll and drag rules**, so a scrollable list and a peek header can
  live in one sheet without fighting each other for the gesture.
- **Zero runtime dependencies** — its own spring integrator and Pointer Events
  recogniser. About 13 kB gzipped for the core, 17 kB with the React bindings.
- **Dialog semantics included**: `role="dialog"`, labelled by your title, focus
  moved in and restored on close, siblings `inert` while modal, Escape to the
  innermost sheet, `prefers-reduced-motion` honoured.
- **SSR-safe on purpose.** No `window` or `document` at module scope or during
  render; the portal renders `null` until mounted. Next.js App Router, Pages
  Router and `renderToString` all work with no dynamic import.

No stylesheet ships. The library writes only the positioning and transform it
must own; background, radius and shadow are yours, driven by `data-state`,
`data-snap-index`, `data-dragging` and the `--snap-sheet-*` custom properties.

## Going deeper

| Topic | Page |
| --- | --- |
| Install and first sheet | [Getting Started](https://mhmd-sdghn.github.io/react-bottom-sheet/guide/getting-started) |
| The y-offset model, content mode | [Core Concepts](https://mhmd-sdghn.github.io/react-bottom-sheet/guide/core-concepts) |
| Scroll vs drag, `touch-action` | [Scrolling](https://mhmd-sdghn.github.io/react-bottom-sheet/guide/scrolling) |
| Drag locks, velocity, dismissal | [Gestures](https://mhmd-sdghn.github.io/react-bottom-sheet/guide/gestures) |
| Data attributes and CSS variables | [Styling](https://mhmd-sdghn.github.io/react-bottom-sheet/guide/styling) |
| Focus, `inert`, Escape, reduced motion | [Accessibility](https://mhmd-sdghn.github.io/react-bottom-sheet/guide/accessibility) |
| Next.js, `renderToString` | [SSR & Next.js](https://mhmd-sdghn.github.io/react-bottom-sheet/guide/ssr-nextjs) |
| Every prop and method | [React API](https://mhmd-sdghn.github.io/react-bottom-sheet/reference/react) · [Core API](https://mhmd-sdghn.github.io/react-bottom-sheet/reference/core) |

Coming from 0.x? The API is different in almost every name —
[the migration guide](https://mhmd-sdghn.github.io/react-bottom-sheet/guide/migration)
has a full before/after table.

## License

MIT © Mo Sadeghian
