# Nested Sheets

You can open a sheet from inside another sheet without any special prop. Each sheet is its own controller, with its own portal, overlay and gesture bindings.

## What nesting gives you

- **No shared DOM.** Every sheet renders its own portal wrapper and its own overlay element. No ids are shared, so two open sheets never compete for the same node.
- **Drags stay local.** A drag that starts inside a sheet's Content does not bubble past it. Dragging the inner panel never moves the outer one.
- **One scroll lock, counted by reference.** The page lock is a single counter. Opening the inner sheet adds one to it, and closing the inner sheet takes one away. The page stays locked because the outer sheet still holds a reference. The original `overflow`, `overscroll-behavior` and `padding-right` come back only when the last modal sheet closes.
- **Escape closes the innermost sheet.** Open controllers that are both `modal` and `dismissible` are kept on a stack, and the shared `document` keydown listener closes `stack.at(-1)` only. So one <kbd>Esc</kbd> closes one sheet, innermost first.

## A two-level example

The inner sheet is simply another `<Sheet>`, rendered inside the outer one's `Sheet.Body`. Its portal still targets `document.body`, so the outer panel does not clip it.

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

The inner sheet has no `snapPoints`, so it is in content mode and takes the height of its own content. Closing it leaves the outer sheet exactly where it was: the same snap index, the same scroll position in `Sheet.Body`, and the page still locked.

::: tip
Nesting the sheets in the React tree is a convenience, not a requirement. Two sibling `<Sheet>` roots driven by two pieces of state behave in the same way. The stack is built from the open controllers, not from the JSX structure.
:::

## What nesting does not do for you

Please consider these points before you ship a stack of sheets.

**Stacking order is your CSS.** The library never writes a `z-index`, on any element at all. Stacking is decided entirely by your stylesheet and by DOM order. Both portals are appended to `document.body` in mount order, so the inner sheet usually lands on top. That is not a guarantee, though, and it does not hold if the inner sheet mounts first. Give each level an explicit `z-index`. Nothing in the library will compete with it:

```css
.sheet--outer,
.overlay {
  z-index: 100;
}

.sheet--inner {
  z-index: 110;
}
```

**The dimming adds up.** Each modal sheet renders its own overlay, and two overlays at 40% black come out at about 64%. If you want the second layer to be lighter, give it its own class:

```css
.sheet--inner ~ .overlay,
.overlay--inner {
  background: rgb(0 0 0 / 0.15);
}
```

You can also remove the inner overlay altogether with `modal={false}` on the inner sheet. You then lose its `inert` scope, its focus trap and its Escape handling as well, so please do that only for a sheet that really does not block the page.

**Each sheet returns focus on its own.** A sheet restores focus to whatever was focused when it opened. Closing the inner sheet returns focus into the outer sheet, which is what you want. Closing them in the wrong order breaks nothing, but the final focus target is then the element that opened the outermost sheet.

**Nothing coordinates the positions.** The outer sheet does not move, shrink or scale when the inner one opens. For an iOS-style card stack, animate the outer panel yourself from `data-state` on the inner one. The two sheets share no state, so you need your own class or CSS variable on a shared ancestor.

## Next

- [Accessibility](/guide/accessibility) — what `modal` turns on, and how Escape is routed.
- [Styling](/guide/styling) — the attributes and custom properties that the `z-index` and dimming recipes above rely on.
