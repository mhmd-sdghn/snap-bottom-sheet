<script setup>
import snappointsDemo from "../.vitepress/theme/demos/snap-points.tsx";
</script>

# Snap Points

A snap point is a height that the sheet rests at. You pass an array of them, and the sheet lands on the nearest one when you let go.

<ReactDemo :mount="snappointsDemo" />

## Value forms

Every entry in `snapPoints` is a `SnapValue`, or an object wrapping one.

| Form | Example | Means |
| --- | --- | --- |
| `number` `<= 1` | `0.5` | A fraction of the view height, so `0.5` shows half the view |
| `number` `> 1` | `320` | An absolute pixel height |
| `` `${number}%` `` | `"50%"` | A fraction of the view height, spelled out |
| `` `${number}px` `` | `"320px"` | An absolute pixel height, spelled out |
| `"header"` | `"header"` | The measured height of `Sheet.Header` |
| `"content"` | `"content"` | The measured natural height of the panel's content |

`0.5` and `"50%"` mean the same thing, and so do `320` and `"320px"`. The string
forms exist because `320` and `0.5` are easy to confuse at a glance. Use
whichever form reads better in your codebase, and feel free to mix them.

Every value is capped at the view height. `2000`, `"250%"` and a `"content"`
taller than the screen all give you a full-height sheet.

::: warning
`0` is not a valid snap point. A height of `0` means closed, and closed is a
state rather than a snap. In development the library warns once and drops the
entry. It does the same with `NaN`, negative numbers and strings it cannot
read. Dropping an entry does **not** shift the indices of its neighbours.
:::

## `steps()`

If you want evenly spaced fractions, `steps` does the arithmetic for you.

```ts
import { steps } from "snap-bottom-sheet";

steps(3);                          // [1/3, 2/3, 1]
steps(4, { from: 0.25 });          // [0.25, 0.5, 0.75, 1]
steps(3, { from: 0.2, to: 0.8 });  // [0.2, 0.5, 0.8]
steps(1);                          // [1]
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `count` | `number` | — | How many snap points you want. Truncated to an integer; `< 1` returns `[]` |
| `opts.to` | `number` | `1` | The largest fraction, which is the topmost snap |
| `opts.from` | `number` | `to / count` | The smallest fraction, which is the lowest snap |

The default `from` is the reason `steps(3)` gives you thirds instead of starting
at `0`. `steps` is exported from the core entry. React users import it from
`"snap-bottom-sheet"`, next to `Sheet` from `"snap-bottom-sheet/react"`.

## Per-snap options

Wrap a value in a `SnapPointConfig` to change how the sheet behaves at that one
snap.

```ts
interface SnapPointConfig {
  value: SnapValue;
  scroll?: boolean;                                   // default false
  drag?: boolean | { up?: boolean; down?: boolean };  // default true
}
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `SnapValue` | — | Any of the forms above |
| `scroll` | `boolean` | `false` | `Sheet.Body` scrolls at this snap. One touch can move from dragging the sheet to scrolling the body and back without lifting — see [Scrolling](/guide/scrolling) |
| `drag` | `boolean \| { up?, down? }` | `true` | The drag directions allowed from this snap. `false` pins the sheet in place, and `{ down: false }` makes the snap a floor the user cannot drag below |

`drag` only limits movement away from this snap. A snap with `{ down: false }`
still lets you drag up and then come back down to it. See
[Scrolling](/guide/scrolling) for the choice between scrolling and dragging, and
[Gestures](/guide/gestures) for what happens when you let go.

## A mixed array

A peek at the header, a stop at half height, and a scrollable full-height list.

::: code-group

```tsx [React]
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

export function Directions({ legs }: { legs: Leg[] }) {
  const [open, setOpen] = useState(true);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      snapPoints={[
        "header",                        // 0 — peek: just the title bar
        { value: "50%", drag: true },    // 1 — half the view
        { value: 1, scroll: true },      // 2 — full height, the list scrolls
      ]}
      defaultSnapIndex={1}
      onSnapIndexChange={(index) => console.log("resting at", index)}
    >
      <Sheet.Portal>
        <Sheet.Overlay className="overlay" />
        <Sheet.Content className="sheet">
          <Sheet.Handle className="handle" />
          <Sheet.Header className="header">
            <Sheet.Title>Directions</Sheet.Title>
          </Sheet.Header>
          <Sheet.Body className="body">
            {legs.map((leg) => (
              <p key={leg.id}>{leg.text}</p>
            ))}
          </Sheet.Body>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet>
  );
}
```

```ts [Vanilla]
import { createSheet } from "snap-bottom-sheet";

const sheet = createSheet(
  {
    content: document.querySelector<HTMLElement>("#sheet")!,
    header: document.querySelector<HTMLElement>("#sheet-header"),
    body: document.querySelector<HTMLElement>("#sheet-body"),
    overlay: document.querySelector<HTMLElement>("#sheet-overlay"),
    handle: document.querySelector<HTMLElement>("#sheet-handle"),
  },
  {
    snapPoints: [
      "header", //                     0 — peek: just the title bar
      { value: "50%", drag: true }, //  1 — half the view
      { value: 1, scroll: true }, //    2 — full height, the list scrolls
    ],
    defaultSnapIndex: 1,
    onSnapIndexChange: (index) => console.log("resting at", index),
  },
);

void sheet.open();
```

:::

## Indices stay in your order

The controller resolves each entry to `{ index, y, config }`, where `index` is
its position in your array. It keeps a separate list, sorted by y, to find the
nearest snap when you let go. That sorted list is internal and never reaches
you:

- `defaultSnapIndex`, `activeSnapIndex` and `snapTo(index)` all use your
  indices.
- `onSnapIndexChange(index, point)` reports your index. It also gives you the
  original entry as you wrote it, a `SnapPoint` with its config object and all,
  so you do not have to look it up.
- `data-snap-index` on the panel is your index.

So `snapPoints={[1, "header"]}` puts full height at index `0` and the peek at
index `1`, even though that order looks unusual. Your array is the contract.
Duplicate heights are kept, and an entry dropped as invalid leaves a gap instead
of renumbering the rest.

## When a measured value changes

`"header"` and `"content"` are measured live. When a measurement changes, the
controller resolves the snap points again:

- If the **active** snap's y changed, the sheet animates to the new position
  with the spring. It does not jump.
- If a **different** snap's y changed, nothing moves. The new value is used the
  next time you land there.
- If the view height changes **during a drag**, the correction is applied at
  once rather than sprung, so the panel stays under your finger.

Changing `snapPoints` yourself works the same way. The active index is kept if
it is still valid and clamped if it is not, and the sheet springs to wherever
that index now resolves.

::: info
Before the first measurement arrives, an unmeasured `"header"` or `"content"`
resolves to half the view height. This placeholder gives the sheet a position on
first paint. The real value replaces it at the next measurement, with a spring.
:::

## Where next

- [Dynamic Height](/guide/dynamic-height) — `"header"` and `"content"` in depth.
- [Scrolling](/guide/scrolling) — what `scroll: true` turns on.
- [Snap Points reference](/reference/snap-points) — the exact types.
