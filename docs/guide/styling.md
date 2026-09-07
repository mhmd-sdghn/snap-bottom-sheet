# Styling

No stylesheet ships with the library. The engine writes the positioning and the transform it must own, and everything else — background, radius, shadow, the handle pill — is your CSS.

## What the library writes

The controller sets these base layout styles inline on the Content panel **once**, at attach:

| Declaration | Why |
|---|---|
| `position: fixed` (`absolute` when the portal `container` is not `document.body`) | the panel is pinned to the viewport, or to the container |
| `top: 0; left: 0; right: 0` | full-width, anchored to the top so the transform does the vertical work |
| `height: 100dvh` (fallback `100vh`) | see [Layout](#why-the-panel-is-full-height) |
| `display: flex; flex-direction: column` | `Sheet.Header` stays put, `Sheet.Body` takes the rest |
| `box-sizing: border-box` | the rest-time `padding-bottom` must not grow the panel |
| `touch-action: none` | the drag recogniser needs the pointer stream |
| `overscroll-behavior: none` | no page rubber-banding behind the sheet |

Because they are written once, at attach, **inline styles you set afterwards win** — including a `style` prop on `Sheet.Content` that React re-applies on render. Overriding `position` or `height` will break the position model, but `background`, `border-radius`, `max-width` and friends are all yours.

Per frame the controller then writes `transform`, `--snap-sheet-y` and `--snap-sheet-progress`; `will-change: transform` is set only while dragging or animating. At rest it writes `padding-bottom` / `--snap-sheet-offset` and the `data-*` attributes. `Sheet.Body`'s `flex` and `overflow-y` are also toggled by the controller as the active snap's `scroll` option changes — see [Scrolling](/guide/scrolling).

## Data attributes

The controller writes these straight to the DOM, so they are available to CSS without a React render. Server output carries none of them.

| Attribute | Element | Value |
|---|---|---|
| `data-state` | Overlay, Content | `"open"` or `"closed"` |
| `data-snap-index` | Content | the active index, in **your** array order |
| `data-dragging` | Content | present while a drag is in progress |
| `data-content-mode` | Content | present when the sheet is in content mode |

```css
/* A heavier shadow once the sheet is at its topmost snap. */
.sheet[data-snap-index="2"] {
  box-shadow: 0 -12px 40px rgb(0 0 0 / 0.28);
}

/* Kill the hover affordance mid-drag. */
.sheet[data-dragging] .row:hover {
  background: none;
}

/* Content mode hugs its content, so no top radius clipping needed. */
.sheet[data-content-mode] {
  max-height: 100%;
}
```

## CSS custom properties

| Property | Meaning | Written on |
|---|---|---|
| `--snap-sheet-y` | px offset of the panel from the top of the view; `0` is fully open | Content, every frame |
| `--snap-sheet-progress` | `0` closed → `1` at the topmost snap | Content and Overlay, every frame |
| `--snap-sheet-offset` | px of the panel hanging below the viewport **at rest** | Content, at rest |

`--snap-sheet-progress` is written on the Overlay element itself, not on a shared ancestor or the document root — the controller never touches elements it was not handed. That is what lets the overlay fade without the two elements sharing a parent.

::: warning `--snap-sheet-offset` is a rest value
It is written when the spring comes to rest and is deliberately **stale during a drag** — it is corrected on the next rest. Use it for layout that only matters at rest (bottom padding, a sticky footer inset). Anything that must track the finger should use `--snap-sheet-y` or `--snap-sheet-progress`.
:::

## A starter stylesheet

```css
.sheet {
  background: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -6px 24px rgb(0 0 0 / 0.18);
  /* The panel is full-height; only the top corners are ever visible. */
  overflow: hidden;
}

.handle {
  /* Sheet.Handle is a real <button> — reset it. */
  display: block;
  width: 100%;
  padding: 10px 0;
  border: 0;
  background: none;
  cursor: grab;
}

.handle::before {
  content: "";
  display: block;
  width: 36px;
  height: 4px;
  margin: 0 auto;
  border-radius: 999px;
  background: #d4d4d8;
}

.header {
  padding: 4px 20px 12px;
}

.body {
  padding: 0 20px 20px;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.4);
  opacity: var(--snap-sheet-progress);
}

@media (prefers-color-scheme: dark) {
  .sheet {
    background: #18181b;
  }
  .handle::before {
    background: #52525b;
  }
}
```

## The overlay fade

The overlay has no opacity of its own — read the progress value:

```css
.overlay {
  background: rgb(0 0 0 / 0.4);
  opacity: var(--snap-sheet-progress);
}
```

For a dim that saturates before the topmost snap, scale and clamp it: `opacity: min(1, calc(var(--snap-sheet-progress) * 2))`.

## Safe areas

The panel spans the full view height, so a notch or a home indicator sits over it. Pad with `env()`:

```css
.sheet {
  /* Keep content clear of the status bar when the sheet is fully open. */
  padding-top: env(safe-area-inset-top, 0px);
}

.body {
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  padding-left: calc(20px + env(safe-area-inset-left, 0px));
  padding-right: calc(20px + env(safe-area-inset-right, 0px));
}
```

::: tip
`env(safe-area-inset-*)` only reports non-zero values when the document opts in with `<meta name="viewport" content="viewport-fit=cover">`. Always pass the fallback (`, 0px`) so the declaration still parses elsewhere.
:::

## Why the panel is full-height

The panel is always `100dvh` tall and moved with `translate3d`, so no gap can appear above it while you drag up. To keep `Sheet.Body` scrolling to its true end, the controller adds `padding-bottom` equal to the rest offset — the same number as `--snap-sheet-offset`. Hence `box-sizing: border-box`, and hence: do not replace the panel's `height` or `padding-bottom`.

## Next

- [Snap Points](/guide/snap-points) — what `data-snap-index` is indexing.
- [Styling Hooks](/reference/styling-hooks) — the attribute and property list on one page.
