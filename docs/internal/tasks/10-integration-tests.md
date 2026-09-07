# Task 10 — integration tests, regression suite, bundle budget

Worker: W3. Branch: `w3/10-integration` off `v1` (after tasks 04 and 07 are merged). Plan sections: §2, §3, §4.2; AUDIT §1 (every P0 must have a regression test that fails on the 0.x behaviour).

> FINAL. Base: v1 @ b828a41 (core controller + React bindings merged; 163 tests). Public API = PLAN §2 as implemented in packages/sheet/src/{index.ts,react/index.ts}. `dist/` now has a shared chunk between the two entries (rolldown code-splitting) — playgrounds must import only the two public entry points.

## Goal

Prove the real controller and the real React layer work together (task 07 tested React against a mock), lock every audit P0 with a named regression test, and add a size budget so the "zero-dependency, small" claim stays true.

## Scope

```
packages/sheet/test/integration/react-real-controller.test.tsx   React parts + real createSheet (no mocks): open → data-state, drag via FakePointerEvent on Content → snap index change reaches onSnapIndexChange and useSheetState; Escape closes; nested sheets; "content" re-measure moves the sheet; controlled veto bounce
packages/sheet/test/integration/vanilla.test.ts                  createSheet on hand-built DOM: same flows without React
packages/sheet/test/regressions/audit-p0.test.ts                 one `it("P0-1 …")` per AUDIT P0-1 … P0-8 with the audit's repro numbers
packages/sheet/test/helpers/*                                    shared: pointer events, rAF/ResizeObserver/matchMedia stubs, `settle()` (advance timers until spring rests)
packages/sheet/scripts/size.mjs                                   builds, gzips dist/index.js and dist/react/index.js, fails if over budget
packages/sheet/package.json                                      script `size`: `node scripts/size.mjs`; budgets as constants in the script (set them 20 % above the measured value and print both)
.github/workflows/ci.yml                                         `pnpm --filter snap-bottom-sheet size` after build
```

## Rules

- Tests use the public entry points only (`../../src/index.ts`, `../../src/react/index.ts`), never internal modules — they must survive refactors.
- Deterministic: fake timers everywhere; no `setTimeout` sleeps; `settle()` helper loops `advanceTimersByTime(16)` until `getState().animating` is false (cap 5 s of virtual time).
- Every regression test's name carries the audit id and a one-line summary of the 0.x failure.
- Do not modify `src/**` — bugs → report with the failing test left in place but `.todo`-marked with the audit/bug reference, so the fix task can un-skip it.

## Done when

```
pnpm test                                  # all packages green, no .only
pnpm --filter snap-bottom-sheet size       # prints sizes, exits 0
pnpm lint
```

Commit: `test(sheet): end-to-end controller + react integration, audit regressions, size budget`.

## Report

Worker report template + the measured gzip sizes + list of any `.todo` tests (= real bugs found) with repro.
