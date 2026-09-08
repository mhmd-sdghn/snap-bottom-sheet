---
"snap-bottom-sheet": major
---

1.0 is a rewrite. The sheet is now an engine that works with any framework, with
thin React bindings on top. It carries its own spring and gesture code in place
of two dependencies, and the names in the API say what they do.

**Migrating:** the [migration guide](https://mhmd-sdghn.github.io/snap-bottom-sheet/guide/migration)
has a full before and after table. Nearly every name has changed, so please
expect to edit every call site. The new API is smaller than the one it replaces.

### Two entry points

`snap-bottom-sheet` is now the core, and it works with any framework.
`createSheet(elements, options)` attaches the engine to elements you have
already rendered, and needs no framework at all. `snap-bottom-sheet/react` has
`Sheet` and its parts. `react` and `react-dom` (18 or 19) are optional peers.

### Removed

| 0.x | 1.0 |
| --- | --- |
| `isOpen`, `onClose` | `open` / `defaultOpen` / `onOpenChange` |
| `activeSnapPointIndex`, `onSnap` | `activeSnapIndex` / `defaultSnapIndex` / `onSnapIndexChange` |
| `onSnap(-1, null)` on close | `onOpenChange(false)` |
| `Sheet.Container` | `Sheet.Portal` + `Sheet.Content` |
| `Sheet.DynamicHeight`, `SnapPointDynamicValue` | the `"content"` snap value, which you may use anywhere in the array |
| `wrapper`, `wrapperPortalElement`, `wrapperStyle`, `wrapperClassName` | `Sheet.Portal container` |
| `overlayColor`, `overlayStyle`, `overlayClassName`, `onOverlayClick` | `Sheet.Overlay` and your own CSS |
| `noInitialAnimation` | `skipInitialAnimation` |
| `useSnapState` | `activeSnapIndex` directly, or `useSheetState()` |
| UMD and CJS builds | ESM only |
| `./*` subpath exports | `.` and `./react` |

Also new: `Sheet.Handle`, `Sheet.Header`, `Sheet.Body`, `Sheet.Title`,
`Sheet.Description`, `Sheet.Close`, a `SheetHandle` ref (`open`, `close`,
`snapTo`, `activeSnapIndex`, `y`), `useSheetState()`, and `steps()`.

- **Dragging and scrolling are one gesture now.** Drag up with your finger
  inside `Sheet.Body` and the sheet rises to the first snap you marked
  `scroll: true`, where the same movement carries on as scrolling. Scroll back
  to the top of the list and the same movement drags the sheet down again. You
  never have to lift your finger, neither handoff jumps, and letting go while
  the content is moving leaves it coasting to a stop. `Sheet.Content` carries a
  new `data-scrolling` attribute for the scrolling half of a gesture.

### Fixed

These are the 0.x bugs that the rewrite removes. Each one has a regression test.

- **Snap indices no longer disagree with your array.** 0.x sorted the snap
  values in descending order but left `snapPoints` unsorted. An index therefore
  meant one thing to the library and another to you. Indices now always follow
  your array order.
- **Dynamic-height snaps land in the right place.** In the drag-end path, the
  dynamic snap resolved to "fully closed". Releasing near it closed the sheet,
  or jumped to the wrong snap.
- **Drag release is no longer clamped by a broken expression.** The old clamp
  read `y.get() + _y > 0 ? _y : 0`, which is a comparison rather than a clamp.
- **Nested sheets work.** Every sheet had an overlay with the same DOM id, so an
  outer sheet could find an inner sheet's overlay and restyle it. Each sheet now
  owns its own elements, the scroll lock counts its references, and Escape goes
  to the innermost open sheet.
- **The scroll lock restores your page.** 0.x set `overflow: hidden` on
  `documentElement` and `body` without saving what was there. On cleanup it
  reset both to the empty string, which destroys any inline value your page had
  set. The lock now saves the previous values and puts them back. It also
  compensates for the scrollbar gap and counts its references, so closing an
  inner sheet does not unlock the page.
- **The advertised types exist.** `SnapPoint`, `SnapPointConfig`, `SnapValue`,
  `SheetController`, `SheetElements`, `SheetOptions`, `SheetState` and
  `SheetHandle` are all exported.
- **Scrollable content is reachable at partial snaps.** The panel was the
  scroller, so at a 50% snap the last pixels of content sat below the viewport,
  and no amount of scrolling reached them. `Sheet.Body` is now the scroll
  region, sized at rest to the strip you can see.
- **Focus goes back where it came from.** Reopening during the close animation
  overwrote the saved focus target with a node inside the sheet. Closing then
  left focus in a hidden dialog, and the scroll lock never released.
- **A fling no longer defeats a drag lock.** With `drag: { down: false }` the
  panel correctly refused to move. Even so, a fast downward flick still
  projected past the lowest snap and dismissed the sheet.

### Also

- Zero runtime dependencies. `@react-spring/web` and `@use-gesture/react` are
  gone. In their place are a scalar spring and a Pointer Events recogniser
  written for this library. That comes to about 13 kB gzipped for the core, and
  17 kB with the React bindings.
- Server-side rendering (SSR) is a requirement, not a hope. Nothing touches
  `window` or `document` at module scope or during render, and the portal
  renders `null` until it is mounted. CI checks this with a `next build` of an
  App Router playground, and with a `renderToString` test in a `node`
  environment. The Pages Router should work by the same mechanism, but no test
  exercises it.
- Dialog semantics: `role="dialog"`, `aria-labelledby` from `Sheet.Title`,
  focus moved in and restored, siblings `inert` while modal, Escape to close,
  `prefers-reduced-motion` honoured.
- Styling is CSS rather than props: `data-state`, `data-snap-index`,
  `data-dragging`, `data-content-mode`, and the `--snap-sheet-y` / `-progress` /
  `-offset` custom properties. No stylesheet ships.

### Escape and the modal lock

- **A modal sheet always takes the Escape key, even when it cannot be
  dismissed.** With `dismissible: false` the sheet stays open and nothing else
  happens. Escape does not pass through to a sheet behind it. Otherwise the
  wrong sheet would close: the one the reader is not looking at.
- **A custom `container` scopes the modal lock to that container.** When
  `Sheet.Portal` has a `container` (or you pass `elements.container` to
  `createSheet`), a modal sheet locks that element's scrolling and marks only
  its children `inert`. The rest of the page keeps scrolling and stays
  interactive. With the default `document.body`, the whole page is locked as you
  would expect.
