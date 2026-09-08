# Migrating from 0.x

1.0 is a rewrite: the engine moved out of React into a framework-agnostic core, and the public API broke everywhere it had to.

## Removals and replacements

| Removed in 0.x | Use in 1.0 |
| --- | --- |
| `isOpen` | `open` (controlled) or `defaultOpen` (uncontrolled) |
| `onClose` | `onOpenChange(open)` — fires with `false` on dismissal |
| `activeSnapPointIndex` | `activeSnapIndex` (controlled) or `defaultSnapIndex` |
| `onSnap` | `onSnapIndexChange(index, snapPoint)` |
| `Sheet.Container` | `Sheet.Portal` + `Sheet.Content` — the portal decision and the panel are separate parts now |
| `Sheet.DynamicHeight` | The `"content"` snap value, or no `snapPoints` at all (content mode) |
| `SnapPointDynamicValue` | The string `"content"` |
| `wrapper` | `Sheet.Portal container={el}` |
| `wrapperPortalElement` | `Sheet.Portal container={el}` |
| `wrapperStyle` / `wrapperClassName` | Style the container element you pass to `Sheet.Portal` |
| `overlayColor` | `Sheet.Overlay` + your CSS `background` |
| `overlayStyle` / `overlayClassName` | `Sheet.Overlay` takes `style` and `className` like any element |
| `onOverlayClick` | Nothing — the overlay closes the sheet when `dismissible`; use `onOpenChange` to observe it |
| `noInitialAnimation` | `skipInitialAnimation` |
| `useSnapState` | Removed. Keep snap points in your own array; `"content"` is a value like any other, so nothing needs prepending. `useSheetState()` gives you the live controller state |
| `onSnap(-1, null)` before close | `onOpenChange(false)`; `onDragEnd(-1)` if you specifically want the drag-dismissed case |
| UMD and CJS builds | ESM only |
| `snap-bottom-sheet/*` deep imports | `snap-bottom-sheet` (core) and `snap-bottom-sheet/react` (React) |

::: warning Snap indices changed meaning
0.x sorted your snap points internally and handed back indices into the sorted
array. 1.0 indices always refer to **your** array order — see
[Core Concepts](/guide/core-concepts). If you were compensating for the sort,
delete that code.
:::

## Before and after

The 0.x README's example, and the same thing in 1.0.

::: code-group

```tsx [0.x]
import { useState } from "react";
import { Sheet, SnapPointDynamicValue } from "snap-bottom-sheet";

function App() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeSnap, setActiveSnap] = useState(0);

  const snapPoints = [SnapPointDynamicValue, 0.5, 600];

  return (
    <Sheet
      isOpen={isOpen}
      snapPoints={snapPoints}
      activeSnapPointIndex={activeSnap}
      onClose={() => setIsOpen(false)}
      onSnap={(index) => setActiveSnap(index)}
    >
      <Sheet.Container>
        <Sheet.DynamicHeight>
          <div style={{ height: activeSnap === 0 ? 100 : 300 }}>
            Resizable Content
          </div>
        </Sheet.DynamicHeight>

        <div className="content">
          <h2>My Bottom Sheet</h2>
          <p>Scrollable content here...</p>
        </div>
      </Sheet.Container>
    </Sheet>
  );
}
```

```tsx [1.0]
import { useState } from "react";
import { Sheet, type SnapPoint } from "snap-bottom-sheet/react";

const snapPoints: SnapPoint[] = ["content", 0.5, "600px"];

function App() {
  const [open, setOpen] = useState(true);
  const [activeSnap, setActiveSnap] = useState(0);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      snapPoints={snapPoints}
      activeSnapIndex={activeSnap}
      onSnapIndexChange={(index) => setActiveSnap(index)}
    >
      <Sheet.Portal>
        <Sheet.Overlay className="sheet-overlay" />
        <Sheet.Content className="sheet">
          <Sheet.Handle className="sheet-handle" />
          <Sheet.Header className="sheet-header">
            <Sheet.Title>My Bottom Sheet</Sheet.Title>
          </Sheet.Header>
          <Sheet.Body className="sheet-body">
            <div style={{ height: activeSnap === 0 ? 100 : 300 }}>
              Resizable Content
            </div>
            <p>Scrollable content here...</p>
          </Sheet.Body>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet>
  );
}
```

:::

What changed, line by line:

1. **The import path** — React lives at `snap-bottom-sheet/react`.
2. **`SnapPointDynamicValue` → `"content"`**, and it no longer has to come
   first. `600` became `"600px"`; bare numbers above `1` still mean pixels, but
   the explicit string reads better next to a fraction.
3. **`Sheet.Container` split into `Sheet.Portal` + `Sheet.Content`.** The portal
   decides *where* the sheet renders (`container` prop, default
   `document.body`); Content is the panel itself.
4. **`Sheet.DynamicHeight` is gone.** Content height is measured from the panel
   directly, so the content that used to be wrapped is now just content — put
   the non-scrolling part in `Sheet.Header` and the rest in `Sheet.Body`.
5. **`Sheet.Overlay` is a part**, not a colour prop. It fades with
   `--snap-sheet-progress`, and it is only shown when `modal` (the default):
   under `modal: false` the controller hides it with `display: none` rather
   than leave an invisible click-catcher over the page.
6. **`Sheet.Body` is where scrolling happens.** In 0.x you marked a snap
   `{ scroll: true }` and the container handled it; that config still exists,
   but the scroll region is now an explicit part. See
   [Scrolling](/guide/scrolling).

::: tip Styling
0.x shipped class names like `.snap-bottom-sheet-container` to override. 1.0
ships no CSS beyond the positioning and transform the panel must own, so the
`className`s above are entirely yours. [Styling](/guide/styling) lists the
`data-*` attributes and CSS variables to hook into.
:::

## What also changed

- **Peer dependencies dropped.** `@react-spring/web` and `@use-gesture/react`
  are gone — the package brings its own spring integrator and Pointer Events
  drag recogniser. `react` and `react-dom` (`^18 || ^19`) are the only peers,
  both optional, and the core entry has none.
- **ESM only.** No UMD bundle, no CJS build, no `require()`.
- **Two subpaths, not a wildcard.** `.` and `./react`. Deep imports into
  internals were never supported and are now unresolvable.
- **`onSnap(-1, null)` on close is gone.** Nothing reports a phantom index
  `-1` as a snap any more. Use `onOpenChange(false)` for "the sheet closed", or
  `onDragEnd(-1)` for "a drag ended in a dismissal".
- **A controlled `open` that refuses a dismissal bounces.** The controller
  closes itself and *then* reports; a parent that declines re-opens on the next
  render. To veto dismissal, pass `dismissible: false`. See
  [Controlled State](/guide/controlled-state).
- **The engine is usable without React.** Same behaviour, same options —
  see [Vanilla JS](/guide/vanilla).

## Where next

- [Getting Started](/guide/getting-started) — the 1.0 quickstart.
- [React API](/reference/react) — every prop and part.
- [Snap Points](/guide/snap-points) — the value forms that replaced 0.x's.
