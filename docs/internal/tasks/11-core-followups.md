# Task 11 — core/react follow-ups surfaced by the docs pass

Worker: W1. Branch: `w1/11-core-followups` off `v1` (after task 08). Plan sections: §2.2, §2.3. Source: W2's API questions while writing the docs (task 05) — each item below is a decision now recorded in PLAN; implement it in code.

> FINAL.

## Changes

1. **`snapTo()` while closed** must not move the panel (today it animates behind `data-state="closed"`). When `!isOpen`: update `snapIndex` (+ `notify`, + `onSnapIndexChange` when it changed and not content mode) and return resolved; the position is applied by the next `open()`. Test.
2. **`skipInitialAnimation`** applies to the **first** `open()` of a controller instance only; later opens animate. Test: second open on the same controller animates (spring `animating` true for ≥ 1 frame).
3. **Overlay base styles**: at attach (and in `setElements({ overlay })`), write restorable base styles on the overlay like the panel: `position: fixed` (or `absolute` with a container), `inset: 0`. Leave `pointer-events`, color and `z-index` to the consumer. Test: styles present after attach, restored on `destroy()`.
4. **`SheetHandle.open()`** in the React layer: `open(): Promise<void>` — sets the controllable `open` state to true (so an uncontrolled sheet mounts its children and creates the controller) and resolves when the controller reports `onAnimationEnd(true)` (or immediately if already open). `close()` stays. Test with the fake controller.
5. **Types**: `onDragEnd?(targetIndex: number): void` everywhere (PLAN said `number | -1`, which is just `number`); JSDoc: `-1` = closing. `SheetProps.onDragEnd` too.
6. **Docs-facing guarantees now in PLAN §2.2 — verify each has a test or add one:** `createSheet` throws `TypeError` without `content`; `setElements` with `content`/`container` throws `TypeError`; `--snap-sheet-progress` is relative to the topmost *declared* snap (1 at `[0.3, 0.6]`'s 0.6); `data-dragging`/`data-content-mode` are presence attributes; `SheetState.open` flips false when closing starts; handle Enter/Space cycles and **wraps** to the lowest snap; `"header"` = `offsetHeight` (margins excluded); the last `"content"` measurement is retained while at a `scroll: true` snap; `onDragEnd(-1)` fires before `onOpenChange(false)` on a drag dismissal; no `z-index` is ever written.

## Done when

```
pnpm typecheck && pnpm test && pnpm lint && pnpm build && pnpm verify:pkg
```

Commits: `fix(core): snapTo while closed, first-open-only skipInitialAnimation, overlay base styles`, `feat(react): SheetHandle.open()`.
