# SSR & Next.js

The sheet renders on the server without touching `window`, and without a hydration mismatch. You do not need a dynamic import.

## What the library guarantees

1. **No `window` or `document` at module scope.** It is safe to import
   `snap-bottom-sheet` or `snap-bottom-sheet/react` in a Node process. Every
   browser API sits behind a function that the controller calls after mount.
2. **No browser API during render.** The React parts render plain elements. All
   measurement happens in the controller, which attaches in a layout effect.
   That covers the view height, `"header"` and `"content"`.
3. **`Sheet.Portal` renders `null` on the server and on the first client
   render.** Both sides produce the same empty output, so hydration matches.
   The real subtree appears in the effect that follows.
4. **Server output carries no state.** The controller writes `data-state`,
   `data-snap-index`, `data-dragging`, `--snap-sheet-y` and the `role` and
   `aria-*` attributes to live DOM nodes. There is no state to serialise, so
   the server and the client cannot disagree.
5. **`renderToString` works.** Rendering a `<Sheet>` tree to a string gives you
   the markup outside the portal and an empty portal. Nothing throws and
   nothing warns.

## The `"use client"` banner

The React entry, `snap-bottom-sheet/react`, is published with a `"use client"`
banner. The core entry is not. In the Next.js App Router this makes the module
a client module, so any component that imports it has to be a client component
too. That is the usual React rule, not something the library adds.

::: info You do not need `dynamic(..., { ssr: false })`
People reach for `next/dynamic` with `ssr: false` because most sheet and modal
libraries do one of two things. They read `window.innerHeight` or call
`document.createElement` while rendering, which throws on the server. Or they
portal into `document.body` on the first render, which causes a hydration
mismatch. Neither happens here. The portal returns `null` until it is mounted,
as guarantee 3 explains, so the server and the first client render agree.
Turning SSR off only costs you a render pass and a flash of missing markup
around the sheet's trigger.
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

Server data comes in as props, as it does for any other client component. The
sheet's content can be server-rendered too. Pass it as `children` of the client
component, and it appears inside `Sheet.Body` once the portal mounts.

## Pages Router

Nothing special is needed here: no `"use client"`, no `dynamic`, and no
`useEffect` guard.

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

`getServerSideProps` and `getStaticProps` need no changes. The sheet itself is
not part of the server-rendered HTML. Only the markup around it is.

## Other server renderers

The same guarantees hold anywhere `react-dom/server` runs, including Remix,
Astro islands, `renderToPipeableStream` and `renderToString` in a test. If you
render to a string and compare it with the client's first pass, the portal adds
nothing on either side.

::: warning Let the sheet measure, don't measure yourself
The one sure way to break SSR here is to read layout in your own render:

```tsx
// ✗ throws on the server, and mismatches on hydration when it doesn't
<Sheet snapPoints={[window.innerHeight * 0.5]}>
```

Use a fraction or a measured value instead, and let the controller resolve it
after mount:

```tsx
// ✓ 0.5 = half the view height, resolved in the browser
<Sheet snapPoints={[0.5]}>
```

The same applies to `"header"` and `"content"`. They are measured with a
`ResizeObserver` in the browser, so they cost nothing on the server. If you need
the current position, use `useSheetState()` rather than working it out yourself.
It runs on the client only and reads the live controller.
:::

## Where next

- [Core Concepts](/guide/core-concepts) — why no state reaches the server markup.
- [Snap Points](/guide/snap-points) — fractions, percentages, and measured values.
- [React API](/reference/react) — the full surface, including `useSheetState`.
