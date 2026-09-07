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

::: info These demos live in a frame
They portal into their own frame rather than `document.body`, which is what
makes them safe to embed: with a `container`, a modal sheet locks *that*
container instead of the document, so the page you are reading keeps scrolling.
[Basic](/demos/basic) runs modal to show it. The rest stay non-modal to keep
several demos usable on one page. See [Accessibility](/guide/accessibility).
:::
