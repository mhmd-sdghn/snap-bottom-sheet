# Snap Points

The `SnapPoint` type in full, and the rules the controller follows when it turns your array into positions.

```ts
import { steps } from "snap-bottom-sheet";
import type { SnapPoint, SnapPointConfig, SnapValue } from "snap-bottom-sheet";
```

## Types

```ts
type SnapValue =
  | number            // 0 < n <= 1 → fraction of view height; n > 1 → px height
  | `${number}%`      // fraction of view height
  | `${number}px`     // px height
  | "header"          // measured height of Sheet.Header
  | "content";        // measured natural content height, capped at view height

interface SnapPointConfig {
  value: SnapValue;
  scroll?: boolean;                                    // default false
  drag?: boolean | { up?: boolean; down?: boolean };   // default true
}

type SnapPoint = SnapValue | SnapPointConfig;

function steps(count: number, opts?: { from?: number; to?: number }): number[];
```

A snap point always describes **how much of the sheet is visible**, never an
offset. The controller converts it once, with `y = viewHeight - height`, and
works in offsets from then on.

## `SnapValue` forms

The examples assume a view height of 800 px.

| Form | Example | Resolves to | Notes |
| --- | --- | --- | --- |
| `number`, `0 < n <= 1` | `0.5` | 400 px of sheet visible | A fraction of the view height. `1` is the full height. |
| `number`, `n > 1` | `320` | 320 px | Pixels. Capped at the view height. |
| `` `${number}%` `` | `"60%"` | 480 px | A fraction of the view height. Decimals are allowed, such as `"12.5%"`. |
| `` `${number}px` `` | `"320px"` | 320 px | The same as the numeric px form, written out. |
| `"header"` | `"header"` | measured `offsetHeight` of `Sheet.Header` | Measured while your app runs. `offsetHeight` **leaves margins out**. Please see the warning below. Before the first measurement it stands in at 50 % of the view height. |
| `"content"` | `"content"` | measured natural height of the panel's content | Measured while your app runs, and capped at the view height. It uses the same 50 % placeholder before the first measurement, and pauses at a `scroll: true` snap. |
| `0`, negative, `NaN`, unparseable string | `0` | nothing, it is dropped | You get a warning in development, and the value is removed from the resolved set. `0` means closed. |

Resolved heights are rounded to whole pixels and capped at the view height. So
`1`, `"100%"`, `"9999px"` and `10000` all land in the same place.

::: tip
You may mix the forms in one array: `snapPoints={["header", "50%", 1]}`.
:::

## `SnapPointConfig`

Wrap a value in an object to give one snap its own behaviour.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `SnapValue` | — | Required. Any of the forms above. |
| `scroll` | `boolean` | `false` | `Sheet.Body` scrolls at this snap, with `overflow-y: auto; flex: 1 1 auto; touch-action: pan-x`. A touch gesture may cross between dragging the sheet and scrolling the body without a lift; see [Scrolling](/guide/scrolling). Measurement of `"content"` pauses and holds the last measured value. With `false` the Body is `overflow: hidden; flex: 0 0 auto`, so `"content"` measures its natural height. |
| `drag` | `boolean \| { up?: boolean; down?: boolean }` | `true` | Whether a drag may leave this snap. `false` pins it in both directions. The object form locks one direction, so `{ down: false }` lets the user drag up but not down. Each field inside defaults to `true`. |

```tsx
<Sheet
  snapPoints={[
    "header",
    { value: 0.5, drag: { down: false } },
    { value: 1, scroll: true },
  ]}
/>
```

`drag` limits the user's gesture only. `snapTo()`, `activeSnapIndex` and the
handle's keyboard controls move the sheet either way.

## Resolution rules

1. **Indices follow your array order.** With `snapPoints={["content", 0.5, 1]}`,
   index `0` is `"content"`, index `1` is `0.5` and index `2` is `1`. That holds
   for `defaultSnapIndex`, `activeSnapIndex`, `snapTo(index)`,
   `onSnapIndexChange(index, point)` and `data-snap-index`, always.
2. **Sorting stays internal.** The resolved set is also kept sorted by y, so the
   release logic can find the nearest neighbour. That order never reaches the
   API. Two snaps with the same height are kept as separate snaps. When a release
   is a tie, the lower sheet position wins.
