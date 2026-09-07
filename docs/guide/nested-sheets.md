# Nested Sheets

A sheet opened from inside another sheet works without any special prop. Each sheet is an independent controller with its own portal, overlay and gesture bindings.

## What nesting gives you

- **No shared DOM.** Every sheet renders its own portal wrapper and its own overlay element. There are no shared ids, so two open sheets never fight over the same node.
- **Drags stay local.** A drag that starts inside a sheet's Content does not bubble past it, so dragging the inner panel never moves the outer one.
- **One scroll lock, reference-counted.** The page lock is a module-level counter. Opening the inner sheet increments it; closing the inner sheet decrements it, and the page stays locked because the outer sheet still holds a reference. The original `overflow`, `overscroll-behavior` and `padding-right` are restored only when the last modal sheet closes.
- **Escape hits the innermost sheet.** Open `modal && dismissible` controllers are kept on a stack, and the shared `document` keydown listener closes `stack.at(-1)` only. One <kbd>Esc</kbd> per sheet, innermost first.

## A two-level example

The inner sheet is just another `<Sheet>`, rendered inside the outer one's `Sheet.Body`. Its portal still targets `document.body`, so it is not clipped by the outer panel.

```tsx
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

export function RideOptions() {
  const [ride, setRide] = useState(false);
  const [payment, setPayment] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setRide(true)}>
        Choose a ride
      </button>

      <Sheet open={ride} onOpenChange={setRide} snapPoints={["header", 0.6]}>
        <Sheet.Portal>
          <Sheet.Overlay className="overlay" />
          <Sheet.Content className="sheet sheet--outer">
            <Sheet.Handle className="handle" />
            <Sheet.Header className="header">
              <Sheet.Title>Ride options</Sheet.Title>
            </Sheet.Header>
            <Sheet.Body className="body">
              <p>Comfort · 4 min away</p>

              <button type="button" onClick={() => setPayment(true)}>
                Change payment method
              </button>

              <Sheet open={payment} onOpenChange={setPayment}>
                <Sheet.Portal>
                  <Sheet.Overlay className="overlay" />
                  <Sheet.Content className="sheet sheet--inner">
                    <Sheet.Handle className="handle" />
                    <Sheet.Header className="header">
                      <Sheet.Title>Payment method</Sheet.Title>
                    </Sheet.Header>
                    <Sheet.Body className="body">
                      <button type="button" onClick={() => setPayment(false)}>
                        Visa ···· 4242
                      </button>
                      <button type="button" onClick={() => setPayment(false)}>
                        Apple Pay
                      </button>
                    </Sheet.Body>
                  </Sheet.Content>
                </Sheet.Portal>
              </Sheet>
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}
```

The inner sheet has no `snapPoints`, so it is in content mode and hugs its own content. Closing it leaves the outer sheet exactly where it was — the same snap index, the same scroll position in `Sheet.Body`, and the page still locked.

::: tip
Nesting in the React tree is a convenience, not a requirement. Two sibling `<Sheet>` roots driven by two pieces of state behave identically — the stack is built from open controllers, not from JSX ancestry.
:::

## What nesting does not do for you

Be honest with yourself about these before shipping a stack of sheets.

**Stacking order is your CSS.** The library never writes a `z-index` — not on the panel, not on the overlay, not on the portal wrapper, on no element ever — so stacking is decided entirely by your stylesheet and by DOM order. Both portals append to `document.body` in mount order, so the inner sheet usually lands on top, but "usually" is not a guarantee and it will not survive an inner sheet that mounts first. Give each level an explicit `z-index`; nothing in the library will compete with it:

```css
.sheet--outer,
.overlay {
  z-index: 100;
}

.sheet--inner {
  z-index: 110;
}
```

**Backdrop dimming stacks literally.** Each modal sheet renders its own overlay, and two overlays at 40% black compose to about 64%. If you want the second layer lighter, give it its own class:

```css
.sheet--inner ~ .overlay,
.overlay--inner {
  background: rgb(0 0 0 / 0.15);
}
```

Or drop the inner overlay entirely with `modal={false}` on the inner sheet — but then you also lose its `inert` scope, its focus trap and its Escape handling, so only do that for a sheet that is genuinely non-blocking.

**Focus return is per sheet.** Each sheet restores focus to whatever was focused when it opened. Closing the inner sheet returns focus into the outer sheet, which is what you want; closing both in the wrong order does not corrupt anything, but the final focus target is the element that opened the outermost sheet.

**Nothing coordinates positions.** The outer sheet does not move, shrink, or scale when the inner one opens. If you want an iOS-style card stack, animate the outer panel yourself off `data-state` on the inner one — the two sheets share no state, so that means your own class or CSS variable on a common ancestor.

## Next

- [Accessibility](/guide/accessibility) — what `modal` turns on, and Escape routing.
- [Styling](/guide/styling) — the attributes and custom properties the `z-index` and dim recipes above hang off.
