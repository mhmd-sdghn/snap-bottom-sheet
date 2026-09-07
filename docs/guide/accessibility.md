# Accessibility

The sheet is a dialog, and the controller writes the dialog semantics for you. What is left to you is a real title, a sensible focus order, and a visible focus ring.

## Dialog semantics

The controller writes these onto the Content panel:

| Attribute | Value |
|---|---|
| `role` | `"dialog"` |
| `aria-modal` | mirrors the `modal` option (default `true`) |
| `aria-labelledby` | the id of `Sheet.Title` |
| `aria-describedby` | the id of `Sheet.Description` |

In React the ids come from `useId`, so `Sheet.Title` and `Sheet.Description` need no props — rendering them is enough:

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

There are no `labelledBy` / `describedBy` props on `<Sheet>` — rendering the two parts *is* the React API. Those options exist only on the core's `SheetOptions`, because the vanilla core has no `useId` and no parts, so there you point at your own ids:

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

The overlay is `aria-hidden` — it is a backdrop, not content.

## What `modal` turns on

`modal` defaults to `true`. While a modal sheet is open the controller:

1. Sets `inert` on every child of the portal container except the sheet's own wrapper, so nothing behind the sheet is reachable by keyboard, pointer or screen reader — and removes it on close.
2. Moves focus to the first focusable element inside Content; if there is none, to Content itself with `tabIndex={-1}`.
3. Locks page scroll (reference-counted, see [Nested Sheets](/guide/nested-sheets)).
4. Returns focus to the element that was focused before the sheet opened, on close.

::: warning `inert` reaches only inside the Portal container
Step 1 is scoped to the *children of the Portal container* — `document.body`'s children by default, which is the whole page. Give `Sheet.Portal` a `container` and only that container's children go inert: everything outside it stays interactive and reachable by a screen reader, however modal the sheet is. If you need a custom container, make it the ancestor of everything the sheet should block, or accept that the rest of the page is still live.
:::

With `modal={false}` you get none of the above: the page stays interactive and focus stays wherever it was. That is the right choice for a persistent, non-blocking sheet, but then it is on you to make sure the sheet is reachable.

## Escape

Escape closes the sheet when both `dismissible` and `modal` are true. The listener is a single shared `document` handler over a stack of open sheets, so Escape always reaches the **innermost** open sheet — the one on top — and closes only that one.

If you want Escape (and overlay clicks, and drag-to-dismiss) to do nothing, set `dismissible={false}`. Refusing the close from a controlled `onOpenChange` handler instead produces a documented one-frame bounce; see [Controlled State](/guide/controlled-state).

## Reduced motion

`reducedMotion` accepts `true | false | "system"` and defaults to `"system"`, which follows the `prefers-reduced-motion: reduce` media query. When reduced motion is in effect, springs run `immediate` — the sheet jumps to each position instead of animating there. Snap behaviour, indices and callbacks are unchanged.

```tsx
<Sheet reducedMotion="system">   {/* default */}
<Sheet reducedMotion={true}>     {/* always immediate */}
<Sheet reducedMotion={false}>    {/* always animate, even under reduce */}
```

::: warning
`reducedMotion={false}` overrides an accessibility preference the user set deliberately. Use it only when the sheet's motion is the content (a demo of the library itself, for example).
:::

## The handle

`Sheet.Handle` renders a real `<button>`, so it is tabbable and operable without a pointer:

- <kbd>ArrowUp</kbd> / <kbd>ArrowDown</kbd> step one snap point and **clamp** at the ends: ArrowUp at the topmost snap and ArrowDown at the lowest do nothing.
- <kbd>Enter</kbd> / <kbd>Space</kbd> cycle to the next snap and **wrap** — from the topmost snap they return to the lowest.

It carries a default `aria-label` of `"Resize sheet"`. Pass your own to override it, or to localise it:

```tsx
<Sheet.Handle className="handle" aria-label="Redimensionner la feuille" />
```

Because it is a button, it arrives with a UA border and background. The [starter stylesheet](/guide/styling#a-starter-stylesheet) resets those and draws the pill with `::before`.

## Your checklist

The library cannot do these for you:

- **Render a real `Sheet.Title`.** Without it there is no `aria-labelledby` and the dialog is announced as an unnamed dialog. If the title should not be visible, keep it in the DOM and hide it with a visually-hidden class, not `display: none`.
- **Add `Sheet.Description`** when the sheet's purpose is not obvious from its title alone. Skip it rather than filling it with noise.
- **Check the focus order.** Focus lands on the first focusable element inside Content — which is `Sheet.Handle` if you render one. If that is a poor landing spot, put a more useful control first, or drop the handle and let people drag the panel.
- **Keep a visible focus ring.** Never `outline: none` on the handle, `Sheet.Close`, or anything inside `Sheet.Body`.
- **Give `Sheet.Close` an accessible name.** An icon-only close button needs `aria-label`.
- **Make the drag optional.** Every state the sheet can reach by dragging should also be reachable by a control — the handle keys, a `Sheet.Close`, or your own button calling `open()` or `snapTo()` on the ref. Note that `snapTo()` on a closed sheet only chooses the snap it will open at; use `open()` to show it.
- **Test with the keyboard only**, then with a screen reader, at each snap point — including a `scroll: true` snap, where `Sheet.Body` becomes the scroller.

## Next

- [Nested Sheets](/guide/nested-sheets) — how Escape and the scroll lock behave when sheets stack.
- [Gestures](/guide/gestures) — drag thresholds, and opting regions out of dragging.
