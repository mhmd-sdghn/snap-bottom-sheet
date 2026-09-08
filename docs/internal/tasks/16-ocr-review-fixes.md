# Task 16 — OpenCodeReview (delegation mode) fixes

Source: `ocr delegate preview --from 58d0cc2 --to main` (290 reviewable files) + `ocr delegate rule` checklist (correctness, security, performance, maintainability, test coverage), applied by six reviewers over build/CI, docs code, playgrounds, tests, core, React. Only High/Medium findings are listed. Fix root causes; every behavioural fix ships with a test; keep the public API unchanged; write any docs text in the plain, polite style (short sentences, simple words).


## Build / CI / config
- HIGH package.json:9 `packageManager: pnpm@10.6.1` predates npm OIDC trusted publishing; changesets spawns `pnpm publish`. Fix: bump to pnpm ≥ 10.13 (nBridge uses 11.10.0; if 11 → `allowBuilds` spelling), regenerate lockfile; delete release.yml `npm install -g npm@latest` step (unpinned global install in a write+id-token job, and never used).
- MED release.yml:39 actions referenced by mutable tags in a job with contents/pull-requests/id-token write → pin `uses:` to commit SHAs (+ `# vX.Y.Z`), add .github/dependabot.yml (github-actions ecosystem). Apply to ci.yml/docs.yml too.
- MED ci.yml:12 no `permissions:` block → add `permissions: contents: read`.
- MED docs.yml:4 docs only built on push to main → add `pnpm docs:build` step to ci.yml after `pnpm build`.
- MED scripts/check-dist.mjs:50 NODE_ENV gate is a substring search (a comment satisfies it) → regex `/process\.env(\?)?\.NODE_ENV\s*===\s*["']production["']/`.
- MED scripts/size.mjs:35 shared-chunk budget uses `.find` (first non-entry chunk) → `.filter` all non-entry `.js`, budget each / fail on chunk-count change.
- MED scripts/check-dist.mjs:68 add gates: no `@snap-bottom-sheet/` import in dist scripts+declarations; packages/sheet/package.json has no `dependencies`.
## Playgrounds
- none
## Test suite (11)
- HIGH test/react/ssr.test.tsx:19 SSR test vacuous (Portal returns null so no part renders) → add renderToString of every part OUTSIDE a Portal; expect data-snap-sheet-inner present, no data-state.
- HIGH test/core/guarantees.test.ts:243 ArrowUp/ArrowDown never dispatched; stepFrom clamp + preventDefault uncovered → add arrows test on [0.3,0.6,0.9] (step, clamp both ends, defaultPrevented true for handled key, false for Tab).
- MED test/react/sheet.test.tsx:199 no StrictMode test → one controller created/destroyed net under <StrictMode>, live nodes held; mirror in integration with real controller.
- MED test/core/warn.test.ts:10 only not.toThrow → assert console.warn called; add NODE_ENV=production silence test.
- MED test/core/snap.test.ts:186 steps toBeCloseTo precision 2 → 10.
- MED test/core/snap.test.ts:199 steps edge cases: steps(1) → [1]; steps(1,{from:0.3,to:0.9}) → [0.3]; steps(2.9) length 2; NaN/Infinity → [].
- MED test/core/sheet.test.ts:525 setElements never exercised for body/handle → test 12d add/remove handle+body (aria-label, overflow-y auto, click cycles, Enter cycles; restore on null).
- MED gesture/test/drag.test.ts:209 lostpointercapture never dispatched → mid-drag → cancelled end; after normal pointerup → no extra end.
- MED test/regressions/review-lifecycle.test.ts:411 click-after-drag window (300ms) not asserted → advance 301ms, click cycles.
- MED test/core/guarantees.test.ts:120 second copy of test harness with weaker RO fake → use helpers/env.ts (installTestEnv…); move `press` into shared helper.
- MED packages/*/vitest.config.ts:8 `unstubGlobals: true` in all three configs; drop redundant afterEach unstubs (keep warn.test.ts finally).
## Docs site code (5, all Medium)
- MED demos/*.tsx:5 `#region demo` starts below imports → published snippets lack imports but carry the `{ frame }` harness prop. Move region to line 1 (imports inside), put `mountDemo` import + default export below `#endregion`; make the container explicit inside the region with a one-line comment (or read frame from a module-level let set by mountDemo).
- MED docs/package.json:6 docs never typechecked (root typecheck filters packages/* only) → add `"typecheck": "tsc --noEmit"` to docs and include `--filter snap-bottom-sheet-docs` in root typecheck.
- MED docs/demos/*.md + 5 guides: `<ClientOnly>` around ReactDemo drops the 520px frame from SSR HTML → layout shift; ReactDemo only touches DOM in onMounted → remove ClientOnly wrappers.
- MED docs/guide/scrolling.md:160 warning forbids `overflow` on Sheet.Content but engine writes overflow only on Body; styling.md starter sets `overflow: hidden` on .sheet (fine) → narrow the scrolling.md warning to Body overflow + touch-action on Content/Body.
- MED demos/nested.tsx:30 HTML entities `&lt;Sheet&gt;` inside the region → literal in snippet → use `{"<Sheet>"}`.
## React layer (5)
- HIGH react/Sheet.tsx:141 immediate close (reducedMotion) + self-dismissal: onAnimationEnd(false) clears `closing` in the same batch as onOpenChange(false) BEFORE the render-phase adjust sets it → closing turned back on and never cleared → panel stays mounted forever, destroy never called (probed, controlled+uncontrolled). Fix: open-sync effect releases the gate: `if (getState().open === open) { if (!open && closing && !getState().animating) setClosing(false); return; }` + `closing` in deps. Test with reducedMotion + overlay click/Escape/drag-dismiss.
- MED react/use-sheet-state.ts:81 selector memo keyed on source only → changed selector closure with unchanged state renders stale value → key memo on `{source, selector}`.
- MED react/Title.tsx:15 (+Description) explicit `id={undefined}` wins over generated id → no id, no accessible name → destructure `{ id, ...rest }`, `id={id ?? titleId}`.
- MED react/Title.tsx:15 consumer id changing after mount leaves aria-labelledby stale → part owns sync: layout effect `controllerRef.current?.update({ labelledBy: resolvedId })` on [resolvedId, controllerVersion]; same for Description.
- MED react/Sheet.tsx:314 `await ref.close()` before any controller exists (defaultOpen, mount effect) hangs → when no controller, also drain the agreed direction; add controllerVersion to deps.
## Core (6)
- HIGH core/sheet.ts:362 `guard.engage()` (inert on siblings) runs BEFORE `guard.captureFocus()`; real browsers blur the trigger when its subtree becomes inert, so the remembered element is <body> and focus is never returned. Fix: capture focus before engaging in `open()` and in `update()`'s modal false→true branch. Test with a spec-accurate inert fake (setter that blurs a focused descendant).
- HIGH core/sheet.ts:390 cancelling a deferred open in `closeWith` nulls `deferredOpen` and settles waiters but leaves `pending === "open"` → next spring notification finalises a phantom open (onAnimationEnd(true) on a closed sheet, data-snap-index/padding written while closed; React `closing` never cleared). Fix: `pending = null; settlePending("open")` with the deferral, and settle the close direction (fire onAnimationEnd(false) or have React clear `closing` when close() resolves without animation — coordinate with React HIGH item above).
- MED core/sheet.ts:127 `defaultSnapIndex` stored unclamped → `snapIndex` can name a missing snap for life; ArrowUp then jumps down. Fix: at attach clamp via the computed `initial` (+ warnOnce).
- MED core/sheet.ts:321 re-entrant `snapTo` from inside `onSnapIndexChange` is overwritten by the outer call's stale target → generation counter (`snapSeq`) checked after the callback and after the await.
- MED core/dom.ts:215 doc comments left behind by the rename `applyBodyScroll` → `applySnapLayout` (wrong function, wrong count; dead name also in sheet.ts:505) → fix comments.
- MED core/dom.ts:314 `findContentInner` silently falls back to `content` (100dvh) when the panel has ≠1 children and no `[data-snap-sheet-inner]` → a "content" snap measures the viewport. Fix: `warnOnce` in that fallback pointing at the attribute.

## Done when

```
pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm verify:pkg && pnpm --filter snap-bottom-sheet check:dist && pnpm --filter snap-bottom-sheet size && pnpm docs:build && pnpm --filter playground-vanilla build && pnpm --filter playground-react build && pnpm --filter playground-next build
```