3. **`0` is not a valid snap point**, because it means closed. You get one
   warning in development, and the value is dropped. The same happens to
   negative, non-finite and unparseable values. Dropping a value never moves the
   indices that remain. The resolved set may have gaps, and index `2` stays index
   `2` even when index `1` was invalid.
4. **`"header"` and `"content"` are measured while your app runs**, through a
   shared `ResizeObserver`, and capped at the view height. When the measured
   value of the *active* snap changes, the sheet springs to the new position
   rather than jumping. That happens when content loads, when a row expands or
   when the window resizes. Until the first measurement arrives they resolve to
   50 % of the view height, so the sheet has a position on the first paint.
   Measurement of `"content"` pauses while the active snap has `scroll: true`.
   The Body is a scroll box then, with no natural height to read, so the **last
   measured value is kept** until a non-scrolling snap becomes active again.
5. **No snap points, or only `"content"`, means content mode.** `[]` is treated
   as `["content"]`, and the controller builds one snap from the measured content
   height. Dragging up is pinned. Dragging down past the dismiss threshold closes
   the sheet, or returns to the snap when `dismissible: false`. The panel gets
   `data-content-mode`, `SheetState.contentMode` is `true`, `snapIndex` and
   `data-snap-index` stay at `0` and `"0"`, and `onSnapIndexChange` never runs.

::: warning Measured values need something to measure
A `"header"` snap with no `Sheet.Header`, or with a header that is
`display: none`, measures `0`. A measured value of `0` looks the same as "not
measured yet", so the snap keeps the 50 % placeholder instead of being dropped,
and the sheet sits at half height. If a `"header"` snap seems stuck at half the
view, please check the header element first. `"content"` measures the panel's
inner wrapper. See the [measurement contract](/reference/core#semantics).
:::

::: warning `"header"` uses `offsetHeight`, so margins do not count
`offsetHeight` covers content, padding and border, but not margin. A
`Sheet.Header` with `margin: 16px` resolves 32 px shorter than it looks, and the
sheet lands with its header partly cut off. Please use **padding** on the header,
or a margin on a child inside it, rather than a margin on `Sheet.Header` itself.
:::

## `steps(count, opts?)`

Evenly spaced fractions, so that you do not have to write `[0.25, 0.5, 0.75, 1]`
by hand.

```ts
function steps(count: number, opts?: { from?: number; to?: number }): number[];
```

| Argument | Type | Default | Description |
| --- | --- | --- | --- |
| `count` | `number` | — | How many fractions to produce. The value is rounded down. Anything below `1`, or not finite, returns `[]`. |
| `opts.to` | `number` | `1` | The last fraction. |
| `opts.from` | `number` | `to / count` | The first fraction. |

| Call | Result |
| --- | --- |
| `steps(3)` | `[1/3, 2/3, 1]` — `≈ [0.333, 0.667, 1]` |
| `steps(4)` | `[0.25, 0.5, 0.75, 1]` |
| `steps(3, { from: 0.2 })` | `[0.2, 0.6, 1]` |
| `steps(4, { from: 0.25, to: 1 })` | `[0.25, 0.5, 0.75, 1]` |
| `steps(2, { to: 0.8 })` | `[0.4, 0.8]` |
| `steps(1)` | `[1]` |
| `steps(1, { from: 0.3 })` | `[0.3]` |
| `steps(0)` | `[]` |

The result is a plain `number[]`, so it combines with anything:

```tsx
import { steps } from "snap-bottom-sheet";

<Sheet snapPoints={["header", ...steps(3, { from: 0.4 })]} />;
// → ["header", 0.4, 0.7, 1]
```

Per-snap options need the object form, and `steps()` does not produce it. Map
over the result when you want them:

```ts
const snapPoints = steps(3).map((value) => ({ value, scroll: true }));
```

## Where next

- [Snap Points guide](/guide/snap-points) — the same material, with worked examples.
- [Dynamic Height](/guide/dynamic-height) — `"header"` and `"content"` in detail.
- [Gestures](/guide/gestures) — how a release chooses the target snap.
