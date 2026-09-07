# Styling Hooks

Every data attribute and CSS custom property the controller writes, where it lands, and how often it changes.

No stylesheet ships with the library. These hooks are the whole styling surface:
the controller writes them straight to the DOM — never through a React render —
and your CSS reads them.

## Data attributes

| Attribute | Element | Values | When it changes |
| --- | --- | --- | --- |
| `data-state` | Content, Overlay | `"open"` \| `"closed"` | `"open"` the moment `open()` starts; back to `"closed"` **after** the close animation rests, so a CSS transition still plays. Written as `"closed"` at attach. |
| `data-snap-index` | Content | the active index as a string (`"0"`, `"1"`, …) | At rest, after a snap transition finishes. In content mode it stays `"0"` — there is one synthesized snap. |
| `data-dragging` | Content | present (empty value) or absent | Added when the drag passes the 3 px threshold, removed on release. |
| `data-content-mode` | Content | present (empty value) or absent | Set at attach and re-evaluated on `update({ snapPoints })`: present when there are no real snap points (`[]` or all-`"content"`). |
| `data-snap-sheet-inner` | the single wrapper `div` inside Content | present | Never changes. `Sheet.Content` always renders it; it is the element measured for the `"content"` snap value. In vanilla, add it yourself. |
| `data-snap-sheet-no-drag` | any descendant of Content — **you** write this one | present | Never changes. A `pointerdown` inside a subtree carrying it is ignored by the drag recogniser, so sliders, maps, carousels and swipeable rows keep their own gestures. |

`data-*` attributes are absent from server-rendered markup: there is no state
until the controller attaches on the client.

```css
.sheet[data-state="closed"] {
  visibility: hidden;
}
.sheet[data-dragging] {
  cursor: grabbing;
}
.sheet[data-content-mode] {
  border-radius: 16px 16px 0 0;
}
```

## CSS custom properties

| Property | Element | Unit | Meaning |
| --- | --- | --- | --- |
| `--snap-sheet-y` | Content | px (e.g. `240px`) | Offset of the panel's top edge from the top of the view. `0px` = fully open, view height = closed. This is what the panel's `translate3d` uses. |
| `--snap-sheet-progress` | Content, Overlay | unitless `0`–`1` | `0` closed → `1` at the topmost snap. The friendly one: use it for opacity, blur, colour mixes, anything that should fade with the sheet. |
| `--snap-sheet-offset` | Content | px | How much of the panel sits below the bottom of the view **at rest** — the same number as the panel's `padding-bottom`. Use it to keep a sticky footer or safe-area padding aligned with the visible part of the panel. |

`--snap-sheet-progress` is written on the **Overlay element itself**, not on a
shared ancestor: the controller never touches ancestors, the Portal wrapper or
the document root, so an overlay reads the value from its own style attribute
and nested sheets cannot overwrite each other's.

::: warning Read them where they are written
`--snap-sheet-y` and `--snap-sheet-offset` exist on Content only, so a
descendant inherits them (custom properties inherit) but the Overlay — a sibling
— does not see them. Only `--snap-sheet-progress` is written on both.
:::

## Write cadence

The three groups differ, and the difference is visible.

**Once, at attach.** Base layout on Content (`position`, `inset`, `height`,
`display: flex`, `box-sizing`, `touch-action: none`,
`overscroll-behavior: none`), `role="dialog"`, `aria-modal`,
`aria-labelledby`/`aria-describedby`, `tabindex="-1"`, the Overlay's
`aria-hidden`, the Handle's `aria-label`. Inline styles you set after attach win.

**Every frame, from the spring.** `transform`, `--snap-sheet-y`, and
`--snap-sheet-progress` (on Content and Overlay). `data-dragging` flips at the
start and end of a drag. These are direct style writes — no React render per
frame, and `useSheetState()` still only notifies once per frame.

**At rest only.** `padding-bottom` / `--snap-sheet-offset`, `data-snap-index`,
and the `Sheet.Body` `overflow`/`flex` pair for the active snap.

::: info `--snap-sheet-offset` is deliberately stale mid-drag
The panel is always full height so that no gap opens while dragging up, and
`padding-bottom` is what makes its *content box* end exactly at the bottom of
the view — which is what lets `Sheet.Body` scroll to its true end. Recomputing
that padding on every frame would relayout the panel 60 times a second, so the
library writes it (and `--snap-sheet-offset`) only when the sheet comes to rest.
During a drag both hold the previous snap's value and are corrected at the next
rest. Anything that must track the panel every frame should use
`--snap-sheet-y` or `--snap-sheet-progress` instead.
:::

## Recipes

### Overlay fade

`--snap-sheet-progress` on the overlay is exactly the opacity you want, so no
transition is needed — the value already comes from the spring.

```tsx
<Sheet.Overlay className="overlay" />
```

```css
.overlay {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 0.45);
  opacity: var(--snap-sheet-progress);
}
```

Multiply it for a softer maximum: `opacity: calc(var(--snap-sheet-progress) * 0.6)`.

### Style by active snap

`data-snap-index` is a plain attribute, so ordinary selectors branch on it — no
JavaScript, no state subscription.

```css
/* Rounded while peeking, square once the sheet fills the view. */
.sheet {
  border-radius: 16px 16px 0 0;
  transition: border-radius 150ms;
}
.sheet[data-snap-index="2"] {
  border-radius: 0;
}

/* Hide the grabber at the topmost snap. */
.sheet[data-snap-index="2"] .handle {
  opacity: 0;
}
```

Because the attribute is written at rest, these transitions fire when the sheet
lands rather than mid-drag — usually what you want. For something that has to
follow the finger, drive it from `--snap-sheet-progress`.

## Where next

- [Styling guide](/guide/styling) — panel visuals, safe areas, worked examples.
- [React API](/reference/react) — which part renders which element.
- [Core API](/reference/core) — what the controller writes and when.
