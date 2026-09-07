# Task 13 — review-loop fixes

Worker: W1. Branch: `w1/13-review-fixes` off `v1`. Sources: W2's independent core review (verified by probes; items 1 and 3 re-verified by the orchestrator in source), the orchestrator's automated review (section B, appended when complete). Plan sections: §2.2, §3.1, §3.4, §3.6.

> FINAL for section A. Section B may be appended — re-read the file before starting each section.

Rules: fix root causes, not symptoms; every fix ships with the test that would have caught it (see A.14 — the suite is currently unable to see several of these); no API changes beyond what is listed; report per item: fixed / no-change-needed (with reason) / needs-orchestrator (with the question).

## A. Independent core review (W2)

**A.1 CRITICAL — `spring.animating` is false during every frame notification.** `packages/spring/src/index.ts:92` sets `handle = null` at the top of `tick()`, notifies at `:101`, re-schedules at `:102`. Inside every subscriber callback `animating` reads `false`, so `packages/sheet/src/core/sheet.ts:219`'s `maybeFinalize` guard never holds and every open/close is finalised on the first frame: `onAnimationEnd` fires at animation start, `writeRest`/`data-snap-index` land while the panel is still travelling, scroll lock + focus restore release while the sheet is still visible, and React's presence gate (`onAnimationEnd(false)` → unmount) removes the closing sheet after ~1 frame — the close animation is invisible in React. `SheetState.animating` can never be `true`. Fix in the spring: a `running` flag set when a frame is scheduled in `set()`, cleared in the rest branch and `stop()`, returned by the getter; `handle` stays the cancel token. Tests: spring — subscriber sees `animating === true` mid-flight; sheet — after `open()` + one frame, `getState().animating === true` and `onAnimationEnd` not yet called; React — children still mounted one frame after `open` flips false, unmounted after rest.

**A.2 HIGH — deferred `open()` promise hangs.** `sheet.ts:294`: the `deferredOpen` closure holds the caller's `resolve`; `closeWith` (`:326`) nulls `deferredOpen` and `destroy()` never touches it, and neither drains it via `pendingResolvers`. `innerHeight = 0` → `open()` → `close()` (or `destroy()`) → resize → the promise never settles; React's `handle.open()` deferred list inherits the hang. Fix: register the resolver in `pendingResolvers` (or resolve it when cancelling). Test: both cancellation paths resolve the promise.

**A.3 HIGH — non-modal sheets steal focus.** `sheet.ts:314` calls `guard.captureFocus()` unconditionally; `maybeFinalize`'s close path calls `restoreFocus()` unconditionally. PLAN §3.6 scopes focus management to `modal`. Fix: gate both on `modal()` (leave `destroy()` unconditional). Test: `modal: false` open leaves `document.activeElement` untouched.

**A.4 MEDIUM — `close()` resolves on a reopen.** `sheet.ts:69` one `pendingResolvers` list for both directions. open → settle → `close()` → one frame → `open()` → settle: the `close()` promise resolves with `open === true`. Fix: `openResolvers` / `closeResolvers`; settle the matching list on completion and the superseded list when a transition is replaced (nothing hangs). Test as described.

**A.5 MEDIUM — `destroy()` leaves inline styles on Body.** `sheet.ts:406-408` restores only `bodyBaseStyles()` (`minHeight`, `overscrollBehavior`); `applyBodyScroll` (`dom.ts:140`) writes `overflow`/`overflowY`/`flex` outside that bookkeeping. Fix: route `applyBodyScroll` through the restore mechanism (record the previous values once, restore in the body unwire) — also covers `setElements({ body: null })`. Test: after `destroy()` the body's inline style equals its pre-attach value.

**A.6 MEDIUM — Escape falls through past a non-dismissible modal sheet.** A `dismissible: false` modal sheet never enters the Escape stack, so `stack.at(-1)` is the sheet behind it and Escape closes the outer sheet under an inner one. Fix: every open modal sheet joins the stack; the handler is a no-op when the top entry is not dismissible (a modal swallows Escape). Test: outer dismissible + inner non-dismissible → Escape closes nothing.

