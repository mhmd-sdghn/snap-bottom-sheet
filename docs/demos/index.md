# Demos

Every demo runs the real published build inside a fixed frame, so a sheet
cannot take over the page you are reading. The code under each demo is the demo
itself. Each snippet is taken from the file that is running.

| Demo | Shows |
| --- | --- |
| [Basic](/demos/basic) | Open and close, content mode, drag to dismiss |
| [Snap points](/demos/snap-points) | Three snaps, `defaultSnapIndex`, live `useSheetState()` |
| [Dynamic height](/demos/dynamic-height) | `"header"` and `"content"`, re-measured while open |
| [Scrollable](/demos/scrollable) | `{ value: 1, scroll: true }`, and one touch that drags then scrolls |
| [Nested](/demos/nested) | A sheet opened from inside a sheet |
| [Controlled](/demos/controlled) | External buttons and the `SheetHandle` ref |
| [Vanilla](/demos/vanilla) | `createSheet` against hand-written markup, no React |

For sheets that take over the whole viewport, as they would in a real app,
please see the <a href="/snap-bottom-sheet/playground/">playground</a>.

::: info These demos live in a frame
Each demo renders into its own frame instead of `document.body`. The frame is
passed to `Sheet.Portal` as its `container`.

Every demo is modal, which is the default. A modal sheet with a `container`
locks that container instead of the whole document. It also marks only that
container's children `inert`. That is why the page you are reading keeps
scrolling, and why several modal demos can sit on one page and all stay usable.
See [Accessibility](/guide/accessibility).
:::
