# Task 13 — review-loop fixes

Worker: W1 (core/spring/gesture/build). React-layer findings are in `tasks/14-review-fixes-react.md` (W2). Branch: `w1/13-review-fixes` off `v1`. Sources: W2's independent core review (verified by probes; items 1 and 3 re-verified by the orchestrator in source), the orchestrator's automated review (section B, appended when complete). Plan sections: §2.2, §3.1, §3.4, §3.6.

> FINAL for section A. Section B may be appended — re-read the file before starting each section.

Rules: fix root causes, not symptoms; every fix ships with the test that would have caught it (see A.14 — the suite is currently unable to see several of these); no API changes beyond what is listed; report per item: fixed / no-change-needed (with reason) / needs-orchestrator (with the question).

## A. Independent core review (W2)

**A.1 CRITICAL — `spring.animating` is false during every frame notification.** `packages/spring/src/index.ts:92` sets `handle = null` at the top of `tick()`, notifies at `:101`, re-schedules at `:102`. Inside every subscriber callback `animating` reads `false`, so `packages/sheet/src/core/sheet.ts:219`'s `maybeFinalize` guard never holds and every open/close is finalised on the first frame: `onAnimationEnd` fires at animation start, `writeRest`/`data-snap-index` land while the panel is still travelling, scroll lock + focus restore release while the sheet is still visible, and React's presence gate (`onAnimationEnd(false)` → unmount) removes the closing sheet after ~1 frame — the close animation is invisible in React. `SheetState.animating` can never be `true`. Fix in the spring: a `running` flag set when a frame is scheduled in `set()`, cleared in the rest branch and `stop()`, returned by the getter; `handle` stays the cancel token. Tests: spring — subscriber sees `animating === true` mid-flight; sheet — after `open()` + one frame, `getState().animating === true` and `onAnimationEnd` not yet called; React — children still mounted one frame after `open` flips false, unmounted after rest.

**A.1b (order + un-masking, from W2):** do A.14(a) — the `settle()` predicate — *before* the spring change: it must fail on today's code (finalised on frame 1) and pass after, which makes it the regression test for A.1. And once `animating` is honest, `onAnimationEnd` becomes load-bearing for React's presence: any path where the spring stops without resting (`spring.stop()` in `destroy()`, a `set()` superseded mid-close) must still finalise the pending transition, or the closing sheet stays mounted forever. Add: close → supersede/stop mid-flight → children still unmount; `destroy()` mid-close → `onAnimationEnd(false)` still fires exactly once (or document that destroy never fires callbacks and make React unmount on destroy independently).

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

## B. Automated review — core, spring, gesture, build (W1)

Verified-by-probe items are marked ✔; others are PLAUSIBLE from source reading — verify in your triage. Items already covered by section A are not repeated.

**B.1 ✔ Drag during a close animation strands the sheet.** `drag.ts:136`: `isOpen` flips false at close start; a pointerdown on the still-visible panel starts a drag whose `onMove` immediate sets cancel the closing spring; on release `snapTo`/`dismiss` are no-ops (`!isOpen`) and nothing finalises `pending: "close"` → panel frozen mid-screen, `data-state="open"`, lock/inert leaked, React never unmounts. Fix: A.12's `isOpen` gate in `onStart` covers new drags; additionally in `onEnd` (and the cancelled branch) when `!isOpen` resume the close (`spring.set(viewHeight)`) so the pending close finalises. Test: `close()`, one frame, pointer drag, release → sheet finishes closing, lock released, `onAnimationEnd(false)` once.

**B.2 ✔ `refresh()` during a pending close jump-cuts the panel.** `sheet.ts:367` treats `!isOpen` as parked and does `spring.set(viewHeight, { immediate: true })` — a header/content measurement or resize landing mid-close teleports the panel to closed instead of letting it slide. Fix: while `pending === "close"` do not retarget (the finaliser handles the end; at most update the target y non-immediately).

