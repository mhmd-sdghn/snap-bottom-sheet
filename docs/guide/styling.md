# Styling

The library ships no stylesheet. The engine writes the positioning and the transform that it has to own. Everything else is your CSS: the background, the radius, the shadow and the handle pill.

## What the library writes

The controller sets these base layout styles inline on the Content panel **once**, when it attaches:

| Declaration | Why |
|---|---|
| `position: fixed` (`absolute` when the portal `container` is not `document.body`) | the panel is pinned to the viewport, or to the container |
| `top: 0; left: 0; right: 0` | full width, anchored to the top, so the transform does the vertical work |
| `height: 100dvh` (fallback `100vh`) | see [Layout](#why-the-panel-is-full-height) |
| `display: flex; flex-direction: column` | `Sheet.Header` stays put and `Sheet.Body` takes the rest |
| `box-sizing: border-box` | the `padding-bottom` written at rest must not grow the panel |
| `touch-action: none` | the drag recogniser needs the pointer stream |
| `overscroll-behavior: none` | the page behind the sheet must not rubber-band |

They are written once, at attach, so **any inline style you set afterwards wins**. That includes a `style` prop on `Sheet.Content`, which React re-applies on every render. Overriding `position` or `height` will break the position model, but `background`, `border-radius`, `max-width` and the like are all yours.

On every frame the controller then writes `transform`, `--snap-sheet-y` and `--snap-sheet-progress`. It sets `will-change: transform` only while the sheet is dragging or animating. At rest it writes `padding-bottom`, `--snap-sheet-offset` and the `data-*` attributes. It also changes `Sheet.Body`'s `flex` and `overflow-y` as the active snap's `scroll` option changes. See [Scrolling](/guide/scrolling).

On the **Overlay** it writes two declarations, again once at attach: `inset: 0`, and `position: fixed`, which becomes `absolute` when `Sheet.Portal` has a `container`. Your overlay rule therefore needs no positioning of its own, so please leave `position` and `inset` out of it. The colour, `pointer-events` and `z-index` are entirely yours.

::: info The library never writes a `z-index`
It writes none on the panel, none on the overlay, none on the portal wrapper, and none on any other element. Stacking is entirely your CSS, and nothing the controller does will quietly outrank a value you set. It also means that a sheet without a `z-index` stacks purely by DOM order, which is why [nested sheets](/guide/nested-sheets) need an explicit one for each level.
:::

## Data attributes

The controller writes these straight to the DOM, so your CSS can use them without a React render. The server output carries none of them.

| Attribute | Element | Value |
|---|---|---|
| `data-state` | Overlay, Content | `"open"` or `"closed"` |
| `data-snap-index` | Content | the active index, in **your** array order |
| `data-dragging` | Content | present while a drag is in progress |
| `data-content-mode` | Content | present when the sheet is in content mode |

`data-dragging` and `data-content-mode` are **presence** attributes. The controller adds them as empty attributes and removes them again. It never writes them as `"false"`. So match on presence, with `[data-dragging]`, and not on a value: `[data-dragging="true"]` will not match either. In content mode, `data-snap-index` is `"0"`, because the snap the sheet creates for itself is still an index.

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
| `--snap-sheet-progress` | `0` closed → `1` at the **topmost declared snap** | Content and Overlay, every frame |
| `--snap-sheet-offset` | px of the panel hanging below the viewport **at rest** | Content, at rest |

`--snap-sheet-progress` is written on the Overlay element itself, not on a shared ancestor and not on the document root. The controller only touches the elements you hand it. This is what lets the overlay fade even when it shares no parent with the panel.

`1` means the **topmost snap you declared**, not the full view height. With `snapPoints={[0.3, 0.6]}` the sheet reaches `1` at `0.6`. Progress is `0` when the sheet is closed, `0.5` at the `0.3` snap, which is half the way to the top snap, and `1` at `0.6`, even though 40% of the view is still uncovered. This makes the value safe to calculate with, because the top of its range is always a position the sheet can rest at.

::: warning `--snap-sheet-offset` is a rest value
It is written when the spring comes to rest, and it is deliberately **left stale during a drag**. The controller corrects it at the next rest. Use it for layout that only matters at rest, such as bottom padding or a sticky footer inset. For anything that has to follow the finger, use `--snap-sheet-y` or `--snap-sheet-progress`.
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
  /* No position or inset — the controller writes both at attach. */
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

The overlay has no opacity of its own, so read the progress value. The positioning is already done for you, so the rule needs only two declarations:

```css
.overlay {
  background: rgb(0 0 0 / 0.4);
  opacity: var(--snap-sheet-progress);
}
```

If you want the dimming to reach its full strength before the topmost snap, scale the value and clamp it. With `opacity: min(1, calc(var(--snap-sheet-progress) * 2))` the overlay is fully dim halfway up the range.

::: info The overlay only appears in a modal sheet
When `modal` is `false`, the controller writes `display: none` on the overlay element, so none of these rules show. This is deliberate. A non-modal sheet is a panel rather than a dialog, and an invisible overlay across the whole view would swallow every click outside the sheet.

You still render `Sheet.Overlay` as usual. The controller hides and shows it as `modal` changes, and puts your original inline `display` back when the sheet becomes modal again or the overlay goes away. See the [Overlay reference](/reference/react#sheet-overlay).
:::

## Safe areas

The panel covers the full view height, so a notch or a home indicator sits over it. Add padding with `env()`:

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
`env(safe-area-inset-*)` reports a value above zero only when the document opts in with `<meta name="viewport" content="viewport-fit=cover">`. Please always pass the fallback, `, 0px`, so the declaration still parses everywhere else.
:::

## Why the panel is full-height

The panel is always `100dvh` tall and is moved with `translate3d`, so no gap can appear above it while you drag up. To let `Sheet.Body` scroll to its true end, the controller adds a `padding-bottom` equal to the rest offset, which is the same number as `--snap-sheet-offset`. That is why the panel is `box-sizing: border-box`, and why you should not replace its `height` or its `padding-bottom`.

## Next

- [Snap Points](/guide/snap-points) — what `data-snap-index` is indexing.
- [Styling Hooks](/reference/styling-hooks) — the attributes and properties on one page.
