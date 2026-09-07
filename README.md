<h1 align="center">Snap Bottom Sheet</h1>

<p align="center">
  A draggable, snappable bottom sheet for the web — framework-agnostic core, thin React bindings, zero runtime dependencies.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/snap-bottom-sheet"><img alt="npm" src="https://img.shields.io/npm/v/snap-bottom-sheet.svg"></a>
  <a href="https://github.com/mhmd-sdghn/react-bottom-sheet/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/mhmd-sdghn/react-bottom-sheet/actions/workflows/ci.yml/badge.svg"></a>
  <a href="./LICENSE"><img alt="MIT" src="https://img.shields.io/npm/l/snap-bottom-sheet.svg"></a>
</p>

<p align="center">
  <a href="https://mhmd-sdghn.github.io/react-bottom-sheet/"><b>Documentation</b></a> ·
  <a href="https://mhmd-sdghn.github.io/react-bottom-sheet/demos/">Demos</a> ·
  <a href="https://mhmd-sdghn.github.io/react-bottom-sheet/guide/migration">Migrating from 0.x</a>
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

- **Snap points that mean what you wrote.** Fractions, percentages, pixels, or
  the measured height of your header or content. Indices refer to *your* array
  order, never a sorted rewrite of it.
- **Measured, not guessed.** `"header"` and `"content"` are live-measured with a
  shared `ResizeObserver`; when the active snap's height changes the sheet
  springs to the new position instead of jumping.
- **Per-snap scroll and drag rules.** `{ value: 1, scroll: true }` makes the body
  scroll at that snap and hands the gesture back to the sheet when you pull down
  at the top. `drag: { up: false }` pins a direction.
- **Zero runtime dependencies.** Its own spring integrator and its own Pointer
  Events recogniser — about 13 kB gzipped for the core, 17 kB with the React
  bindings. `react` and `react-dom` are optional peers; the core entry needs
  neither.
- **Dialog semantics included.** `role="dialog"`, labelled by your title, focus
  moved in and restored on close, siblings `inert` while modal, Escape to the
  innermost sheet, `prefers-reduced-motion` honoured.
- **SSR-safe on purpose.** No `window` or `document` at module scope or during
  render; the portal renders `null` until mounted. App Router, Pages Router and
  `renderToString` all work without a dynamic import.

No stylesheet ships. You get `data-state`, `data-snap-index`, `data-dragging`
and CSS custom properties for position and progress — see
[Styling](https://mhmd-sdghn.github.io/react-bottom-sheet/guide/styling).

## Repository layout

| Path | What |
| --- | --- |
| [`packages/sheet`](./packages/sheet) | `snap-bottom-sheet` — the published package (`.` core, `./react` bindings) |
| `packages/spring` | `@snap-bottom-sheet/spring` — private scalar spring, bundled in |
| `packages/gesture` | `@snap-bottom-sheet/gesture` — private pointer drag recogniser, bundled in |
| `docs` | the VitePress site |
| [`playgrounds`](./playgrounds) | React, vanilla and Next.js apps for manual testing |

## Contributing

Node 22+ and pnpm. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT © Mo Sadeghian
