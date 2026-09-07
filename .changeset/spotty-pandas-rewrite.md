---
"snap-bottom-sheet": major
---

1.0 — a rewrite. The sheet is now a framework-agnostic engine with thin React
bindings on top, its own spring and gesture code instead of two dependencies,
and an API where the names mean what they say.

**Migrating:** the [migration guide](https://mhmd-sdghn.github.io/react-bottom-sheet/guide/migration)
has a full before/after table. Nearly every name changed, so expect to edit
every call site — but the new API is smaller than the one it replaces.

### Two entry points

`snap-bottom-sheet` is now the framework-agnostic core: `createSheet(elements,
options)` attaches the engine to elements you already rendered, and needs no
framework at all. `snap-bottom-sheet/react` has `Sheet` and its parts. `react`
and `react-dom` (18 or 19) are optional peers.

### Removed

| 0.x | 1.0 |
| --- | --- |
| `isOpen`, `onClose` | `open` / `defaultOpen` / `onOpenChange` |
| `activeSnapPointIndex`, `onSnap` | `activeSnapIndex` / `defaultSnapIndex` / `onSnapIndexChange` |
| `onSnap(-1, null)` on close | `onOpenChange(false)` |
| `Sheet.Container` | `Sheet.Portal` + `Sheet.Content` |
| `Sheet.DynamicHeight`, `SnapPointDynamicValue` | the `"content"` snap value, usable anywhere in the array |
| `wrapper`, `wrapperPortalElement`, `wrapperStyle`, `wrapperClassName` | `Sheet.Portal container` |
| `overlayColor`, `overlayStyle`, `overlayClassName`, `onOverlayClick` | `Sheet.Overlay` and your own CSS |
| `noInitialAnimation` | `skipInitialAnimation` |
| `useSnapState` | `activeSnapIndex` directly, or `useSheetState()` |
| UMD and CJS builds | ESM only |
| `./*` subpath exports | `.` and `./react` |

Also new: `Sheet.Handle`, `Sheet.Header`, `Sheet.Body`, `Sheet.Title`,
`Sheet.Description`, `Sheet.Close`, a `SheetHandle` ref (`open`, `close`,
`snapTo`, `activeSnapIndex`, `y`), `useSheetState()`, and `steps()`.

### Fixed

Bugs in 0.x that the rewrite removes, each with a regression test:

- **Snap indices no longer disagree with your array.** 0.x sorted snap values
  descending but left `snapPoints` unsorted, so an index meant one thing to the
  library and another to you. Indices are now always your array order.
- **Dynamic-height snaps land in the right place.** The dynamic snap resolved to
  "fully closed" in the drag-end path, so releasing near it closed the sheet or
  jumped to the wrong snap.
- **Drag release is no longer clamped by a broken expression.** The old clamp
  read `y.get() + _y > 0 ? _y : 0`, which is a comparison, not a clamp.
- **Nested sheets work.** Every sheet had an overlay with the same DOM id, so an
  outer sheet could resolve — and restyle — an inner sheet's overlay. Each sheet
  now owns its elements, the scroll lock is reference-counted, and Escape goes
  to the innermost open sheet.
- **The scroll lock restores your page.** 0.x set `overflow: hidden` on
  `documentElement` and `body` without saving what was there, and never put it
  back. It now saves and restores, compensates for the scrollbar gap, and is
  reference-counted.
- **The advertised types exist.** `SnapPoint`, `SnapPointConfig`, `SnapValue`,
  `SheetController`, `SheetElements`, `SheetOptions`, `SheetState` and
  `SheetHandle` are all exported.
- **Scrollable content is reachable at partial snaps.** The panel was the
  scroller, so at a 50% snap the last pixels of content sat below the viewport
  and no amount of scrolling reached them. `Sheet.Body` is now the scroll
  region, sized to the visible strip at rest.
- **Focus goes back where it came from.** A reopen during the close animation
  overwrote the saved focus target with a node inside the sheet, so closing left
  focus in a hidden dialog and the scroll lock never released.
- **A fling no longer defeats a drag lock.** With `drag: { down: false }` the
  panel correctly refused to move, but a fast downward flick still projected
  past the lowest snap and dismissed the sheet.

### Also

- Zero runtime dependencies: `@react-spring/web` and `@use-gesture/react` are
  gone, replaced by a scalar spring and a Pointer Events recogniser written for
  this library. About 13 kB gzipped for the core, 17 kB with the React bindings.
- SSR is a requirement, not a hope: nothing touches `window` or `document` at
  module scope or during render, the portal renders `null` until mounted, and
  Next.js App Router, Pages Router and `renderToString` are covered by tests.
- Dialog semantics: `role="dialog"`, `aria-labelledby` from `Sheet.Title`,
  focus moved in and restored, siblings `inert` while modal, Escape to close,
  `prefers-reduced-motion` honoured.
- Styling is CSS, not props: `data-state`, `data-snap-index`, `data-dragging`,
  `data-content-mode`, and the `--snap-sheet-y` / `-progress` / `-offset` custom
  properties. No stylesheet ships.
