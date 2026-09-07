# Demos

Every demo runs the real published build inside a fixed frame, so a sheet
cannot take over the page you are reading. The code under each one is the demo
itself — the snippet is extracted from the file that is running.

| Demo | Shows |
| --- | --- |
| [Basic](/demos/basic) | Open and close, content mode, drag to dismiss |
| [Snap points](/demos/snap-points) | Three snaps, `defaultSnapIndex`, live `useSheetState()` |
| [Dynamic height](/demos/dynamic-height) | `"header"` and `"content"`, re-measured while open |
| [Scrollable](/demos/scrollable) | `{ value: 1, scroll: true }` and the scroll-vs-drag handover |
| [Nested](/demos/nested) | A sheet opened from inside a sheet |
| [Controlled](/demos/controlled) | External buttons and the `SheetHandle` ref |
| [Vanilla](/demos/vanilla) | `createSheet` against hand-written markup, no React |

::: info These demos are not modal
They run with `modal={false}` so they never lock the page you are reading, and
they portal into their own frame rather than `document.body`. In an app the
default `modal` is what you want — body scroll lock, `inert` behind the sheet,
and Escape to close. See [Accessibility](/guide/accessibility).
:::
