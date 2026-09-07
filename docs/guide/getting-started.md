<script setup>
import basicDemo from "../.vitepress/theme/demos/basic.tsx";
</script>

# Getting Started

Install the package, render the parts, and hand them to the engine — in React or in plain JavaScript.

<ClientOnly>
  <ReactDemo :mount="basicDemo" />
</ClientOnly>

## Two entry points

| Import | What it is |
| --- | --- |
| `snap-bottom-sheet` | The framework-agnostic core: `createSheet`, `steps`, and the types. No dependencies, no peers. |
| `snap-bottom-sheet/react` | The React bindings: `Sheet` and its parts, `useSheetState`. Built on the same core. |

There is no default export and no deeper subpath than these two.

## 1. Install

::: code-group

```sh [npm]
npm install snap-bottom-sheet
```

```sh [pnpm]
pnpm add snap-bottom-sheet
```

```sh [yarn]
yarn add snap-bottom-sheet
```

:::

`react` and `react-dom` (`^18 || ^19`) are declared as **optional** peer
dependencies — your package manager will not nag you for them. The core entry
has no peers at all, so a vanilla project installs nothing else. The package is
ESM only.

## 2. A sheet in React

Everything state-dependent is written by the controller, so the React side is
just the part tree plus your own state.

```tsx
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";
import "./sheet.css";

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
        snapPoints={["header", 0.5, 0.95]}
        defaultSnapIndex={1}
      >
        <Sheet.Portal>
          <Sheet.Overlay className="sheet-overlay" />
          <Sheet.Content className="sheet">
            <Sheet.Handle className="sheet-handle" />
            <Sheet.Header className="sheet-header">
              <Sheet.Title>Ride options</Sheet.Title>
              <Sheet.Description>Drag the sheet to see more.</Sheet.Description>
            </Sheet.Header>
            <Sheet.Body className="sheet-body">
              <p>Standard · 4 min away</p>
              <p>XL · 7 min away</p>
              <Sheet.Close>Cancel</Sheet.Close>
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}
```

No stylesheet ships with the package, so without CSS the sheet is invisible.
This is the minimum that makes it look like a sheet:

```css
/* sheet.css */
/* The controller positions the overlay itself — colour is yours. */
.sheet-overlay {
  background: rgb(0 0 0 / 0.4);
}

.sheet {
  /* the library owns position, height and transform — don't set those */
  background: white;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 24px rgb(0 0 0 / 0.15);
}

.sheet-handle {
  align-self: center;
  width: 40px;
  height: 4px;
  margin: 8px 0;
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

::: tip
The controller positions the overlay for you — at attach it writes
`position: fixed` (or `absolute` when `Sheet.Portal` has a `container`) and
`inset: 0` on it, so your rule only needs the colour. It also fades on its own:
the controller writes `--snap-sheet-progress` (`0` closed → `1` at the topmost
snap) onto the overlay element and its default opacity reads that variable. See
[Styling](/guide/styling) for every hook.
:::

## 3. The same sheet in vanilla JS

`createSheet` attaches the engine to elements you already rendered. Write the
markup yourself, then hand the nodes over.

```html
<div id="overlay" class="sheet-overlay"></div>
<div id="sheet" class="sheet">
  <div data-snap-sheet-inner>
    <button id="handle" class="sheet-handle" type="button"></button>
    <div id="header" class="sheet-header"><h2 id="title">Ride options</h2></div>
    <div id="body" class="sheet-body"><p>Standard · 4 min away</p></div>
  </div>
</div>
<button id="choose" type="button">Choose a ride</button>
```

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
    snapPoints: ["header", 0.5, 0.95],
    defaultSnapIndex: 1,
    labelledBy: "title",
  },
);

el("choose").addEventListener("click", () => void sheet.open());
```

The controller starts **closed**, so nothing is visible until you call `open()`.
The `data-snap-sheet-inner` wrapper is what `"content"` measures — the full
contract is in [Vanilla JS](/guide/vanilla).

## Next steps

- [Core Concepts](/guide/core-concepts) — the y-offset model, snap indices, content mode, modal versus non-modal.
- [Snap Points](/guide/snap-points) — every value form, `steps()`, and the per-snap `scroll` and `drag` options.
- [React API](/reference/react) — the full prop surface for `Sheet` and every part.
