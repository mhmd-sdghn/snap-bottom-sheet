# Task 11 — core/react follow-ups surfaced by the docs pass

Worker: W1. Branch: `w1/11-core-followups` off `v1` (after task 08). Plan sections: §2.2, §2.3. Source: W2's API questions while writing the docs (task 05) — each item below is a decision now recorded in PLAN; implement it in code.

> FINAL.

## Changes

1. **`snapTo()` while closed** must not move the panel (today it animates behind `data-state="closed"`). When `!isOpen`: update `snapIndex` (+ `notify`, + `onSnapIndexChange` when it changed and not content mode) and return resolved; the position is applied by the next `open()`. Test.
2. **`skipInitialAnimation`** applies to the **first** `open()` of a controller instance only; later opens animate. Test: second open on the same controller animates (spring `animating` true for ≥ 1 frame).
3. **Overlay base styles**: at attach (and in `setElements({ overlay })`), write restorable base styles on the overlay like the panel: `position: fixed` (or `absolute` with a container), `inset: 0`. Leave `pointer-events`, color and `z-index` to the consumer. Test: styles present after attach, restored on `destroy()`.
4. **`SheetHandle.open()` / `close()` / `snapTo()` in the React layer** (W2's analysis, packages/sheet/src/react/Sheet.tsx): a closed sheet has no children, no `contentEl`, no controller — so the handle cannot go through `controllerRef`. Route `open()` → `setOpen(true)` and `close()` → `setOpen(false)` (the existing sync effects call the controller; this also avoids the controlled-veto bounce that a direct `controller.close()` would trip). Both return a `Promise<void>` resolved from the `onAnimationEnd(open)` callback via a small deferred list kept in a ref (resolve immediately when already in the requested state). `snapTo(i)` on a closed sheet → `setSnapIndex(i)` (picks the opening snap; core's closed-`snapTo` change makes this consistent) and resolves. Tests with the fake controller: `open()` on a closed uncontrolled sheet mounts children and calls `controller.open()` once; the promise resolves only after the fake fires `onAnimationEnd(true)`; `close()` on a controlled sheet does not re-open.
5. **Types**: `onDragEnd?(targetIndex: number): void` everywhere (PLAN said `number | -1`, which is just `number`); JSDoc: `-1` = closing. `SheetProps.onDragEnd` too.
6. **Docs-facing guarantees now in PLAN §2.2 — verify each has a test or add one:** `createSheet` throws `TypeError` without `content`; `setElements` with `content`/`container` throws `TypeError`; `--snap-sheet-progress` is relative to the topmost *declared* snap (1 at `[0.3, 0.6]`'s 0.6); `data-dragging`/`data-content-mode` are presence attributes; `SheetState.open` flips false when closing starts; handle Enter/Space cycles and **wraps** to the lowest snap; `"header"` = `offsetHeight` (margins excluded); the last `"content"` measurement is retained while at a `scroll: true` snap; `onDragEnd(-1)` fires before `onOpenChange(false)` on a drag dismissal; no `z-index` is ever written.

7. **Fling defeats drag locks** (W1 playground bug 1): `drag.ts onEnd` passes raw `state.vy` to `decideRelease`; with `drag: { down: false }` the panel never moves but a fast downward fling still projects below the lowest snap and closes. Zero `vy` in a locked direction (same rule `onMove` applies to `dy`). Test: `[{ value: 0.3, drag: { down: false } }, 0.9]`, six 20 px downward moves with no delay, release → stays at index 0, still open.
8. **Inner wrapper flex trap** (W1 playground finding): the measured `[data-snap-sheet-inner]` element is a flex item of a panel whose content box is only the visible strip (padding-bottom = y), so it gets shrunk to that strip and a `"content"` snap freezes. Write restorable base styles on the inner element at attach/`setElements`: `flex: 0 0 auto` (and `max-height: 100dvh` / `100%` with a container). Test: inner keeps its natural height when the panel's padding-bottom is large. Remove the workaround CSS from playgrounds/README.md + both playgrounds once done (out-of-scope touch, list it).
9. **Duplicate `"use client"`**: `src/react/index.ts` line 1 and the tsdown banner both emit it → `dist/react/index.js` has two. Keep the banner (reliable), drop the source directive, adjust the SSR test if it checks the source file.
10. **Deferred open when unmeasured**: `open()` with `viewHeight === 0` (hidden iframe, `display:none` host) currently warns and drops. Instead remember `pendingOpen = true` and perform the open on the first `refresh()` that resolves a snap; `close()`/`destroy()` clear it. Test with `window.innerHeight` stubbed to 0 then a resize to 800.

## Done when

```
pnpm typecheck && pnpm test && pnpm lint && pnpm build && pnpm verify:pkg
```

Commits: `fix(core): snapTo while closed, first-open-only skipInitialAnimation, overlay + inner base styles, locked-direction fling, deferred open`, `feat(react)!: SheetHandle.open(); handle open/close route through state`, `build: single use-client directive`.

Note: the docs on v1 already describe this behaviour (task 05b) — until this task lands, `SheetHandle.open()` is the one documented thing that does not exist.
