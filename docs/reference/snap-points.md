# Snap Points

The `SnapPoint` type in full, plus the rules the controller applies when it resolves your array into positions.

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

Snap points are always expressed as the **height of sheet visible**, never as an
offset. The controller converts once (`y = viewHeight - height`) and works in
offsets internally.

## `SnapValue` forms

Examples assume a 800 px view height.

| Form | Example | Resolves to | Notes |
| --- | --- | --- | --- |
| `number`, `0 < n <= 1` | `0.5` | 400 px of sheet visible | Fraction of view height. `1` = full height. |
| `number`, `n > 1` | `320` | 320 px | Absolute pixels. Capped at view height. |
| `` `${number}%` `` | `"60%"` | 480 px | Fraction of view height. Decimals allowed (`"12.5%"`). |
| `` `${number}px` `` | `"320px"` | 320 px | Same as the numeric px form, spelled out. |
| `"header"` | `"header"` | measured `offsetHeight` of `Sheet.Header` | Live-measured. Before the first measurement it stands in at 50 % of view height. |
| `"content"` | `"content"` | measured natural height of the panel's content | Live-measured, capped at view height. Same 50 % placeholder before measurement. |
| `0`, negative, `NaN`, unparseable string | `0` | nothing — dropped | Dev warning, then removed from the resolved set. `0` means closed. |

Resolved heights are rounded to whole pixels and capped at the view height, so
`1`, `"100%"`, `"9999px"` and `10000` all land at the same place.

::: tip
Mixed forms in one array are fine: `snapPoints={["header", "50%", 1]}`.
:::

## `SnapPointConfig`

Wrap a value in an object to attach per-snap behaviour.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `SnapValue` | — | Required. Any of the forms above. |
| `scroll` | `boolean` | `false` | `Sheet.Body` scrolls at this snap (`overflow-y: auto; flex: 1 1 auto`). At `false` the Body is `overflow: hidden; flex: 0 0 auto`, so its natural height is what `"content"` measures. |
| `drag` | `boolean \| { up?: boolean; down?: boolean }` | `true` | Whether a drag may leave this snap. `false` pins it in both directions; the object form locks one direction — `{ down: false }` means the user can drag up but not down. Each sub-field defaults to `true`. |

```tsx
<Sheet
  snapPoints={[
    "header",
    { value: 0.5, drag: { down: false } },
    { value: 1, scroll: true },
  ]}
/>
```

`drag` only constrains the user's gesture. `snapTo()`, `activeSnapIndex` and the
handle's keyboard controls move the sheet regardless.

## Resolution rules

1. **Indices are your array order.** `snapPoints={["content", 0.5, 1]}` means
   index `0` is `"content"`, `1` is `0.5`, `2` is `1` — for `defaultSnapIndex`,
   `activeSnapIndex`, `snapTo(index)`, `onSnapIndexChange(index, point)` and
   `data-snap-index`, always.
2. **Sorting is internal only.** The resolved set is also kept sorted by y so
   the release logic can find the nearest neighbour, but that ordering never
   reaches the API. Duplicate heights are kept as separate snaps. Ties on
   release go to the lower sheet position.
3. **`0` is not a valid snap point** — it means closed. It is reported with a
   one-time dev warning and dropped. So are negative, non-finite and
   unparseable values. Dropping never shifts the surviving indices: the resolved
   set can be non-contiguous, and index `2` stays index `2` even if index `1`
   was invalid.
4. **`"header"` and `"content"` are live-measured** with a shared
   `ResizeObserver` and capped at the view height. When the measured value of the
   *active* snap changes — content loads, a row expands, the window resizes — the
   sheet springs to the new position rather than jumping. Until the first
   measurement arrives they resolve to 50 % of view height so the sheet has a
   position on the first paint.
5. **No snap points, or only `"content"`, means content mode.** `[]` is treated
   as `["content"]`: the controller synthesizes one snap from the measured
   content height. Drag up is pinned, drag down past the dismiss threshold
   closes the sheet (or clamps back when `dismissible: false`),
   `data-content-mode` is set on the panel, `SheetState.contentMode` is `true`,
   `snapIndex` stays `0`, and `onSnapIndexChange` never fires.

::: warning Measured values need something to measure
`"header"` without a `Sheet.Header` — or a header that is `display: none` —
measures `0`, and a measured value of `0` is indistinguishable from "not
measured yet": the snap keeps the 50 % placeholder instead of being dropped, so
the sheet sits at half height. If a `"header"` snap looks stuck at half the
view, the header element is what to check. `"content"` measures the panel's inner
wrapper — see the [measurement contract](/reference/core#semantics).
:::

## `steps(count, opts?)`

Evenly spaced fractions, so you do not hand-write `[0.25, 0.5, 0.75, 1]`.

```ts
function steps(count: number, opts?: { from?: number; to?: number }): number[];
```

| Argument | Type | Default | Description |
| --- | --- | --- | --- |
| `count` | `number` | — | How many fractions to produce. Floored; anything below `1` or non-finite returns `[]`. |
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

The result is a plain `number[]`, so it composes with anything:

```tsx
import { steps } from "snap-bottom-sheet";

<Sheet snapPoints={["header", ...steps(3, { from: 0.4 })]} />;
// → ["header", 0.4, 0.7, 1]
```

Per-snap options need the object form, which `steps()` does not produce — map
over it when you want them:

```ts
const snapPoints = steps(3).map((value) => ({ value, scroll: true }));
```

## Where next

- [Snap Points guide](/guide/snap-points) — the same material with worked examples.
- [Dynamic Height](/guide/dynamic-height) — `"header"` and `"content"` in depth.
- [Gestures](/guide/gestures) — how a release picks the target snap.
