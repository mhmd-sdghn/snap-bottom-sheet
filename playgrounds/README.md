# snap-bottom-sheet playgrounds

Three small apps for developing and manually testing the library. They depend on
`snap-bottom-sheet` via `workspace:*` and import its **built `dist/`** through
the package's `exports` map — never `src/` and never a relative path into
`packages/`. That is deliberate: the playgrounds exercise exactly what a
consumer installs from npm.

| Playground | Entry point used | What it covers |
| --- | --- | --- |
| [`vanilla`](./vanilla) | `snap-bottom-sheet` | The framework-agnostic core: `createSheet` against hand-written DOM, no framework at all. |
| [`react`](./react) | `snap-bottom-sheet/react` | The compound React API — seven scenarios as tabs. |
| [`next`](./next) | `snap-bottom-sheet/react` | Next.js 15 app router. `next build` is the SSR/RSC smoke test. |

## Running

**Build the library first** — the playgrounds resolve `dist/`, so a stale or
missing build shows up as missing exports.

```bash
pnpm install
pnpm build                              # packages/sheet -> dist/
pnpm --filter playground-vanilla dev
pnpm --filter playground-react dev
pnpm --filter playground-next dev
```

While changing library source, keep `pnpm dev` (`tsdown --watch`) running in a
second terminal; Vite and Next both pick up the rebuilt `dist/`.

CI runs `build` for all three after `pnpm verify:pkg`, so a playground that
stops compiling fails the pipeline.

## Manual QA checklist

Each scenario renders its own "what to try" line, so the app is the checklist.
Worth exercising on a real touch device as well as a desktop browser:

- **vanilla** — content mode; `["header", 0.5, 1]` with a scrollable list;
  `steps(3)`; `drag: { down: false }` on the lowest snap; non-modal;
  controlled `snapTo`; destroy/recreate.
- **react** — login sheet (content mode with inputs); map-style peek sheet;
  content growing and shrinking while open; nested sheets; controlled
  open + snap index; reduced motion; custom Portal container.
- **next** — the page is a server component and the sheet is a client island;
  `next build` proves the `"use client"` boundary and the SSR-safe Portal.

## The styling contract

The library ships no CSS. It owns layout on the panel and exposes hooks; the
playgrounds' stylesheets are the reference for what a consumer has to write.

The controller writes, and you should not fight: `position`, `top/left/right`,
`height`, `display: flex`, `flex-direction`, `box-sizing`, `touch-action`,
`overscroll-behavior`, `transform`, `padding-bottom` on the panel, plus
`overflow`/`flex` on `Sheet.Body` per snap.

It gives you: `data-state="open" | "closed"` (panel and overlay),
`data-snap-index`, `data-dragging`, `data-content-mode`, and the custom
properties `--snap-sheet-y`, `--snap-sheet-progress`, `--snap-sheet-offset`.

The overlay gets `position` and `inset: 0` from the library, and the measured
inner wrapper gets the `flex`/`max-height` that keep a `"content"` snap honest.
Background, colour, `z-index` and `pointer-events` are yours —
`opacity: var(--snap-sheet-progress)` is the idiomatic overlay fade.
