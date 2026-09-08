# Styling Hooks

Every data attribute and CSS custom property the controller writes, where each one lands, and how often it changes.

No stylesheet ships with the library. These hooks are all you need to style the
sheet. The controller writes them straight to the DOM, never through a React
render, and your CSS reads them.

## Data attributes

| Attribute | Element | Values | When it changes |
| --- | --- | --- | --- |
| `data-state` | Content, Overlay | `"open"` \| `"closed"` | It becomes `"open"` the moment `open()` starts. It returns to `"closed"` **after** the close animation comes to rest, so a CSS transition still plays. `SheetState.open` is already `false` by then, because it turns over when the close *starts*. At attach the attribute is written as `"closed"`. |
| `data-snap-index` | Content | the active index as a string (`"0"`, `"1"`, …) | At rest, once a snap transition has finished. It is also written mid-gesture at the moment a drag reaches a scrolling snap and the content takes over, because the sheet is resting at that snap from then on. In content mode it is always `"0"`, because there is only the one snap the controller built. |
| `data-dragging` | Content | present (empty value) or absent | Added when a gesture starts moving the sheet, and removed on release. |
| `data-scrolling` | Content | present (empty value) or absent | Added while a gesture is scrolling the body's content, removed on release. |
| `data-content-mode` | Content | present (empty value) or absent | Set at attach, and worked out again on `update({ snapPoints })`. It is present when there are no real snap points, meaning `[]` or only `"content"`. |
| `data-snap-sheet-inner` | the single wrapper `div` inside Content | present | Never changes. `Sheet.Content` always renders it, and it is the element measured for the `"content"` snap value. In vanilla, please add it yourself. |
| `data-snap-sheet-no-drag` | any descendant of Content, and **you** write this one | present | Never changes. The gesture layer ignores a `pointerdown` inside a subtree that carries it, so neither a drag nor a library scroll starts there. Horizontal gestures still work, which covers sliders, carousels and swipeable rows. Vertical touch panning does not, inside `Sheet.Body` at a `scroll: true` snap — see [Scrolling](/guide/scrolling#nested-scrollers-inside-the-body). |

`data-dragging`, `data-scrolling` and `data-content-mode` are **presence**
attributes. They are written with an empty value and removed again, and never
set to `"false"`. So match them with `[data-dragging]` and `[data-content-mode]`,
and match their absence with `:not([data-dragging])`. A selector like
`[data-dragging="false"]` never matches anything.

`data-dragging` and `data-scrolling` are the two phases of one gesture, and they
are mutually exclusive. Inside a scrollable `Sheet.Body`, the finger first moves
the sheet, under `data-dragging`, and then scrolls the content, under
`data-scrolling`. Both are removed on release, so the momentum that carries the
content afterwards has neither. See [Scrolling](/guide/scrolling).

Server-rendered markup carries no `data-*` attributes, because there is no state
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
| `--snap-sheet-y` | Content | px (e.g. `240px`) | The offset of the panel's top edge from the top of the view. `0px` means fully open, and the view height means closed. The panel's `translate3d` uses this value. |
| `--snap-sheet-progress` | Content, Overlay | unitless `0`–`1` | `0` when fully closed, rising to `1` at the topmost snap you **declared**. This is the easy one to work with. Use it for opacity, blur, colour mixes, and anything else that should fade along with the sheet. |
| `--snap-sheet-offset` | Content | px | How much of the panel sits below the bottom of the view **at rest**. It is the same number as the panel's `padding-bottom`. Use it to keep a sticky footer or safe-area padding lined up with the visible part of the panel. |

`--snap-sheet-progress` is written on the **Overlay element itself**, not on a
shared ancestor. The controller never touches ancestors, the Portal wrapper or
the document root. So an overlay reads the value from its own style attribute,
and nested sheets cannot overwrite each other's value.

The scale runs to the topmost snap you **declared**, not to the full view height.
Take `snapPoints={[0.3, 0.6]}` on an 800 px view. The value reaches `1` at `0.6`,
which is a sheet 480 px tall, and the lower snap of 240 px reads `0.5`. The value
therefore always covers the distance the sheet really travels, and
`calc(var(--snap-sheet-progress) * 0.45)` reaches the full `0.45` at the top
snap, whatever heights you declared.

::: info The library never writes `z-index`
Not on the panel, not on the overlay, not on the Portal container, and not on any
other element. Stacking is entirely yours. That is also what keeps nested sheets
and your own fixed-position UI predictable.
:::

::: warning Read them where they are written
`--snap-sheet-y` and `--snap-sheet-offset` exist on Content only. Custom
properties are inherited, so a descendant of Content sees them, but the Overlay
is a sibling and does not. Only `--snap-sheet-progress` is written on both.
:::

## Write cadence

The groups below are written at different times, and you can see the difference.

**Once, at attach.** The base layout on Content, which is `position`, `inset`,
`height`, `display: flex`, `box-sizing`, `touch-action: none` and
`overscroll-behavior: none`. The Overlay's positioning, which is
`position: fixed` or `absolute` plus `inset: 0`. Then `role="dialog"`,
`aria-modal`, `aria-labelledby` and `aria-describedby`, `tabindex="-1"`, the
Overlay's `aria-hidden` and the Handle's `aria-label`. Inline styles you set
after attach win.

**When `modal` changes.** The Overlay's `display`. A non-modal sheet has no
overlay, so the controller writes `display: none` on the element while `modal`
is `false`. It checks this at attach, on every `update({ modal })`, and whenever
the overlay element itself is swapped in or out. Your own inline `display` is
saved first and restored when the sheet becomes modal again, when the overlay is
removed, or when the sheet is destroyed. See
[`Sheet.Overlay`](/reference/react#sheet-overlay).

**Every frame, from the spring.** `transform`, `--snap-sheet-y` and
`--snap-sheet-progress`, on Content and on Overlay. `data-dragging` and
`data-scrolling` are added and removed as the gesture enters and leaves each of
its phases. These are direct style writes, so there is no React render per
frame, and `useSheetState()` still notifies you only once per frame.

**At rest only.** `padding-bottom` and `--snap-sheet-offset`, `data-snap-index`,
and the `Sheet.Body` set of `overflow`, `flex` and `touch-action` for the active
snap. `Sheet.Body`'s `scrollTop` is written outside all of these: the engine
drives it while a touch gesture scrolls the content, and while the momentum
afterwards runs.

::: info `--snap-sheet-offset` is out of date during a drag, on purpose
The panel is always full height, so no gap opens while you drag it up.
`padding-bottom` is what makes its *content box* end exactly at the bottom of the
view, and that is what lets `Sheet.Body` scroll to its true end. Working that
padding out on every frame would lay the panel out again 60 times a second. So
the library writes it, and `--snap-sheet-offset` with it, only when the sheet
comes to rest. During a drag both hold the previous snap's value, and both are
corrected at the next rest. For anything that has to follow the panel on every
frame, please use `--snap-sheet-y` or `--snap-sheet-progress` instead.
:::

## Recipes

### Overlay fade

On the overlay, `--snap-sheet-progress` is exactly the opacity you want, and it
already comes from the spring, so you need no transition. The controller owns the
overlay's positioning. At attach it writes `position: fixed`, or `absolute` when
the sheet has a Portal `container`, along with `inset: 0`. The rule you write is
therefore about colour only.

```tsx
<Sheet.Overlay className="overlay" />
```

```css
.overlay {
  background: rgb(0 0 0 / 0.45);
  opacity: var(--snap-sheet-progress);
}
```

For a softer maximum, multiply it: `opacity: calc(var(--snap-sheet-progress) * 0.6)`.

### Style by active snap

`data-snap-index` is a plain attribute, so ordinary selectors can branch on it.
You need no JavaScript and no state subscription.

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

The attribute is written at rest, so these transitions run when the sheet lands
rather than during the drag. That is usually what you want. For something that
has to follow the finger, drive it from `--snap-sheet-progress`.

## Where next

- [Styling guide](/guide/styling) — panel visuals, safe areas and worked examples.
- [React API](/reference/react) — which part renders which element.
- [Core API](/reference/core) — what the controller writes, and when.
