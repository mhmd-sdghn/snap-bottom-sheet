# Migrating from 0.x

1.0 is a rewrite. The engine moved out of React and into a core that does not depend on a framework. The public API changed wherever that move made it necessary.

## Removals and replacements

| Removed in 0.x | Use in 1.0 |
| --- | --- |
| `isOpen` | `open` (controlled) or `defaultOpen` (uncontrolled) |
| `onClose` | `onOpenChange(open)`. It is called with `false` when the sheet is dismissed |
| `activeSnapPointIndex` | `activeSnapIndex` (controlled) or `defaultSnapIndex` |
| `onSnap` | `onSnapIndexChange(index, snapPoint)` |
| `Sheet.Container` | `Sheet.Portal` + `Sheet.Content`. The portal and the panel are separate parts now |
| `Sheet.DynamicHeight` | The `"content"` snap value, or no `snapPoints` at all, which is content mode |
| `SnapPointDynamicValue` | The string `"content"` |
| `wrapper` | `Sheet.Portal container={el}` |
| `wrapperPortalElement` | `Sheet.Portal container={el}` |
| `wrapperStyle` / `wrapperClassName` | Style the container element you pass to `Sheet.Portal` |
| `overlayColor` | `Sheet.Overlay` plus your own CSS `background` |
| `overlayStyle` / `overlayClassName` | `Sheet.Overlay` takes `style` and `className` like any element |
| `onOverlayClick` | Nothing. The overlay closes the sheet when `dismissible` is set. Use `onOpenChange` to watch for it |
| `noInitialAnimation` | `skipInitialAnimation` |
| `useSnapState` | Removed. Keep your snap points in your own array. `"content"` is a value like any other, so you no longer need to add it in front. `useSheetState()` gives you the live controller state |
| `onSnap(-1, null)` before close | `onOpenChange(false)`. Use `onDragEnd(-1)` if you want the drag-dismissed case on its own |
| UMD and CJS builds | ESM only |
| `snap-bottom-sheet/*` deep imports | `snap-bottom-sheet` (core) and `snap-bottom-sheet/react` (React) |

::: warning Snap indices changed meaning
0.x sorted your snap points internally and gave you indices into that sorted
array. In 1.0, an index always refers to **your** array order. See
[Core Concepts](/guide/core-concepts). If your code corrected for the old
sorting, you can now delete it.
:::

## Before and after

Here is the example from the 0.x README, followed by the same sheet in 1.0.

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

1. **The import path.** The React parts live at `snap-bottom-sheet/react`.
2. **`SnapPointDynamicValue` became `"content"`.** It no longer has to come
   first. `600` became `"600px"`. A bare number above `1` still means pixels,
   but the string form is easier to read next to a fraction.
3. **`Sheet.Container` split into `Sheet.Portal` and `Sheet.Content`.** The
   portal decides where the sheet renders. Its `container` prop defaults to
   `document.body`. `Sheet.Content` is the panel itself.
4. **`Sheet.DynamicHeight` is gone.** The content height is measured from the
   panel directly, so the content you used to wrap is now simply content. Put
   the part that does not scroll in `Sheet.Header`, and the rest in
   `Sheet.Body`.
5. **`Sheet.Overlay` is a part**, not a colour prop. It fades with
   `--snap-sheet-progress`, and it is only shown when `modal` is on, which is
   the default. With `modal: false` the controller hides it with
   `display: none`, so no invisible layer is left over the page to catch
   clicks.
6. **`Sheet.Body` is where scrolling happens.** In 0.x you marked a snap with
   `{ scroll: true }` and the container took care of it. That option still
   exists, but the scroll region is now a part of its own. See
   [Scrolling](/guide/scrolling).

::: tip Styling
0.x shipped class names such as `.snap-bottom-sheet-container` for you to
override. 1.0 ships no CSS beyond the positioning and transform the panel must
own, so the `className`s above are entirely yours. [Styling](/guide/styling)
lists the `data-*` attributes and CSS variables you can hook into.
:::

## What also changed

- **Peer dependencies are gone.** You no longer need `@react-spring/web` or
  `@use-gesture/react`. The package brings its own spring integrator and its
  own Pointer Events drag recogniser. `react` and `react-dom` (`^18 || ^19`)
  are the only peers, both are optional, and the core entry has none.
- **ESM only.** No UMD bundle, no CJS build, no `require()`.
- **Two subpaths, not a wildcard.** Only `.` and `./react`. Deep imports into
  internals were never supported, and they no longer resolve.
- **`onSnap(-1, null)` on close is gone.** Nothing reports the index `-1` as a
  snap any more. Use `onOpenChange(false)` to hear that the sheet closed, or
  `onDragEnd(-1)` to hear that a drag ended in a dismissal.
- **A controlled `open` that refuses a dismissal will bounce.** The controller
  closes first and reports afterwards, so a parent that declines the change
  re-opens the sheet on the next render. To prevent dismissal, pass
  `dismissible: false`. See [Controlled State](/guide/controlled-state).
- **You can use the engine without React.** The behaviour and the options are
  the same. See [Vanilla JS](/guide/vanilla).

## Where next

- [Getting Started](/guide/getting-started) — the 1.0 quickstart.
- [React API](/reference/react) — every prop and part.
- [Snap Points](/guide/snap-points) — the value forms that replaced the 0.x ones.
