# Task 14 — review-loop fixes, React layer

Worker: W2. Branch: `w2/14-review-fixes-react` off `v1`. Scope: `packages/sheet/src/react/**` and `packages/sheet/test/react/**` only (W1 owns core/spring/gesture/build in task 13 — do not touch them; if a React fix needs a core change, message the orchestrator). Sources: automated review angles A/E/D + W2's own analysis. ✔ = verified by probe.

**14.1 ✔ The controlled-veto detector misfires on every controlled dismissal.** `Sheet.tsx:202` reads `latest.current.open === true` inside `onOpenChange(false)` — at callback time the parent's `setOpen(false)` has not rendered yet, so an *agreeing* parent is misread as a veto: `data-state` goes open → closed → open → closed (the bounce re-runs `ensureEscape`, `setDataState(true)`, retargets the spring) before the next commit's effect closes again. Only the never-agrees parent is tested. Fix: no synchronous bounce. In `onOpenChange(false)` bump a `controllerClosedVersion` state; the open-sync effect (deps `[open, controllerVersion, controllerClosedVersion]`) runs after the parent's render and compares the `open` prop with `controller.getState().open` — bounce only if the parent kept `open === true`. Tests: agreeing parent → `data-state` exactly `["open","closed"]`; stubborn parent → re-opens once.

**14.2 ✔ Controlled `activeSnapIndex` diverges permanently after a drag or handle key.** `Sheet.tsx:262`: the snap-sync effect keys on `[snapIndex, controllerVersion]`; in controlled mode `setSnapIndex` is a no-op so nothing re-runs — controller at 1, prop at 0, forever. Fix: same mechanism as 14.1 — bump a version in the `onSnapIndexChange` handler; the effect re-asserts `snapTo(prop)` when the parent did not adopt the change. Test: controlled index 0, drag to 1, parent ignores → back to 0 after the commit; parent adopts → stays.

**14.3 ✔ `useSheetState` keeps serving a dead controller's snapshot.** `use-sheet-state.ts:38`: the create-effect cleanup destroys the controller without bumping `controllerVersion`, so `subscribe` never re-runs and the cached snapshot (`open: true, y: 500`) persists. Fix: bump the version (or reset the cache to `CLOSED_STATE`) in the cleanup. Test from the finding: `<Sheet open><Probe/>{show && <Sheet.Portal>…}</Sheet>`, flip `show` → Probe reports closed state.

**14.4 A consumer-supplied `id` on `Sheet.Title`/`Sheet.Description` dangles `aria-labelledby`.** `Title.tsx:15` (`Description.tsx:15`): `{...props}` spread after `id={titleId}` → consumer id wins, controller still points at the generated id → unlabelled dialog. Fix: honour the consumer id AND register it: pass the rendered id through context (`register("title", el)` already exists — read `el.id`), so `labelledBy` is whatever id is actually in the DOM. Test: `<Sheet.Title id="x">` → `aria-labelledby="x"`.

**14.5 `useSheetState(selector?)`.** Every consumer re-renders ~20–30×/transition even when reading only `open`. Add an optional `selector: (s: SheetState) => T` with `Object.is` equality (`useSyncExternalStore` with selector semantics — keep it tiny, no `useSyncExternalStoreWithSelector` dependency). Backwards compatible. Test: a component selecting `open` renders once per open/close.

**14.6 Docs follow-through (after task 13 lands):** re-check `reference/react.md` / `guide/controlled-state.md` against the honest `animating` / `onAnimationEnd`; note that a non-modal sheet renders no active overlay (task 13 B.5); remove the `modal={false}` caveats that no longer apply; re-smoke the `scrollable` and `nested` demos once B.3 (layout) is merged.

## Done when

```
pnpm typecheck && pnpm test && pnpm lint && pnpm build && pnpm docs:build
```

Commits: `fix(react): controlled veto/bounce via post-commit check, controlled snap index re-assert, fresh state after controller teardown, consumer ids for Title/Description`, `feat(react): useSheetState selector`, `docs: …`.
