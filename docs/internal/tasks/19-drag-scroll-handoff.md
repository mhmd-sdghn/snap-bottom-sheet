# Task 19 — continuous drag ↔ scroll handoff (library-driven touch scrolling)

Owner requirement (verbatim intent): with scrollable content, the user drags the sheet up and, the moment the sheet reaches a snap that allows scrolling, the SAME finger movement continues as content scrolling — no lift. In the other direction, the user scrolls the content down to its top and, without lifting, the sheet starts dragging down. Today both need a new touch, and inside a scrollable Body a drag never starts at all (only the handle drags). The smoothness of these transitions is the most important UX property of the library.

Decisions (final):
1. Touch scrolling inside `Sheet.Body` at a `scroll: true` snap is driven by the library (JS), not the browser. Wheel, keyboard and scrollbar stay native.
2. Scrolling engages at ANY snap with `scroll: true`: while the finger is inside Body and moving up, the sheet stops at the first `scroll: true` snap it reaches and the rest of the movement scrolls the content — even if higher snaps exist. Higher snaps are reached by dragging on non-Body regions (handle/header) or from a non-scroll region. When Body cannot scroll (content shorter than Body) the drag continues to higher snaps as before.
3. Fling momentum on the content decelerates iOS-like and STOPS at `scrollTop === 0` (and at the bottom). The sheet moves only while the finger is down.
4. A Playwright e2e suite (headless Chromium, emulated touch via CDP) locks the behaviour in CI.

## Behaviour

Layout (`dom.ts applySnapLayout`): at a `scroll: true` snap Body gets `overflow-y: auto` (keeps wheel/keyboard/scrollbar native), `touch-action: pan-x` (vertical touch is ours; nested horizontal carousels keep native panning), `overscroll-behavior: contain`. Non-scroll snaps unchanged (`overflow: hidden`). Panel stays `touch-action: none`. Delete `suspendBodyScroll` / the B.6 takeover freeze and `scrollWins()` — the arbiter below replaces them; the gesture never calls `state.cancel()` for scroll reasons any more.

Arbiter (`drag.ts`, per `onMove`, using the INCREMENTAL delta `d = clientY - lastClientY`, not the absolute `dy`):
- Determine `inBody`: the pointerdown target is inside `body` (fixed for the gesture). `canScroll(dir)`: `body.scrollHeight - body.clientHeight > 1` and, for finger-up (`d < 0`) `scrollTop < max`, for finger-down (`d > 0`) `scrollTop > 0`.
- Mode `sheet` (start mode): move the sheet by `d` with the existing locks/clamps. Ceiling rule: if `inBody`, the sheet may not move above the nearest `scroll: true` snap at or above its current y (call it `scrollCeiling`): when the move would cross it, clamp y to `scrollCeiling.y`, and if `canScroll(up)` switch to mode `scroll` with the remainder. If `!inBody` there is no ceiling.
- Mode `scroll`: `body.scrollTop -= d` (finger up → content up). If `d > 0` and the new scrollTop would go below 0: set 0, switch to mode `sheet`, apply the remainder to the sheet (it moves down from the snap). If `d < 0` at max scroll: stay (no overscroll).
- Velocity per mode from the last ~100 ms of samples (gesture already provides `vy`; track scroll velocity likewise).
- Release: mode `sheet` → existing `decideRelease` + spring (locks, dismissal, fling projection unchanged). Mode `scroll` → momentum: rAF loop `scrollTop += v·dt; v *= exp(-dt / 325)`, stop when `|v| < 0.02 px/ms` or when hitting 0 / max (clamp, no bounce); cancelled by the next pointerdown, a snap change, `close()`, `destroy()`, or `reducedMotion` (then no momentum at all). Put it in `core/scroll-momentum.ts` (~30 lines, no deps).
- `data-snap-sheet-no-drag` regions: unchanged (no drag, no JS scroll).
- `SheetState`: unchanged. `data-dragging` is set while the pointer is down and the sheet is in mode `sheet`; add `data-scrolling` (presence) while in mode `scroll` so styling can react. Document both.
- Mouse: identical routing (a mouse drag inside Body scrolls the content past the ceiling) — fine.

