# SSR & Next.js

The sheet renders on the server without touching `window`, and without a hydration mismatch — no dynamic import needed.

## What the library guarantees

1. **No `window` or `document` at module scope.** Importing
   `snap-bottom-sheet` or `snap-bottom-sheet/react` in a Node process is safe.
   Every browser API lives behind a function the controller calls after mount.
2. **No browser API during render.** The React parts render plain elements. All
   measurement — view height, `"header"`, `"content"` — happens in the
   controller, which attaches in a layout effect.
3. **`Sheet.Portal` renders `null` on the server and on the first client
   render.** Both sides produce the same empty output, so hydration matches;
   the real subtree appears in the effect that follows.
4. **Server output carries no state.** `data-state`, `data-snap-index`,
   `data-dragging`, `--snap-sheet-y` and the `role`/`aria-*` attributes are all
   written by the controller to live DOM nodes. There is no state to serialise,
   so nothing can disagree between server and client.
5. **`renderToString` works.** Rendering a `<Sheet>` tree to a string returns
   the markup outside the portal and an empty portal — no throw, no warning.

## The `"use client"` banner

The React entry (`snap-bottom-sheet/react`) is published with a `"use client"`
banner; the core entry is not. In the Next.js App Router that means the module
is a client module, so any component that imports it must itself be a client
component — the usual React rule, not something the library adds.

::: info You do not need `dynamic(..., { ssr: false })`
People reach for `next/dynamic` with `ssr: false` because most sheet and modal
libraries read `window.innerHeight` or call `document.createElement` while
rendering, which throws on the server, or portal into `document.body` on the
first render, which produces a hydration mismatch. Neither happens here: the
portal returns `null` until mounted (guarantee 3), so the server and the first
client render agree. Disabling SSR only costs you a render pass and a flash of
missing markup around the sheet's trigger.
:::

## App Router

Put the sheet in a client component and import it from a server component page.

```tsx
// app/ride/ride-sheet.tsx
"use client";

import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

export function RideSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Choose a ride
      </button>

      <Sheet open={open} onOpenChange={setOpen} snapPoints={["header", 0.5]}>
        <Sheet.Portal>
          <Sheet.Overlay className="sheet-overlay" />
          <Sheet.Content className="sheet">
            <Sheet.Handle className="sheet-handle" />
            <Sheet.Header>
              <Sheet.Title>Ride options</Sheet.Title>
            </Sheet.Header>
            <Sheet.Body>{/* … */}</Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}
```

```tsx
// app/ride/page.tsx — stays a server component
import { RideSheet } from "./ride-sheet";

export default async function Page() {
  const rides = await getRides();

  return (
    <main>
      <h1>Rides</h1>
      <RideSheet />
    </main>
  );
}
```

Server data flows in as props like any other client component. The sheet's own
content can be server-rendered too — pass it as `children` of the client
component and it will appear inside `Sheet.Body` once the portal mounts.

## Pages Router

Nothing special: no `"use client"`, no `dynamic`, no `useEffect` guard.

```tsx
// pages/ride.tsx
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

export default function RidePage() {
  const [open, setOpen] = useState(false);

  return (
    <main>
      <button type="button" onClick={() => setOpen(true)}>
        Choose a ride
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <Sheet.Portal>
          <Sheet.Content className="sheet">
            <Sheet.Header>
              <Sheet.Title>Ride options</Sheet.Title>
            </Sheet.Header>
            <Sheet.Body>{/* … */}</Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </main>
  );
}
```

`getServerSideProps` and `getStaticProps` need no changes — the sheet is not
part of the server-rendered HTML, only the markup around it is.

## Other server renderers

The same guarantees hold anywhere `react-dom/server` runs: Remix, Astro islands,
`renderToString` in a test, `renderToPipeableStream`. If you render to a string
and diff it against the client's first pass, the portal contributes nothing on
either side.

::: warning Let the sheet measure, don't measure yourself
The one reliable way to break SSR here is to read layout in your own render:

```tsx
// ✗ throws on the server, and mismatches on hydration when it doesn't
<Sheet snapPoints={[window.innerHeight * 0.5]}>
```

Use a fraction or a measured value and let the controller resolve it after
mount:

```tsx
// ✓ 0.5 = half the view height, resolved in the browser
<Sheet snapPoints={[0.5]}>
```

The same applies to `"header"` and `"content"` — they are measured with a
`ResizeObserver` in the browser, so they cost nothing on the server. Reach for
`useSheetState()` (client-only, it reads the live controller) rather than
computing positions yourself.
:::

## Where next

- [Core Concepts](/guide/core-concepts) — why no state reaches the server markup.
- [Snap Points](/guide/snap-points) — fractions, percentages, and measured values.
- [React API](/reference/react) — the full surface, including `useSheetState`.