**B.3 ✔ Layout: `Sheet.Body` is never a real scroller without consumer CSS, and the inner wrapper overflows the visible strip.** `dom.ts:110` `innerBaseStyles` leaves the inner `display: block` (Body's `flex: 1 1 auto; min-height: 0` is inert inside it — only `playgrounds/react/src/App.css` patches this; docs demos and next playground do not) and caps it at `max-height: 100dvh` while the panel's content box is `viewHeight − y`, so at a `scroll: true` partial snap the bottom `y` px of Body sit below the viewport (AUDIT P0-8 back). Fix (design): inner always `display: flex; flex-direction: column; min-height: 0`; per active snap — scroll → inner `flex: 1 1 auto` (fills the panel content box) + Body `flex: 1 1 auto; min-height: 0; overflow-y: auto`; non-scroll → inner `flex: 0 0 auto` (natural height, measurable) + Body `flex: 0 0 auto; overflow: hidden`. Drop the `100dvh` cap (the content box already bounds it). `"content"` measurement is already paused at scroll snaps. Update `applyBodyScroll` to toggle both elements; remove the workaround CSS from playgrounds (out-of-scope touch, list it). Tests: style assertions per snap; docs `scrollable` demo re-check by W2 afterwards.

**B.4 ✔ `update()` with only `scroll` changed never re-applies Body styles.** `sheet.ts:549` re-snaps only when index/y changed; `applyBodyScroll` runs only from `applyRest`. `[{value:0.5}]` → `[{value:0.5, scroll:true}]`: Body stays `overflow: hidden` while `scrollWins` yields to a scroll that cannot happen → neither scrolls nor drags. Fix: when at rest and the active snap's config changed, run `applyRest(active)`.

**B.5 Overlay must be inert when `!modal`.** `sheet.ts:416` wires and positions the overlay regardless of `modal` (React's `Sheet.Overlay` renders unconditionally) → a non-modal sheet gets an invisible full-viewport click-catcher that dismisses on any outside click; `guide/migration.md` says it "only renders when modal". Fix: controller writes `display: none` (restorable) on the overlay when `!modal`, toggled in `update` and in `setElements({ overlay })`.

**B.6 Lock Body's native scroll during a JS-driven takeover.** `drag.ts:97`: when the drag wins at a `scroll: true` snap (pull-down from top) Body keeps native scrolling; a reversal in the same gesture scrolls the list while the sheet moves (and may `pointercancel`). 0.x locked overflow + touch-action at takeover. Fix: on takeover set Body `overflow: hidden; touch-action: none` for the gesture; `applyRest` restores at the end.

**B.7 Nested sheet without a Portal: the outer sheet captures the pointer.** `drag.ts:58`: both panels' `pointerdown` handlers run (inner first, outer last) and both `setPointerCapture` — the outer's wins, so dragging the inner panel or its overlay drags the outer sheet; `stopPropagation` in `onStart` is too late (threshold-crossing). Fix: drag.ts registers a `pointerdown` listener on `content` (and the overlay) that calls `event.stopPropagation()` before `attachDrag`'s listener; or the filter rejects targets inside another sheet's content/overlay. Test with two controllers, inner content nested in the outer.

**B.8 Drag start during an animation snaps back.** `drag.ts:97` records `startY = spring.get()` but the spring keeps flying until the first `onMove`. Fix: `spring.stop()` (freeze under the finger) in `onStart` before recording `startY`. Test: `snapTo` mid-flight + pointerdown + hold → y stops moving.

**B.9 `destroy()` re-writes the overlay after cleaning it.** `sheet.ts:566` `spring.stop()` notifies after the part restores ran; the still-subscribed frame writer puts `--snap-sheet-progress` back on the overlay. Fix: unsubscribe before `stop()`.

**B.10 Late-wired overlay carries no progress value.** `sheet.ts:416` wirers.overlay never writes the current frame; `{modal && <Sheet.Overlay/>}` toggled on at rest → `opacity: var(--snap-sheet-progress)` resolves to nothing until the next spring notification. Fix: write current `data-state` + progress in the overlay wirer (and `--snap-sheet-y`/progress for content in `setElements` generally).

**B.11 ✔ `process.env.NODE_ENV` guard is folded away in dist.** `env.ts:16`: `dist/sheet-*.js` has no `isProd` branch — `warnOnce` fires in production for every consumer. The published bundle must keep `process.env.NODE_ENV` verbatim so consumers' bundlers fold it. Fix in `tsdown.config.ts` (do not define/replace NODE_ENV; check `platform: "browser"` defaults and `env`/`define` options); add a build check in `scripts/size.mjs` or a new `scripts/check-dist.mjs` that greps dist for `process.env.NODE_ENV` and for the single `"use client"`.

**B.12 Re-entrant `set()` from a subscriber orphans an rAF loop.** `spring/index.ts:117`: with `handle` nulled at the top of `tick`, a `set()` inside a notification schedules a second frame that `tick` then overwrites → two loops, `stop()` cancels one. Fix alongside A.1: never null `handle` before notify (or gate scheduling on the running flag); test: subscriber that calls `set()` → exactly one outstanding frame, `stop()` stops everything.

**B.13 `.d.ts` files reference missing `.d.ts.map`.** `tsdown.config.ts:7` `sourcemap: true` stamps `//# sourceMappingURL=*.d.ts.map` into `dist/*.d.ts` but no declaration maps are emitted. Fix: emit them or disable dts sourcemaps; `publint` did not catch it — add to the dist check script.

**B.14 Static container breaks geometry.** `dom.ts:77` writes `position: absolute` against a consumer container that may be `position: static`, while `viewHeight` is measured from it. Fix: if `getComputedStyle(container).position === "static"`, set `position: relative` (restorable) — plus `warnOnce` in dev.

**B.15 Re-locking to a non-scroll snap keeps Body's `scrollTop`.** `dom.ts:148`: 0.x scrolled to top; now the top of the list is unreachable under `overflow: hidden`. Fix: `body.scrollTop = 0` in the non-scroll branch.

**B.16 Content mode is detected and resolved with two different rules.** `snap.ts isContentMode` (empty OR all-`"content"`) vs `sheet.ts:105 effectivePoints` (only empty). An all-`"content"` array of two config entries reports `contentMode: true` but resolves two indices. Fix: synthesise the single snap for both cases (take the first entry's `scroll`/`drag`), in one place.

**B.17 `snapTo` still finalises via its own `rested` flag.** `sheet.ts:264`: a plain `snapTo` superseded by a `refresh()` re-snap skips `applyRest` for that call; at-rest attributes go stale until the churn stops. Fix: `applyRest(activeSnap)` from the rest path (finaliser / spring-rest notification) regardless of which `set()` resolved.

**B.18 Cleanup (do; each is small):** delete the dead `?? lowest` in `snap.ts:232` (`closest` cannot return undefined past the non-empty guard); a single `dragging` flag (drag returns `isDragging()`, `sheet.ts:60` copy removed); `once()` helper in `env.ts` replacing the five hand-rolled released-once closures; `noop` in `env.ts`; `lockVelocity` computed once in `onEnd`; `applyAria` through `setAttrs` restore semantics (a consumer's own `aria-labelledby` must be restored, not deleted); fold `core/types.ts` into `sheet.ts` (single importer); attach: resolve once after wiring instead of 3–4 times (observers fire synchronously — guard with an `attaching` flag). Skip: `StyleKey` mapped type, spring listener copy, gesture `shift()`, per-tick allocations, chunk-shape change.

**B.19 Docs/process:** `onSnapIndexChange` silent when a release lands on the same snap is intentional — say so in `reference/core.md` (`onDragEnd` fires every time). Fix `docs/internal/tasks/00-scaffold.md` step 8 to match the later graphify policy (historical accuracy).

## C. Sweep (fresh reviewer, gaps only) — W1

**C.1 ✔ `steps()` float error turns the last snap into 1 px.** `snap.ts:71`: `steps(6)` ends in `1.0000000000000002`; `toHeight` (`:109`) takes the `> 1` branch → a 1 px snap becomes the lowest, `topmostY` becomes the 0.8333 snap, drag-down parks a 1 px sliver instead of closing. Fix both ends: `steps()` returns `to` exactly for the last entry (and `from` for the first); `toHeight` rounds the numeric value to 6 decimals before the `<= 1` test. Tests: `steps(6)` / `steps(24)` last === 1 exactly; `toHeight(1.0000000000000002)` === viewHeight.

**C.2 Container mode inner cap feedback loop.** `dom.ts:111` `max-height: 100%` resolves against the panel's content box (already `viewHeight − y`), so once at rest the inner cannot grow → `"content"` never re-measures upward in embedded sheets. Covered by B.3 (drop the cap) — make sure the container branch is tested too.

**C.3 `focusFirst` can pick a non-focusable match.** `dom.ts:201`: `input:not([disabled])` matches `<input type="hidden">` (or a `display: none` button); `.focus()` is a no-op and the `content` fallback never runs → modal opens with focus on `<body>`. Fix: after `.focus()`, if `document.activeElement !== target`, fall back to `content`; exclude `[type="hidden"]` and `[tabindex="-1"]` from the selector. Test with a leading hidden input.

**C.4 `destroy()` leaves `aria-modal` / `aria-labelledby` / `aria-describedby`.** `sheet.ts:580`: `applyAria` writes them outside the `restores` bookkeeping. Fold into B.18's "applyAria through setAttrs" so destroy restores them; test after destroy.

**C.5 Handle click-to-cycle is promised but unimplemented.** `sheet.ts:433` wires keydown only; PLAN §2.3 and `reference/react.md` say click cycles snaps. Fix: `click` → `cycle()` in the handle wirer (ignore clicks that were part of a drag — the gesture threshold already separates taps). Test.

**C.6 `viewHeight === 0` burns valid-point warnings.** `snap.ts:148`: with an unmeasured view every point is "invalid" and `warnOnce` burns the key for the session, hiding a later real warning. Fix: skip warnings entirely when `viewHeight <= 0` (transient state the deferred-open path treats as legitimate).

**C.7 `warnOnce` has no test reset seam.** `env.ts:7`: module-global `warned` set makes every warning assertion order-dependent. Fix: export `resetWarnings()` marked `@internal`, call it from `packages/sheet/vitest.setup.ts` `afterEach`; then the A.10 / A.14(d) warning tests are deterministic.

**C.8** = B.10 (overlay wirer seeds no progress value) — already listed.

## Done when

```
pnpm typecheck && pnpm test && pnpm lint && pnpm build && pnpm verify:pkg && pnpm --filter snap-bottom-sheet size && pnpm docs:build
pnpm --filter playground-react build && pnpm --filter playground-vanilla build && pnpm --filter playground-next build
```

Commits (suggested): `fix(spring): report animating during frame notifications`, `fix(core): transition promises, focus scoping, Escape semantics, body style restore, cancelled-drag callback`, `test(sheet): settle predicate, target-aware ResizeObserver fake, un-vacuous regressions`, `docs: content-inner constraint`, plus one per section-B group.