Update PLAN §3.2 and §3.4 (rule 2 is replaced by the arbiter), CLAUDE.md's `drag.ts` row, and the docs: `guide/scrolling.md` (the whole "scroll vs drag" section: describe the two handoffs and momentum, plain English, short sentences), `guide/gestures.md`, `reference/core.md` (`body` row, `scroll` option), `reference/styling-hooks.md` (`data-scrolling`), the migration guide if it mentions the old rule. Remove the "pull down from the very top" wording that no longer describes a limitation.

## Unit tests (jsdom, existing helpers; stub `scrollHeight`/`clientHeight` with defineProperty, `scrollTop` is writable in jsdom)
Snaps `["header", { value: 0.5, scroll: true }, 1]`, view 1000, Body scrollHeight 3000 / clientHeight 400:
1. From index 0, pointer down in Body, move up 600 px in 20-px steps: sheet stops at index 1's y; from the crossing frame on, `scrollTop` increases by the remainder; one pointer sequence; `data-scrolling` present while scrolling, `data-dragging` before.
2. At index 1 with `scrollTop = 300`, move down 500 px in steps: `scrollTop` reaches 0, then the sheet's y increases by the remainder within the same sequence; release → `decideRelease` runs on the sheet.
3. Pointer down on the handle (outside Body) at index 1, move up → sheet goes to index 2 (no ceiling).
4. Content shorter than Body (scrollHeight === clientHeight) → drag continues to index 2 even from Body.
5. Fling in scroll mode: release with `vy` → momentum loop increases scrollTop over frames, decelerates, stops; a downward fling from `scrollTop = 100` stops exactly at 0 and the sheet does not move.
6. `reducedMotion: true` → no momentum after release.
7. `drag: { down: false }` on the active scroll snap: scroll-to-top then finger down does NOT move the sheet.
8. Pointerdown during momentum cancels it.

## Playwright e2e (new)
- Root `e2e/` package `snap-bottom-sheet-e2e` (private): `@playwright/test`, `playwright.config.ts` with `webServer` = `pnpm --filter playground-react preview --port 4173 --strictPort` (after `pnpm build` + playground build), project chromium with `devices["Pixel 7"]` (touch, mobile viewport). Helper `touchDrag(page, points, { stepMs })` implemented with CDP `Input.dispatchTouchEvent` (touchStart/touchMove/touchEnd) so a multi-point single-touch gesture is real.
- Add a playground scenario that matches the unit fixture (`["header", { value: 0.5, scroll: true }, 1]`, 100 rows) if none exists; expose stable `data-testid`s.
- Tests: (a) drag up inside Body from index 0 → sheet at index 1 and `scrollTop > 0` at release, single touch; (b) scroll to 300, drag down → `scrollTop === 0` and sheet y increased, single touch; (c) fast upward swipe → scrollTop keeps increasing after touchEnd, then stops; downward swipe from 100 → stops at 0, sheet y unchanged; (d) drag on the handle from index 1 → index 2. Read state via `document.querySelector('[role=dialog]').dataset` and `getComputedStyle` / `--snap-sheet-y`.
- CI: new job `e2e` in `.github/workflows/ci.yml` after `verify`: `pnpm exec playwright install --with-deps chromium`, `pnpm build`, `pnpm --filter playground-react build`, `pnpm e2e`. Root script `"e2e": "pnpm --filter snap-bottom-sheet-e2e test"`. Add `e2e` to `.changeset/config.json` ignore. Keep runtime under ~3 minutes.

## Done when
```
pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm verify:pkg && pnpm --filter snap-bottom-sheet check:dist && pnpm --filter snap-bottom-sheet size && pnpm docs:build && pnpm --filter playground-vanilla build && pnpm --filter playground-react build && pnpm --filter playground-next build && pnpm e2e
```
Plus: record a short before/after description of what you observed in the e2e traces (scrollTop and y per phase).

Commits: `feat(core)!: continuous drag-to-scroll handoff with library-driven content scrolling`, `test(e2e): playwright touch gestures for the handoff`, `docs: scrolling and gestures guides for the handoff`. Add a changeset (`minor` is not right — the package is unreleased 1.0; edit `.changeset/spotty-pandas-rewrite.md` to add a bullet under "New" in plain English).
