# Snap Points

A snap point is a height the sheet rests at. You pass an array of them; the sheet lands on the nearest one when you let go.

## Value forms

Every entry in `snapPoints` is a `SnapValue`, or an object wrapping one.

| Form | Example | Means |
| --- | --- | --- |
| `number` `<= 1` | `0.5` | A fraction of the view height — half the view showing |
| `number` `> 1` | `320` | An absolute pixel height |
| `` `${number}%` `` | `"50%"` | A fraction of the view height, spelled out |
| `` `${number}px` `` | `"320px"` | An absolute pixel height, spelled out |
| `"header"` | `"header"` | The measured height of `Sheet.Header` |
| `"content"` | `"content"` | The measured natural height of the panel's content |

`0.5` and `"50%"` are the same thing, as are `320` and `"320px"`. The string
forms exist because `320` versus `0.5` is easy to misread at a glance; use
whichever reads better in your codebase and mix them freely.

Every value is capped at the view height — `2000`, `"250%"` and a `"content"`
taller than the screen all resolve to a full-height sheet.

::: warning
`0` is not a valid snap point: `0` height means closed, and closed is a state,
not a snap. It warns once in development and is dropped. So are `NaN`,
negatives, and unparseable strings. Dropping an entry does **not** shift the
indices of its neighbours.
:::

## `steps()`

For evenly spaced fractions, `steps` saves the arithmetic.

```ts
import { steps } from "snap-bottom-sheet";

steps(3);                          // [1/3, 2/3, 1]
steps(4, { from: 0.25 });          // [0.25, 0.5, 0.75, 1]
steps(3, { from: 0.2, to: 0.8 });  // [0.2, 0.5, 0.8]
steps(1);                          // [1]
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `count` | `number` | — | How many snap points. Truncated to an integer; `< 1` returns `[]` |
| `opts.to` | `number` | `1` | The largest fraction — the topmost snap |
| `opts.from` | `number` | `to / count` | The smallest fraction — the lowest snap |

The default `from` is what makes `steps(3)` come out as thirds rather than
starting at `0`. `steps` is exported from the core entry, so React consumers
import it from `"snap-bottom-sheet"` alongside `Sheet` from
`"snap-bottom-sheet/react"`.

## Per-snap options

Wrap a value in a `SnapPointConfig` to change how the sheet behaves *at* that
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
| `scroll` | `boolean` | `false` | `Sheet.Body` scrolls at this snap. Pulling down at the top of the scroll hands the gesture back to the sheet |
| `drag` | `boolean \| { up?, down? }` | `true` | Allowed drag directions from this snap. `false` pins the sheet; `{ down: false }` makes it a floor the user cannot drag below |

`drag` only constrains movement *away from* this snap, so a snap with
`{ down: false }` still lets you drag up and then back down to it. See
[Scrolling](/guide/scrolling) for the scroll-versus-drag arbitration and
[Gestures](/guide/gestures) for the release rules.

## A mixed array

A peek at the header, a half-height stop, and a scrollable full-height list.

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

The controller resolves each entry to `{ index, y, config }` — `index` being its
position in *your* array — and then keeps a separate y-sorted view for finding
the nearest snap on release. The sorted view never surfaces:

- `defaultSnapIndex` / `activeSnapIndex` / `snapTo(index)` are your indices.
- `onSnapIndexChange(index, point)` reports your index, plus the original entry
  (`SnapPoint`, config object and all) so you do not have to look it up.
- `data-snap-index` on the panel is your index.

So `snapPoints={[1, "header"]}` puts full height at index `0` and the peek at
index `1`, however odd that reads — the array is the contract. Duplicate heights
are kept, and an entry that gets dropped as invalid leaves a gap rather than
renumbering the rest.

## When a measured value changes

`"header"` and `"content"` are live. When their measurement changes, the
controller re-resolves the snap points, and:

- If the **active** snap's y changed, the sheet animates to the new position with
  the spring. It does not jump.
- If a **different** snap's y changed, nothing moves — the new value is simply
  used the next time you land there.
- On a view-height change **during a drag**, the correction is immediate rather
  than sprung, so the panel stays under the finger.

Changing `snapPoints` itself behaves the same way: the active index is kept if it
is still valid, clamped if not, and the sheet springs to wherever that index now
resolves.

::: info
Before the first measurement lands, an unmeasured `"header"` or `"content"`
resolves to half the view height as a placeholder so the sheet has a position on
first paint. The real value replaces it on the next measurement, with a spring.
:::

## Where next

- [Dynamic Height](/guide/dynamic-height) — `"header"` and `"content"` in depth.
- [Scrolling](/guide/scrolling) — what `scroll: true` turns on.
- [Snap Points reference](/reference/snap-points) — the exact types.