**A.7 MEDIUM — cancelled drag fires `onDragStart` without `onDragEnd`.** `drag.ts:120` returns before `deps.onDragEnd` in the `state.cancelled` branch. Fix: `deps.onDragEnd?.(deps.snapIndex())`. Test with a `pointercancel`.

**A.8 MEDIUM — Escape ignores `event.defaultPrevented`.** `keyboard.ts:17`. Fix: `if (event.defaultPrevented) return;` first. Test: a child handler calling `preventDefault()` keeps the sheet open.

**A.9 LOW — `"content"` measurement target captured once.** `sheet.ts:504` `findContentInner(content)` is observed for the controller's lifetime; a vanilla consumer replacing the inner wrapper leaves a detached node observed. Fix (lazy, honest): document the constraint next to the `data-snap-sheet-inner` contract in `reference/core.md` and `guide/vanilla.md`; optionally re-run `findContentInner` in `setElements` when `content.children` changed.

**A.10 LOW — `"header"` with no header element silently resolves to 50 % forever.** `snap.ts:132-148` applies the placeholder before the validity warning. Fix: `warnOnce` in dev when a `"header"`/`"content"` placeholder is used with a measured height of 0 ("did you render Sheet.Header?"). Keep the placeholder behaviour.

**A.11 LOW — `update({ modal })` transitions are asymmetric on focus.** `sheet.ts:532`: false→true engages without `captureFocus()`, true→false disengages without `restoreFocus()`, and `focusCaptured` stays set. Fix: pair them as open/close do.

**A.12 LOW — dragging is not gated on `isOpen`.** `drag.ts` `onStart`: add `if (!deps.isOpen()) return;` (new `DragDeps.isOpen`). Test: pointer sequence on a closed panel changes nothing.

**A.13 LOW — deletions.** `keyboard.ts:18` `event.stopPropagation()` after dispatch does nothing on a `document` listener (the comment above explains why) — delete. `scroll-lock.ts:76` `isBodyScrollLocked()` has no `src` callers — mark `/** @internal test seam */`. `measure.ts` never `disconnect()`s the shared observer when the map empties — either disconnect and null it, or add a one-line comment saying it is kept deliberately.

**A.14 TEST SUITE — make the suite able to see the above.** (a) `test/helpers/env.ts:81` `settle()` without a predicate is a 3–5 s burn; give it a default predicate (`!controller.getState().animating` when a controller is passed, else "spring rested") and make it throw on timeout in every call site; remove the inline copies in `sheet.test.ts:87` and `guarantees.test.ts:86`. (b) The fake `ResizeObserver` fires every callback regardless of target and `unobserve`/`disconnect` are no-ops — make it target-aware so "unobserved on teardown" can fail. (c) `test/regressions/audit-p0.test.ts:289` (P0-7) is vacuous (`const typeCheck = null; expect(typeCheck).toBeNull()`) — assert the exported symbols/types exist via `import * as core` + `import * as react` and a type-level `satisfies`. (d) `sheet.test.ts:870` "still warns" never asserts the warning — spy on `console.warn`. (e) `spring.test.ts:105` — add the mid-flight `animating === true` assertion.

## B. Automated review (orchestrator) — appended when complete

_(pending)_

## Done when

```
pnpm typecheck && pnpm test && pnpm lint && pnpm build && pnpm verify:pkg && pnpm --filter snap-bottom-sheet size && pnpm docs:build
pnpm --filter playground-react build && pnpm --filter playground-vanilla build && pnpm --filter playground-next build
```

Commits (suggested): `fix(spring): report animating during frame notifications`, `fix(core): transition promises, focus scoping, Escape semantics, body style restore, cancelled-drag callback`, `test(sheet): settle predicate, target-aware ResizeObserver fake, un-vacuous regressions`, `docs: content-inner constraint`, plus one per section-B group.
