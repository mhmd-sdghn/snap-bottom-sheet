# Accessibility

The sheet is a dialog, and the controller writes the dialog semantics for you. Your part is to give it a real title, a sensible focus order, and a visible focus ring.

## Dialog semantics

The controller writes these onto the Content panel:

| Attribute | Value |
|---|---|
| `role` | `"dialog"` |
| `aria-modal` | mirrors the `modal` option (default `true`) |
| `aria-labelledby` | the id of `Sheet.Title` |
| `aria-describedby` | the id of `Sheet.Description` |

In React the ids come from `useId`. `Sheet.Title` and `Sheet.Description` need no props of their own, so rendering them is enough:

```tsx
<Sheet.Content className="sheet">
  <Sheet.Handle className="handle" />
  <Sheet.Header className="header">
    <Sheet.Title>Ride options</Sheet.Title>
    <Sheet.Description>Pick a car class, then confirm.</Sheet.Description>
  </Sheet.Header>
  <Sheet.Body className="body">…</Sheet.Body>
</Sheet.Content>
```

`<Sheet>` has no `labelledBy` or `describedBy` props. Rendering the two parts *is* the React API. Those options exist only on the core's `SheetOptions`. The vanilla core has no `useId` and no parts, so there you point at your own ids:

::: code-group

```tsx [React]
// Nothing to wire — rendering Sheet.Title / Sheet.Description is the wiring.
<Sheet.Title>Ride options</Sheet.Title>
<Sheet.Description>Pick a car class, then confirm.</Sheet.Description>
```

```ts [Vanilla]
const sheet = createSheet(
  { content, header, body, overlay, handle },
  {
    labelledBy: "ride-options-title",
    describedBy: "ride-options-desc",
  },
);
```

:::

The overlay is `aria-hidden`, because it is a backdrop and not content.

## What `modal` turns on

`modal` defaults to `true`. While a modal sheet is open the controller:

1. Sets `inert` on every child of the portal container except the sheet's own wrapper. Nothing behind the sheet is then reachable by keyboard, pointer or screen reader. The controller removes `inert` again on close.
2. Moves focus to the first focusable element inside Content. If there is none, it moves focus to Content itself, with `tabIndex={-1}`.
3. Locks scrolling. It locks the page by default, or the `container` when `Sheet.Portal` has one. The lock is reference-counted, as described in [Nested Sheets](/guide/nested-sheets).
4. Returns focus to the element that was focused before the sheet opened, on close.

::: warning A `container` scopes what "modal" means
Steps 1 and 3 both apply to the Portal container. By default that is `document.body`, which means the whole page. Give `Sheet.Portal` a `container` and the sheet becomes modal *within that box* only. Just the container's children go inert. The scroll lock applies to the container's own `overflow` rather than the document's, so the page around it keeps scrolling and stays interactive. This is what lets an embedded sheet work without freezing its host page. A docs demo, a split pane and a phone-frame preview all rely on it.

Escape is deliberately **not** scoped. It stays a single shared `document` listener, so an embedded modal sheet still closes on Escape.

If a custom container should block the whole page, make it the ancestor of everything the sheet needs to block.
:::

With `modal={false}` you get none of the above. The page stays interactive and focus stays where it was. That is the right choice for a sheet that stays on screen without blocking the page. In that case, please make sure yourself that the sheet is reachable.

## Escape

Escape closes the sheet when both `dismissible` and `modal` are true. The listener is a single shared `document` handler over a stack of open sheets. Escape always reaches the **innermost** open sheet, which is the one on top, and closes only that one.

Set `dismissible={false}` if you want Escape to do nothing. That covers overlay clicks and drag-to-dismiss as well. Refusing the close from a controlled `onOpenChange` handler instead produces a documented one-frame bounce. See [Controlled State](/guide/controlled-state).

## Reduced motion

`reducedMotion` accepts `true | false | "system"` and defaults to `"system"`. The `"system"` setting follows the `prefers-reduced-motion: reduce` media query. When reduced motion is in effect, springs run `immediate`, so the sheet jumps to each position instead of animating there. Snap behaviour, indices and callbacks stay the same.

```tsx
<Sheet reducedMotion="system">   {/* default */}
<Sheet reducedMotion={true}>     {/* always immediate */}
<Sheet reducedMotion={false}>    {/* always animate, even under reduce */}
```

::: warning
`reducedMotion={false}` overrides an accessibility preference that the user chose on purpose. Please use it only when the motion of the sheet is the content itself, such as a demo of this library.
:::

## The handle

`Sheet.Handle` renders a real `<button>`, so you can reach it with Tab and use it without a pointer:

- <kbd>ArrowUp</kbd> / <kbd>ArrowDown</kbd> step one snap point and **clamp** at the ends. ArrowUp at the topmost snap does nothing, and neither does ArrowDown at the lowest.
- <kbd>Enter</kbd> / <kbd>Space</kbd> cycle to the next snap and **wrap**. From the topmost snap they return to the lowest.

It carries a default `aria-label` of `"Resize sheet"`. Pass your own to override it, or to localise it:

```tsx
<Sheet.Handle className="handle" aria-label="Redimensionner la feuille" />
```

Because it is a button, it comes with the browser's own border and background. The [starter stylesheet](/guide/styling#a-starter-stylesheet) removes those and draws the pill with `::before`.

## Your checklist

The library cannot do these for you:

- **Render a real `Sheet.Title`.** Without it there is no `aria-labelledby`, and the dialog is announced as an unnamed dialog. If the title should not be visible, keep it in the DOM and hide it with a visually-hidden class rather than `display: none`.
- **Add `Sheet.Description`** when the title alone does not make the purpose of the sheet clear. Skip it rather than filling it with noise.
- **Check the focus order.** Focus lands on the first focusable element inside Content. That is `Sheet.Handle` if you render one. If that is a poor place to land, put a more useful control first, or remove the handle and let people drag the panel.
- **Keep a visible focus ring.** Never `outline: none` on the handle, `Sheet.Close`, or anything inside `Sheet.Body`.
- **Give `Sheet.Close` an accessible name.** An icon-only close button needs `aria-label`.
- **Make the drag optional.** Every state the sheet can reach by dragging should also be reachable through a control. The handle keys, a `Sheet.Close`, or your own button calling `open()` or `snapTo()` on the ref all work. Please note that `snapTo()` on a closed sheet only chooses the snap it will open at. Use `open()` to show it.
- **Test with the keyboard only**, then with a screen reader, at each snap point. Include a `scroll: true` snap, where `Sheet.Body` becomes the scroller.

## Next

- [Nested Sheets](/guide/nested-sheets) — how Escape and the scroll lock behave when sheets stack.
- [Gestures](/guide/gestures) — drag thresholds, and opting regions out of dragging.
